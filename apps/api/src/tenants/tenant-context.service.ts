import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { Tenant } from './schemas/tenant.schema';

/**
 * Tenant Context - Data stored for the current request
 */
export interface TenantContext {
  tenant: Tenant;
  resolvedVia: 'jwt' | 'header' | 'subdomain' | 'domain';
  resolvedAt: Date;
}

/**
 * TenantContextService
 * 
 * Provides request-scoped tenant context using AsyncLocalStorage.
 * 
 * Why AsyncLocalStorage?
 * - No need to pass tenant through every function call
 * - Truly request-isolated (no leakage between requests)
 * - Works with async/await without issues
 * - Better than REQUEST scope providers (more predictable)
 * 
 * Usage:
 * ```typescript
 * // Set context (done by middleware)
 * tenantContextService.setContext({ tenant, resolvedVia: 'subdomain' });
 * 
 * // Get context anywhere in the request
 * const tenant = tenantContextService.getTenant();
 * ```
 * 
 * Security Considerations:
 * - Context is automatically cleared when request ends
 * - Each async continuation has its own context
 * - Cannot be polluted by other requests
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  /**
   * Run a callback with tenant context
   * Used by middleware to establish tenant context for the request
   */
  run<T>(context: TenantContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  /**
   * Set tenant context for the current async context
   * This is called by the tenant middleware after resolution
   */
  setContext(context: TenantContext): void {
    const store = this.storage.getStore();
    if (store) {
      // If we're already in a context, update it
      Object.assign(store, context);
    }
    // If no store exists, the context should be set via run()
  }

  /**
   * Get the full tenant context
   * Returns undefined if no tenant context is set
   */
  getContext(): TenantContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Get the current tenant
   * Throws error if no tenant context is available
   */
  getTenant(): Tenant {
    const context = this.getContext();
    if (!context) {
      throw new Error(
        'No tenant context available. Ensure TenantMiddleware is applied.',
      );
    }
    return context.tenant;
  }

  /**
   * Get the current tenant ID
   * Convenience method for common use case
   */
  getTenantId(): string {
    return this.getTenant()._id.toString();
  }

  /**
   * Get how the tenant was resolved
   * Useful for audit logging
   */
  getResolutionMethod(): TenantContext['resolvedVia'] | undefined {
    return this.getContext()?.resolvedVia;
  }

  /**
   * Check if tenant context is available
   * Use this to check before accessing tenant in optional scenarios
   */
  hasTenantContext(): boolean {
    return !!this.storage.getStore();
  }

  /**
   * Get tenant or undefined (non-throwing version)
   * Use when tenant context is optional
   */
  getTenantOrUndefined(): Tenant | undefined {
    return this.getContext()?.tenant;
  }
}
