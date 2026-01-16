import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Tenant } from './schemas/tenant.schema';
import { CreateTenantDto, UpdateTenantDto, TenantResponseDto } from './dto/tenant.dto';
import { TenantResolverService } from './tenant-resolver.service';
import { TIER_CONFIGS } from './constants/tier-config';

/**
 * TenantService
 * 
 * Handles tenant CRUD operations and management.
 * This is the primary service for tenant administration.
 */
@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    private readonly resolverService: TenantResolverService,
  ) {}

  /**
   * Create a new tenant
   */
  async create(createDto: CreateTenantDto): Promise<TenantResponseDto> {
    // Check if slug is unique
    const existing = await this.tenantModel.findOne({ slug: createDto.slug });
    if (existing) {
      throw new ConflictException(`Tenant with slug '${createDto.slug}' already exists`);
    }

    // Check if any domain is already in use
    if (createDto.domains?.length) {
      const domainConflict = await this.tenantModel.findOne({
        domains: { $in: createDto.domains },
      });
      if (domainConflict) {
        throw new ConflictException('One or more domains are already in use');
      }
    }

    // Create tenant with generated API key
    const tenant = new this.tenantModel({
      ...createDto,
      apiKey: this.generateApiKey(),
    });

    await tenant.save();
    this.logger.log(`Created tenant: ${tenant.slug}`);

    return this.toResponseDto(tenant);
  }

  /**
   * Find tenant by ID
   */
  async findById(id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantModel.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }
    return this.toResponseDto(tenant);
  }

  /**
   * Find tenant by slug
   */
  async findBySlug(slug: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantModel.findOne({ slug });
    if (!tenant) {
      throw new NotFoundException(`Tenant with slug '${slug}' not found`);
    }
    return this.toResponseDto(tenant);
  }

  /**
   * List all tenants (admin operation)
   */
  async findAll(options?: {
    limit?: number;
    offset?: number;
    isActive?: boolean;
  }): Promise<{ data: TenantResponseDto[]; total: number }> {
    const query: any = {};
    if (options?.isActive !== undefined) {
      query.isActive = options.isActive;
    }

    const [tenants, total] = await Promise.all([
      this.tenantModel
        .find(query)
        .skip(options?.offset || 0)
        .limit(options?.limit || 50)
        .sort({ createdAt: -1 })
        .exec(),
      this.tenantModel.countDocuments(query),
    ]);

    return {
      data: tenants.map((t) => this.toResponseDto(t)),
      total,
    };
  }

  /**
   * Update a tenant
   */
  async update(id: string, updateDto: UpdateTenantDto): Promise<TenantResponseDto> {
    const tenant = await this.tenantModel.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }

    // Check domain uniqueness if domains are being updated
    if (updateDto.domains?.length) {
      const domainConflict = await this.tenantModel.findOne({
        _id: { $ne: id },
        domains: { $in: updateDto.domains },
      });
      if (domainConflict) {
        throw new ConflictException('One or more domains are already in use');
      }
    }

    // Update fields
    Object.assign(tenant, updateDto);
    await tenant.save();

    // Invalidate cache
    await this.resolverService.invalidateTenantCache(tenant);

    this.logger.log(`Updated tenant: ${tenant.slug}`);
    return this.toResponseDto(tenant);
  }

  /**
   * Regenerate API key for a tenant
   */
  async regenerateApiKey(id: string): Promise<{ apiKey: string }> {
    const tenant = await this.tenantModel.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }

    // Invalidate old cache entry
    await this.resolverService.invalidateTenantCache(tenant);

    // Generate new key
    tenant.apiKey = this.generateApiKey();
    await tenant.save();

    this.logger.log(`Regenerated API key for tenant: ${tenant.slug}`);
    return { apiKey: tenant.apiKey };
  }

  /**
   * Deactivate a tenant (soft delete)
   */
  async deactivate(id: string): Promise<void> {
    const tenant = await this.tenantModel.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }

    tenant.isActive = false;
    await tenant.save();

    // Invalidate cache
    await this.resolverService.invalidateTenantCache(tenant);

    this.logger.log(`Deactivated tenant: ${tenant.slug}`);
  }

  /**
   * Reactivate a tenant
   */
  async reactivate(id: string): Promise<void> {
    const tenant = await this.tenantModel.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }

    tenant.isActive = true;
    await tenant.save();

    this.logger.log(`Reactivated tenant: ${tenant.slug}`);
  }

  /**
   * Generate unique API key
   */
  private generateApiKey(): string {
    return `pat_${uuidv4().replace(/-/g, '')}`;
  }

  /**
   * Convert Tenant document to response DTO
   */
  private toResponseDto(tenant: Tenant): TenantResponseDto {
    const tierConfig = TIER_CONFIGS[tenant.tier];
    const effectiveLimits = tenant.getEffectiveLimits();

    return {
      id: tenant._id.toString(),
      slug: tenant.slug,
      name: tenant.name,
      tier: tenant.tier,
      domains: tenant.domains,
      settings: tenant.settings,
      isActive: tenant.isActive,
      limits: effectiveLimits,
      features: tierConfig.features,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
}
