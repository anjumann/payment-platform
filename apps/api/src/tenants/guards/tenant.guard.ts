import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../tenant-context.service';
import { SKIP_TENANT_KEY } from '../decorators/skip-tenant.decorator';

/**
 * TenantGuard
 * 
 * Enforces that a valid tenant context exists for protected routes.
 * Routes without @SkipTenant() decorator will fail if no tenant is resolved.
 * 
 * Usage:
 * ```typescript
 * // Global guard (recommended)
 * app.useGlobalGuards(new TenantGuard(reflector, contextService));
 * 
 * // Skip tenant check for specific routes
 * @SkipTenant()
 * @Get('health')
 * healthCheck() { ... }
 * ```
 * 
 * Why 404 instead of 401/403?
 * - 404 is more appropriate as "tenant not found"
 * - Doesn't reveal authentication requirements
 * - Standard practice in multi-tenant systems
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly contextService: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked to skip tenant check
    const skipTenant = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTenant) {
      return true;
    }

    // Check if tenant context exists
    if (!this.contextService.hasTenantContext()) {
      this.logger.warn('Request rejected: No tenant context');
      throw new NotFoundException('Tenant not found');
    }

    // Tenant exists and is active (verified during resolution)
    return true;
  }
}
