import { Module } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { TenantModule } from '../tenants/tenant.module';
import { UsageModule } from '../usage/usage.module';

/**
 * RateLimitingModule
 *
 * Provides tenant-aware rate limiting functionality.
 *
 * Features:
 * - Sliding window algorithm for precise limiting
 * - Per-tenant limits based on tier
 * - Standard rate limit headers
 * - Atomic Redis operations with Lua scripts
 */
@Module({
  imports: [TenantModule, UsageModule],
  providers: [RateLimiterService, RateLimitGuard],
  exports: [RateLimiterService, RateLimitGuard],
})
export class RateLimitingModule {}
