import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { config } from '../config';
import { TenantContextService } from '../tenants/tenant-context.service';

/**
 * Rate Limit Check Result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp
  retryAfter?: number; // Seconds until next allowed request
}

/**
 * RateLimiterService
 * 
 * Implements distributed rate limiting using Redis.
 * Uses the Sliding Window Log algorithm for precise rate limiting.
 * 
 * Why Sliding Window Log?
 * ✓ Fair to all requests
 * ✓ No boundary issues between windows
 * ✓ Precise rate limiting
 * ✓ Works well with Redis Sorted Sets
 * 
 * How it works:
 * 1. Store each request timestamp in a Redis Sorted Set
 * 2. Remove timestamps older than the window
 * 3. Count remaining timestamps
 * 4. If count < limit, allow request and add timestamp
 * 
 * Redis Data Structure:
 * Key: rate_limit:{tenantId}:{endpoint}
 * Value: Sorted Set of timestamps (score = timestamp, member = unique id)
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly redis: Redis;
  private readonly WINDOW_MS = config.rateLimiting.windowMs; // 1 minute default

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
   * Check and consume rate limit
   * Returns whether the request is allowed and rate limit info
   * 
   * @param endpoint Optional endpoint identifier for granular limiting
   */
  async checkAndConsume(endpoint = 'global'): Promise<RateLimitResult> {
    const tenant = this.tenantContext.getTenant();
    const limit = tenant.getEffectiveLimits().apiRateLimit;
    const key = `rate_limit:${tenant._id}:${endpoint}`;
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;

    try {
      // Use Lua script for atomic operation
      const result = await this.redis.eval(
        this.getLuaScript(),
        1,
        key,
        now.toString(),
        windowStart.toString(),
        limit.toString(),
        this.WINDOW_MS.toString(),
        `${now}-${Math.random().toString(36).substring(7)}`, // Unique member
      ) as [number, number, number];

      const [allowed, count, resetAt] = result;
      const remaining = Math.max(0, limit - count);

      return {
        allowed: allowed === 1,
        limit,
        remaining,
        resetAt: Math.ceil(resetAt / 1000), // Convert to seconds
        retryAfter: allowed === 0 ? Math.ceil((resetAt - now) / 1000) : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Rate limit check failed (failing open; limits NOT enforced): ${error.message}. ` +
          `Ensure Redis is running at ${config.redis.host}:${config.redis.port}.`,
      );
      // Fail open: allow request if Redis is down (rate limits will not be enforced)
      return {
        allowed: true,
        limit,
        remaining: limit,
        resetAt: Math.ceil((now + this.WINDOW_MS) / 1000),
      };
    }
  }

  /**
   * Get current rate limit status without consuming
   */
  async getStatus(endpoint = 'global'): Promise<RateLimitResult> {
    const tenant = this.tenantContext.getTenant();
    const limit = tenant.getEffectiveLimits().apiRateLimit;
    const key = `rate_limit:${tenant._id}:${endpoint}`;
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;

    try {
      // Remove old entries
      await this.redis.zremrangebyscore(key, 0, windowStart);
      
      // Count current entries
      const count = await this.redis.zcard(key);
      const remaining = Math.max(0, limit - count);

      // Get oldest entry for reset time
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldest.length > 1 
        ? parseInt(oldest[1]) + this.WINDOW_MS 
        : now + this.WINDOW_MS;

      return {
        allowed: count < limit,
        limit,
        remaining,
        resetAt: Math.ceil(resetAt / 1000),
      };
    } catch (error) {
      this.logger.error(`Rate limit status check failed: ${error.message}`);
      return {
        allowed: true,
        limit,
        remaining: limit,
        resetAt: Math.ceil((now + this.WINDOW_MS) / 1000),
      };
    }
  }

  /**
   * Reset rate limit for a tenant (admin operation)
   */
  async reset(tenantId: string, endpoint = 'global'): Promise<void> {
    const key = `rate_limit:${tenantId}:${endpoint}`;
    await this.redis.del(key);
    this.logger.log(`Rate limit reset for tenant: ${tenantId}, endpoint: ${endpoint}`);
  }

  /**
   * Lua script for atomic rate limit check and consume
   * 
   * KEYS[1] = rate limit key
   * ARGV[1] = current timestamp
   * ARGV[2] = window start timestamp
   * ARGV[3] = rate limit
   * ARGV[4] = window duration (for TTL)
   * ARGV[5] = unique member for this request
   * 
   * Returns: [allowed (0 or 1), count, reset timestamp]
   */
  private getLuaScript(): string {
    return `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window_start = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local window_ms = tonumber(ARGV[4])
      local member = ARGV[5]

      -- Remove expired entries
      redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

      -- Get current count
      local count = redis.call('ZCARD', key)

      -- Calculate reset time
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local reset_at = now + window_ms
      if #oldest >= 2 then
        reset_at = tonumber(oldest[2]) + window_ms
      end

      -- Check if under limit
      if count < limit then
        -- Add new entry
        redis.call('ZADD', key, now, member)
        -- Set TTL for cleanup
        redis.call('PEXPIRE', key, window_ms * 2)
        return {1, count + 1, reset_at}
      else
        return {0, count, reset_at}
      end
    `;
  }
}
