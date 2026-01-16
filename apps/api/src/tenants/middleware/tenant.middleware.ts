import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService, TenantContext } from '../tenant-context.service';
import { TenantResolverService } from '../tenant-resolver.service';

/**
 * TenantMiddleware
 * 
 * Automatically resolves tenant for every incoming request and
 * establishes the tenant context for the request duration.
 * 
 * Request Lifecycle:
 * ┌──────────┐     ┌────────────────┐     ┌──────────────┐     ┌────────────┐
 * │ Request  │ →   │ Tenant         │ →   │ Auth Guard   │ →   │ Controller │
 * │ Arrives  │     │ Middleware     │     │ (Optional)   │     │ Handler    │
 * └──────────┘     └────────────────┘     └──────────────┘     └────────────┘
 *                         ↓
 *                  Resolve tenant
 *                  Set in context
 * 
 * This middleware does NOT reject requests without tenant context.
 * That responsibility falls to TenantGuard for routes that require it.
 * This allows some routes (like health checks) to work without tenant.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly contextService: TenantContextService,
    private readonly resolverService: TenantResolverService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Resolve tenant from request
      const result = await this.resolverService.resolve(req);

      if (result) {
        // Create tenant context
        const context: TenantContext = {
          tenant: result.tenant,
          resolvedVia: result.resolvedVia,
          resolvedAt: new Date(),
        };

        // Run the rest of the request within tenant context
        this.contextService.run(context, () => {
          // Attach tenant info to request for convenience
          (req as any).tenant = result.tenant;
          (req as any).tenantId = result.tenant._id.toString();
          
          this.logger.debug(
            `Request for tenant: ${result.tenant.slug} (via ${result.resolvedVia})`,
          );
          
          next();
        });
      } else {
        // No tenant resolved, but continue (TenantGuard will handle if needed)
        this.logger.debug('No tenant resolved for request');
        next();
      }
    } catch (error) {
      this.logger.error(`Tenant resolution error: ${error.message}`, error.stack);
      next(error);
    }
  }
}
