import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { Model, UpdateQuery, QueryOptions, PipelineStage, Types, Document } from 'mongoose';

// Type alias for filter queries - mongoose 8.x compatible
type FilterQuery<T> = Record<string, any>;
import { TenantContextService } from '../../tenants/tenant-context.service';
import { BaseTenantDocument } from '../schemas/base-tenant.schema';

/**
 * Find options for tenant-aware queries
 */
export interface TenantFindOptions<T> {
  filter?: FilterQuery<T>;
  projection?: any;
  options?: QueryOptions;
  includeDeleted?: boolean;
}

/**
 * TenantAwareRepository
 * 
 * Base repository that automatically enforces tenant isolation.
 * All database operations are filtered by the current tenant's ID.
 * 
 * Security Features:
 * 1. Auto-inject tenantId on all writes
 * 2. Auto-filter by tenantId on all reads
 * 3. Block attempts to override tenantId in filters
 * 4. Protect aggregation pipelines with $lookup
 * 5. Soft delete support with automatic filtering
 * 
 * Developer Experience:
 * ```typescript
 * // Developer writes:           // System executes:
 * repository.find({              repository.find({
 *   status: 'active'               tenantId: 'current-tenant',
 * })                               status: 'active',
 *                                  deletedAt: null
 *                                })
 * ```
 * 
 * Usage:
 * ```typescript
 * @Injectable()
 * export class PaymentRepository extends TenantAwareRepository<Payment> {
 *   constructor(
 *     @InjectModel(Payment.name) model: Model<Payment>,
 *     contextService: TenantContextService,
 *   ) {
 *     super(model, contextService);
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class TenantAwareRepository<T extends BaseTenantDocument> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly model: Model<T>,
    protected readonly contextService: TenantContextService,
  ) {}

  /**
   * Get current tenant ID from context
   * Throws if no tenant context is available
   */
  protected getTenantId(): Types.ObjectId {
    const tenantId = this.contextService.getTenantId();
    return new Types.ObjectId(tenantId);
  }

  /**
   * Inject tenant ID and deletion filter into query
   * @param filter Original filter
   * @param includeDeleted Whether to include soft-deleted documents
   */
  protected injectTenantFilter(
    filter: FilterQuery<T> = {},
    includeDeleted = false,
  ): FilterQuery<T> {
    // Security check: Prevent tenantId override attempts
    if ('tenantId' in filter) {
      const filterTenantId = filter.tenantId?.toString();
      const currentTenantId = this.getTenantId().toString();
      
      if (filterTenantId && filterTenantId !== currentTenantId) {
        this.logger.error(
          `Blocked cross-tenant query attempt! Requested: ${filterTenantId}, Current: ${currentTenantId}`,
        );
        throw new ForbiddenException('Cross-tenant data access denied');
      }
    }

    const tenantFilter: FilterQuery<T> = {
      ...filter,
      tenantId: this.getTenantId(),
    } as FilterQuery<T>;

    // Add soft delete filter unless explicitly including deleted
    if (!includeDeleted) {
      (tenantFilter as any).deletedAt = null;
    }

    return tenantFilter;
  }

  /**
   * Inject tenant ID into document data for creation
   */
  protected injectTenantId(data: Partial<T>): Partial<T> {
    return {
      ...data,
      tenantId: this.getTenantId(),
    };
  }

  // ==================== CRUD Operations ====================

  /**
   * Create a new document
   * Automatically injects tenantId
   */
  async create(data: Partial<T>): Promise<T> {
    const tenantData = this.injectTenantId(data);
    const document = new this.model(tenantData);
    return document.save() as unknown as Promise<T>;
  }

  /**
   * Create multiple documents
   */
  async createMany(dataArray: Partial<T>[]): Promise<T[]> {
    const tenantDataArray = dataArray.map((data) => this.injectTenantId(data));
    return this.model.insertMany(tenantDataArray) as unknown as Promise<T[]>;
  }

  /**
   * Find one document
   */
  async findOne(options: TenantFindOptions<T> = {}): Promise<T | null> {
    const filter = this.injectTenantFilter(options.filter, options.includeDeleted);
    return this.model
      .findOne(filter, options.projection, options.options)
      .exec();
  }

  /**
   * Find document by ID
   */
  async findById(id: string | Types.ObjectId, includeDeleted = false): Promise<T | null> {
    const filter = this.injectTenantFilter({ _id: id } as FilterQuery<T>, includeDeleted);
    return this.model.findOne(filter).exec();
  }

  /**
   * Find multiple documents
   */
  async find(options: TenantFindOptions<T> = {}): Promise<T[]> {
    const filter = this.injectTenantFilter(options.filter, options.includeDeleted);
    return this.model
      .find(filter, options.projection, options.options)
      .exec();
  }

  /**
   * Find with pagination
   */
  async findPaginated(
    options: TenantFindOptions<T> & {
      page?: number;
      limit?: number;
      sort?: Record<string, 1 | -1>;
    } = {},
  ): Promise<{ data: T[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const filter = this.injectTenantFilter(options.filter, options.includeDeleted);

    const [data, total] = await Promise.all([
      this.model
        .find(filter, options.projection)
        .sort(options.sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Count documents
   */
  async count(filter: FilterQuery<T> = {}, includeDeleted = false): Promise<number> {
    const tenantFilter = this.injectTenantFilter(filter, includeDeleted);
    return this.model.countDocuments(tenantFilter);
  }

  /**
   * Update one document
   */
  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions,
  ): Promise<T | null> {
    const tenantFilter = this.injectTenantFilter(filter);
    // Prevent updating tenantId
    if (update.$set?.tenantId || update.tenantId) {
      delete (update.$set as any)?.tenantId;
      delete (update as any).tenantId;
    }
    return this.model
      .findOneAndUpdate(tenantFilter, update, { new: true, ...options })
      .exec();
  }

  /**
   * Update by ID
   */
  async updateById(
    id: string | Types.ObjectId,
    update: UpdateQuery<T>,
    options?: QueryOptions,
  ): Promise<T | null> {
    return this.updateOne({ _id: id } as FilterQuery<T>, update, options);
  }

  /**
   * Update many documents
   */
  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    const tenantFilter = this.injectTenantFilter(filter);
    const result = await this.model.updateMany(tenantFilter, update);
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  // ==================== Soft Delete Operations ====================

  /**
   * Soft delete a document (sets deletedAt)
   */
  async softDelete(id: string | Types.ObjectId, deletedBy?: string): Promise<T | null> {
    const update: UpdateQuery<T> = {
      $set: {
        deletedAt: new Date(),
        ...(deletedBy && { deletedBy: new Types.ObjectId(deletedBy) }),
      },
    } as UpdateQuery<T>;

    return this.updateById(id, update);
  }

  /**
   * Soft delete many documents
   */
  async softDeleteMany(
    filter: FilterQuery<T>,
    deletedBy?: string,
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    const update: UpdateQuery<T> = {
      $set: {
        deletedAt: new Date(),
        ...(deletedBy && { deletedBy: new Types.ObjectId(deletedBy) }),
      },
    } as UpdateQuery<T>;

    return this.updateMany(filter, update);
  }

  /**
   * Restore a soft-deleted document
   */
  async restore(id: string | Types.ObjectId): Promise<T | null> {
    const filter = this.injectTenantFilter({ _id: id } as FilterQuery<T>, true);
    return this.model
      .findOneAndUpdate(
        filter,
        { $set: { deletedAt: null, deletedBy: null } },
        { new: true },
      )
      .exec();
  }

  /**
   * Find deleted documents only
   */
  async findDeleted(options: TenantFindOptions<T> = {}): Promise<T[]> {
    const filter = this.injectTenantFilter(options.filter, true);
    (filter as any).deletedAt = { $ne: null };
    return this.model.find(filter, options.projection, options.options).exec();
  }

  // ==================== Hard Delete Operations ====================

  /**
   * Permanently delete a document
   * Use with caution - for admin operations only
   */
  async hardDelete(id: string | Types.ObjectId): Promise<boolean> {
    const filter = this.injectTenantFilter({ _id: id } as FilterQuery<T>, true);
    const result = await this.model.deleteOne(filter);
    return result.deletedCount > 0;
  }

  /**
   * Permanently delete many documents
   * Use with caution - for admin operations only
   */
  async hardDeleteMany(filter: FilterQuery<T>): Promise<number> {
    const tenantFilter = this.injectTenantFilter(filter, true);
    const result = await this.model.deleteMany(tenantFilter);
    return result.deletedCount;
  }

  // ==================== Aggregation Operations ====================

  /**
   * Run aggregation pipeline with tenant isolation
   * Automatically adds $match for tenantId at the beginning
   * Protects $lookup operations
   */
  async aggregate<R = any>(pipeline: PipelineStage[]): Promise<R[]> {
    const protectedPipeline = this.protectAggregatePipeline(pipeline);
    return this.model.aggregate<R>(protectedPipeline).exec();
  }

  /**
   * Protect aggregation pipeline
   * 1. Add tenant filter as first stage
   * 2. Inject tenant filter into $lookup operations
   */
  protected protectAggregatePipeline(pipeline: PipelineStage[]): PipelineStage[] {
    const tenantId = this.getTenantId();

    // Add tenant filter as first stage
    const tenantMatch: PipelineStage.Match = {
      $match: {
        tenantId: tenantId,
        deletedAt: null,
      },
    };

    // Protect $lookup operations: add tenantId filter to pipeline lookups
    const protectedPipeline = pipeline.map((stage): PipelineStage => {
      if ('$lookup' in stage) {
        const lookup = stage.$lookup;
        
        // If lookup has pipeline, inject tenant filter
        if (lookup.pipeline) {
          return {
            $lookup: {
              ...lookup,
              pipeline: [
                { $match: { tenantId: tenantId, deletedAt: null } },
                ...lookup.pipeline,
              ],
            },
          };
        }
        
        // For simple lookups, we can't inject filter directly
        // Log warning for audit
        this.logger.warn(
          `Simple $lookup to ${lookup.from} without pipeline. Consider using pipeline for tenant safety.`,
        );
      }
      return stage;
    });

    return [tenantMatch, ...protectedPipeline];
  }

  /**
   * Check if a document exists
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const tenantFilter = this.injectTenantFilter(filter);
    const doc = await this.model.findOne(tenantFilter).select('_id').lean();
    return doc !== null;
  }
}
