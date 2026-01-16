import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { config } from './config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Feature Modules
import { TenantModule } from './tenants/tenant.module';
import { CommonModule } from './common/common.module';
import { PaymentModule } from './payments/payment.module';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';
import { UsageModule } from './usage/usage.module';

// Guards
import { TenantGuard } from './tenants/guards/tenant.guard';
import { RateLimitGuard } from './rate-limiting/guards/rate-limit.guard';

/**
 * AppModule
 * 
 * Root module of the multi-tenant payment platform.
 * 
 * Module Loading Order (Dependencies):
 * 1. MongooseModule - Database connection
 * 2. TenantModule - Tenant resolution and context
 * 3. CommonModule - Shared utilities
 * 4. RateLimitingModule - API rate limiting
 * 5. UsageModule - Usage tracking
 * 6. PaymentModule - Payment operations
 * 
 * Global Guards:
 * 1. TenantGuard - Ensures tenant context exists
 * 2. RateLimitGuard - Enforces API rate limits
 */
@Module({
  imports: [
    // Database connection
    MongooseModule.forRoot(config.mongodb.uri, {
      // Connection options for production readiness
      retryAttempts: 5,
      retryDelay: 1000,
    }),

    // Core modules
    TenantModule,
    CommonModule,

    // Feature modules
    RateLimitingModule,
    UsageModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global Guards - Applied to all routes
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
