import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SkipTenant } from './tenants/decorators/skip-tenant.decorator';
import { SkipRateLimit } from './rate-limiting/decorators/skip-rate-limit.decorator';

/**
 * AppController
 * 
 * Root controller with health check and info endpoints.
 * These routes bypass tenant and rate limit checks.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint
   * Used by load balancers and monitoring systems
   */
  @Get('health')
  @SkipTenant()
  @SkipRateLimit()
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * API info endpoint
   */
  @Get()
  @SkipTenant()
  @SkipRateLimit()
  getInfo(): { name: string; version: string; description: string } {
    return {
      name: 'Multi-Tenant Payment Platform API',
      version: '1.0.0',
      description: 'A secure multi-tenant payment platform for financial institutions',
    };
  }
}
