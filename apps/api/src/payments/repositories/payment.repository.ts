import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

// Type alias for filter queries
type FilterQuery<T> = Record<string, any>;
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContextService } from '../../tenants/tenant-context.service';
import { Payment, PaymentStatus } from '../schemas/payment.schema';

/**
 * PaymentRepository
 * 
 * Tenant-aware repository for Payment entities.
 * Inherits all CRUD operations with automatic tenant isolation.
 * 
 * All methods automatically:
 * - Inject tenantId on creates
 * - Filter by tenantId on reads
 * - Block cross-tenant access attempts
 * - Handle soft deletes
 */
@Injectable()
export class PaymentRepository extends TenantAwareRepository<Payment> {
  constructor(
    @InjectModel(Payment.name) model: Model<Payment>,
    contextService: TenantContextService,
  ) {
    super(model, contextService);
  }

  /**
   * Find payment by reference number
   * Reference is unique per tenant
   */
  async findByReference(reference: string): Promise<Payment | null> {
    return this.findOne({ filter: { reference } as FilterQuery<Payment> });
  }

  /**
   * Find payments by status
   */
  async findByStatus(status: PaymentStatus): Promise<Payment[]> {
    return this.find({ filter: { status } as FilterQuery<Payment> });
  }

  /**
   * Get payment statistics for the current tenant
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    completed: number;
    failed: number;
    totalAmount: number;
  }> {
    const result = await this.aggregate<{
      _id: PaymentStatus;
      count: number;
      amount: number;
    }>([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
    ]);

    const stats = {
      total: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      totalAmount: 0,
    };

    for (const item of result) {
      stats.total += item.count;
      stats.totalAmount += item.amount;
      
      switch (item._id) {
        case PaymentStatus.PENDING:
        case PaymentStatus.PROCESSING:
          stats.pending += item.count;
          break;
        case PaymentStatus.COMPLETED:
          stats.completed += item.count;
          break;
        case PaymentStatus.FAILED:
          stats.failed += item.count;
          break;
      }
    }

    return stats;
  }

  /**
   * Get monthly transaction count for usage tracking
   */
  async getMonthlyTransactionCount(year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return this.count({
      status: { $in: [PaymentStatus.COMPLETED, PaymentStatus.PROCESSING] },
      createdAt: { $gte: startDate, $lte: endDate },
    } as FilterQuery<Payment>);
  }
}
