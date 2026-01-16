import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for bypassing tenant isolation
 */
export const BYPASS_TENANT_KEY = 'bypassTenantIsolation';

/**
 * @BypassTenantIsolation Decorator
 * 
 * Use this decorator on methods that need to access data across tenants.
 * This should ONLY be used for:
 * - Super admin operations
 * - System-level analytics
 * - Maintenance tasks
 * 
 * Security Requirements:
 * - Must be combined with role guards (e.g., @Roles('SUPER_ADMIN'))
 * - All operations should be logged for audit
 * - Use sparingly and with explicit justification
 * 
 * Usage:
 * ```typescript
 * @Roles('SUPER_ADMIN')
 * @BypassTenantIsolation()
 * @Get('global-analytics')
 * async getGlobalAnalytics() {
 *   // This can access all tenants' data
 * }
 * ```
 */
export const BypassTenantIsolation = () => SetMetadata(BYPASS_TENANT_KEY, true);
