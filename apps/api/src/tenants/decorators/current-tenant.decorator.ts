import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Tenant } from '../schemas/tenant.schema';

/**
 * @CurrentTenant Decorator
 * 
 * Parameter decorator to inject the current tenant into controller methods.
 * This provides a convenient way to access tenant in controllers.
 * 
 * Usage:
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentTenant() tenant: Tenant) {
 *   return { tenantName: tenant.name };
 * }
 * ```
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Tenant | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);

/**
 * @TenantId Decorator
 * 
 * Parameter decorator to inject just the tenant ID.
 * Useful when you only need the ID for queries.
 * 
 * Usage:
 * ```typescript
 * @Get('payments')
 * getPayments(@TenantId() tenantId: string) {
 *   return this.paymentService.findByTenant(tenantId);
 * }
 * ```
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId;
  },
);
