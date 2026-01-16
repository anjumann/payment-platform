import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { TenantContextService } from './tenant-context.service';
import { TenantResolverService } from './tenant-resolver.service';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { TenantGuard } from './guards/tenant.guard';

/**
 * TenantModule
 * 
 * Core module for multi-tenant functionality.
 * 
 * Provides:
 * - TenantContextService: Request-scoped tenant storage
 * - TenantResolverService: Multi-strategy tenant resolution
 * - TenantService: Tenant CRUD operations
 * - TenantController: REST API endpoints
 * - TenantMiddleware: Automatic tenant resolution
 * - TenantGuard: Route protection
 * 
 * Setup:
 * 1. Import TenantModule in AppModule
 * 2. TenantMiddleware is auto-configured for all routes
 * 3. Use @SkipTenant() on routes that don't need tenant context
 * 4. Use @CurrentTenant() to inject tenant in controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  controllers: [TenantController],
  providers: [
    TenantContextService,
    TenantResolverService,
    TenantService,
    TenantGuard,
  ],
  exports: [
    TenantContextService,
    TenantResolverService,
    TenantService,
    TenantGuard,
    MongooseModule, // Export for other modules to access Tenant model
  ],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant middleware to all routes
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
