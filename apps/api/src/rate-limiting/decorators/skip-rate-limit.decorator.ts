import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for skipping rate limiting
 */
export const SKIP_RATE_LIMIT_KEY = 'skipRateLimit';

/**
 * @SkipRateLimit Decorator
 * 
 * Use this decorator on routes that should not be rate limited.
 * Examples: health checks, internal endpoints.
 * 
 * Usage:
 * ```typescript
 * @SkipRateLimit()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);
