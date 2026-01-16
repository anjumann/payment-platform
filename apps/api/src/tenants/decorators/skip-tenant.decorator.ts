import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for skipping tenant check
 */
export const SKIP_TENANT_KEY = 'skipTenant';

/**
 * @SkipTenant Decorator
 * 
 * Use this decorator on routes that should work without tenant context.
 * Examples: health checks, public info endpoints, admin operations.
 * 
 * Usage:
 * ```typescript
 * @Controller('health')
 * export class HealthController {
 *   @SkipTenant()
 *   @Get()
 *   check() {
 *     return { status: 'ok' };
 *   }
 * }
 * ```
 */
export const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true);
