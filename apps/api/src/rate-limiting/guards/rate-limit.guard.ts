import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { RateLimiterService } from '../rate-limiter.service';
import { TenantContextService } from '../../tenants/tenant-context.service';
import { UsageTrackerService } from '../../usage/usage-tracker.service';
import { SKIP_RATE_LIMIT_KEY } from '../decorators/skip-rate-limit.decorator';

/**
 * RateLimitGuard
 * 
 * Enforces per-tenant API rate limits.
 * Returns standard rate limit headers on every response.
 * 
 * Response Headers:
 * - X-RateLimit-Limit: Maximum requests per window
 * - X-RateLimit-Remaining: Requests remaining in window
 * - X-RateLimit-Reset: Unix timestamp when limit resets
 * - Retry-After: Seconds to wait (only when limited)
 * 
 * Usage:
 * Apply globally or per-controller:
 * ```typescript
 * @UseGuards(RateLimitGuard)
 * @Controller('api')
 * export class ApiController { ... }
 * ```
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: RateLimiterService,
    private readonly tenantContext: TenantContextService,
    private readonly usageTracker: UsageTrackerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if rate limiting is skipped for this route
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(
      SKIP_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipRateLimit) {
      return true;
    }

    // Skip if no tenant context (handled by TenantGuard)
    if (!this.tenantContext.hasTenantContext()) {
      return true;
    }

    const response = context.switchToHttp().getResponse<Response>();

    // Single global bucket per tenant: 60/min applies to all API routes.
    // (Per-endpoint buckets meant the dashboard's "API Rate Limit" from
    // /api/tenants/current never reflected /api/usage/summary or /api/payments.)
    const endpoint = 'global';

    // Check rate limit
    const result = await this.rateLimiter.checkAndConsume(endpoint);

    // Always set rate limit headers
    response.setHeader('X-RateLimit-Limit', result.limit);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', result.resetAt);

    if (!result.allowed) {
      // Rate limit exceeded
      response.setHeader('Retry-After', result.retryAfter || 60);
      
      this.logger.warn(
        `Rate limit exceeded for tenant: ${this.tenantContext.getTenantId()}`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Track API call for monthly usage (fire-and-forget; do not block on tracking errors)
    this.usageTracker.trackApiCall().catch((err) => {
      this.logger.warn(`Usage trackApiCall failed: ${err?.message || err}`);
    });

    return true;
  }
}
