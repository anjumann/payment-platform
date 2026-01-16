import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantDto, TenantResponseDto } from './dto/tenant.dto';
import { CurrentTenant } from './decorators/current-tenant.decorator';
import { SkipTenant } from './decorators/skip-tenant.decorator';
import { Tenant } from './schemas/tenant.schema';

/**
 * TenantController
 * 
 * REST API endpoints for tenant management.
 * 
 * Routes:
 * - GET /tenants/current - Get current tenant (from context)
 * - GET /tenants - List all tenants (admin)
 * - GET /tenants/:id - Get tenant by ID (admin)
 * - POST /tenants - Create new tenant (admin)
 * - PUT /tenants/:id - Update tenant (admin)
 * - DELETE /tenants/:id - Deactivate tenant (admin)
 */
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * Get current tenant from context
   * This is the most common use case for tenants accessing their own info
   */
  @Get('current')
  getCurrentTenant(@CurrentTenant() tenant: Tenant): TenantResponseDto {
    return {
      id: tenant._id.toString(),
      slug: tenant.slug,
      name: tenant.name,
      tier: tenant.tier,
      domains: tenant.domains,
      settings: tenant.settings,
      isActive: tenant.isActive,
      limits: tenant.getEffectiveLimits(),
      features: tenant.getFeatures(),
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  /**
   * List all tenants
   * Admin operation - should be protected by role guard
   */
  @Get()
  @SkipTenant() // Admin route doesn't need tenant context
  async findAll(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('isActive') isActive?: string,
  ) {
    return this.tenantService.findAll({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  /**
   * Get tenant by ID
   * Admin operation
   */
  @Get(':id')
  @SkipTenant()
  async findById(@Param('id') id: string): Promise<TenantResponseDto> {
    return this.tenantService.findById(id);
  }

  /**
   * Create new tenant
   * Admin operation
   */
  @Post()
  @SkipTenant()
  async create(@Body() createDto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenantService.create(createDto);
  }

  /**
   * Update tenant
   * Admin operation
   */
  @Put(':id')
  @SkipTenant()
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantService.update(id, updateDto);
  }

  /**
   * Regenerate API key
   * Admin operation
   */
  @Post(':id/regenerate-api-key')
  @SkipTenant()
  async regenerateApiKey(@Param('id') id: string): Promise<{ apiKey: string }> {
    return this.tenantService.regenerateApiKey(id);
  }

  /**
   * Deactivate tenant (soft delete)
   * Admin operation
   */
  @Delete(':id')
  @SkipTenant()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('id') id: string): Promise<void> {
    return this.tenantService.deactivate(id);
  }

  /**
   * Reactivate tenant
   * Admin operation
   */
  @Post(':id/reactivate')
  @SkipTenant()
  @HttpCode(HttpStatus.NO_CONTENT)
  async reactivate(@Param('id') id: string): Promise<void> {
    return this.tenantService.reactivate(id);
  }
}
