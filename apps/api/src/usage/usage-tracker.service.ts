import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { config } from '../config';
import { TenantContextService } from '../tenants/tenant-context.service';

/**
 * Usage Summary for a period
 */
export interface UsageSummary {
  tenantId: string;
  period: string; // YYYY-MM format
  usage: {
    apiCalls: number;
    transactions: number;
    storageBytes: number;
    bandwidthBytes: number;
  };
  limits: {
    maxTransactionsPerMonth: number;
    transactionPercentUsed: number;
  };
}

/**
 * UsageTrackerService
 * 
 * Tracks tenant resource consumption for billing and limit enforcement.
 * 
 * Redis Structure:
 * Hash Key: usage:{tenantId}:2024-01
 * ├── api_calls: 15234
 * ├── transactions: 892
 * ├── storage_bytes: 104857600
 * └── bandwidth_bytes: 52428800
 * 
 * TTL: 90 days (for billing reconciliation)
 * 
 * Month Boundary Handling:
 * - Uses UTC consistently
 * - New month = new Redis key
 * - Old data retained for 90 days
 */
@Injectable()
export class UsageTrackerService {
  private readonly logger = new Logger(UsageTrackerService.name);
  private readonly redis: Redis;
  private readonly RETENTION_DAYS = 90;

  constructor(private readonly tenantContext: TenantContextService) {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      lazyConnect: true,
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    this.redis.connect().catch((err) => {
      this.logger.warn('Redis connection failed:', err.message);
    });
  }

  /**
   * Get the current usage period key (YYYY-MM)
   */
  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get Redis key for a tenant's usage in a period
   */
  private getUsageKey(tenantId: string, period: string): string {
    return `usage:${tenantId}:${period}`;
  }

  /**
   * Increment a usage metric
   * @param metric The metric to increment
   * @param amount Amount to increment (default: 1)
   */
  async increment(
    metric: 'api_calls' | 'transactions' | 'storage_bytes' | 'bandwidth_bytes',
    amount = 1,
  ): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();
    const period = this.getCurrentPeriod();
    const key = this.getUsageKey(tenantId, period);

    try {
      await this.redis
        .pipeline()
        .hincrby(key, metric, amount)
        .expire(key, this.RETENTION_DAYS * 24 * 60 * 60)
        .exec();
    } catch (error) {
      this.logger.error(`Failed to increment usage: ${error.message}`);
    }
  }

  /**
   * Track an API call
   */
  async trackApiCall(): Promise<void> {
    await this.increment('api_calls');
  }

  /**
   * Track a transaction
   */
  async trackTransaction(): Promise<void> {
    await this.increment('transactions');
  }

  /**
   * Track storage usage
   * @param bytes Number of bytes stored
   */
  async trackStorage(bytes: number): Promise<void> {
    await this.increment('storage_bytes', bytes);
  }

  /**
   * Track bandwidth usage
   * @param bytes Number of bytes transferred
   */
  async trackBandwidth(bytes: number): Promise<void> {
    await this.increment('bandwidth_bytes', bytes);
  }

  /**
   * Get usage summary for current tenant
   * @param period Optional period (defaults to current month)
   */
  async getSummary(period?: string): Promise<UsageSummary> {
    const tenant = this.tenantContext.getTenant();
    const tenantId = tenant._id.toString();
    const usagePeriod = period || this.getCurrentPeriod();
    const key = this.getUsageKey(tenantId, usagePeriod);

    try {
      const usage = await this.redis.hgetall(key);
      const limits = tenant.getEffectiveLimits();

      const apiCalls = parseInt(usage.api_calls || '0', 10);
      const transactions = parseInt(usage.transactions || '0', 10);
      const storageBytes = parseInt(usage.storage_bytes || '0', 10);
      const bandwidthBytes = parseInt(usage.bandwidth_bytes || '0', 10);

      const transactionPercentUsed = limits.maxTransactionsPerMonth === Infinity
        ? 0
        : (transactions / limits.maxTransactionsPerMonth) * 100;

      return {
        tenantId,
        period: usagePeriod,
        usage: {
          apiCalls,
          transactions,
          storageBytes,
          bandwidthBytes,
        },
        limits: {
          maxTransactionsPerMonth: limits.maxTransactionsPerMonth,
          transactionPercentUsed: Math.round(transactionPercentUsed * 100) / 100,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get usage summary: ${error.message}`);
      
      // Return empty usage on error
      return {
        tenantId,
        period: usagePeriod,
        usage: {
          apiCalls: 0,
          transactions: 0,
          storageBytes: 0,
          bandwidthBytes: 0,
        },
        limits: {
          maxTransactionsPerMonth: tenant.getEffectiveLimits().maxTransactionsPerMonth,
          transactionPercentUsed: 0,
        },
      };
    }
  }

  /**
   * Get usage history for multiple periods
   * @param months Number of months to retrieve (default: 12)
   */
  async getHistory(months = 12): Promise<UsageSummary[]> {
    const tenant = this.tenantContext.getTenant();
    const tenantId = tenant._id.toString();
    const limits = tenant.getEffectiveLimits();
    const history: UsageSummary[] = [];

    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
      const period = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      const key = this.getUsageKey(tenantId, period);

      try {
        const usage = await this.redis.hgetall(key);
        
        if (Object.keys(usage).length > 0) {
          const transactions = parseInt(usage.transactions || '0', 10);
          const transactionPercentUsed = limits.maxTransactionsPerMonth === Infinity
            ? 0
            : (transactions / limits.maxTransactionsPerMonth) * 100;

          history.push({
            tenantId,
            period,
            usage: {
              apiCalls: parseInt(usage.api_calls || '0', 10),
              transactions,
              storageBytes: parseInt(usage.storage_bytes || '0', 10),
              bandwidthBytes: parseInt(usage.bandwidth_bytes || '0', 10),
            },
            limits: {
              maxTransactionsPerMonth: limits.maxTransactionsPerMonth,
              transactionPercentUsed: Math.round(transactionPercentUsed * 100) / 100,
            },
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to get usage for period ${period}: ${error.message}`);
      }
    }

    return history;
  }

  /**
   * Check if tenant has exceeded transaction limit
   */
  async hasExceededTransactionLimit(): Promise<boolean> {
    const summary = await this.getSummary();
    const limits = this.tenantContext.getTenant().getEffectiveLimits();
    
    if (limits.maxTransactionsPerMonth === Infinity) {
      return false;
    }

    return summary.usage.transactions >= limits.maxTransactionsPerMonth;
  }

  /**
   * Admin: Get usage for any tenant (bypasses context)
   */
  async getUsageForTenant(tenantId: string, period?: string): Promise<{
    period: string;
    apiCalls: number;
    transactions: number;
    storageBytes: number;
    bandwidthBytes: number;
  }> {
    const usagePeriod = period || this.getCurrentPeriod();
    const key = this.getUsageKey(tenantId, usagePeriod);

    try {
      const usage = await this.redis.hgetall(key);
      return {
        period: usagePeriod,
        apiCalls: parseInt(usage.api_calls || '0', 10),
        transactions: parseInt(usage.transactions || '0', 10),
        storageBytes: parseInt(usage.storage_bytes || '0', 10),
        bandwidthBytes: parseInt(usage.bandwidth_bytes || '0', 10),
      };
    } catch (error) {
      this.logger.error(`Failed to get tenant usage: ${error.message}`);
      return {
        period: usagePeriod,
        apiCalls: 0,
        transactions: 0,
        storageBytes: 0,
        bandwidthBytes: 0,
      };
    }
  }
}
