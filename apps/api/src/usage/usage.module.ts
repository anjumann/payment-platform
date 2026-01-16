import { Module } from '@nestjs/common';
import { UsageTrackerService } from './usage-tracker.service';
import { UsageController } from './usage.controller';
import { TenantModule } from '../tenants/tenant.module';

/**
 * UsageModule
 * 
 * Provides tenant usage tracking and billing data.
 * 
 * Features:
 * - Monthly usage aggregation
 * - API call tracking
 * - Transaction counting
 * - Storage and bandwidth tracking
 * - Usage history for billing
 */
@Module({
  imports: [TenantModule],
  controllers: [UsageController],
  providers: [UsageTrackerService],
  exports: [UsageTrackerService],
})
export class UsageModule {}
