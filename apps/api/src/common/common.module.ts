import { Module } from '@nestjs/common';

/**
 * CommonModule
 * 
 * Provides shared utilities, base classes, and decorators for the application.
 * 
 * Key Components:
 * - BaseTenantDocument: Base schema for tenant-owned entities
 * - TenantAwareRepository: Repository with automatic tenant isolation
 * - @BypassTenantIsolation: Decorator for admin cross-tenant operations
 */
@Module({
  providers: [],
  exports: [],
})
export class CommonModule {}
