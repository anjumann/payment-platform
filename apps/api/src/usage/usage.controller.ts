import { Controller, Get, Query } from '@nestjs/common';
import { UsageTrackerService, UsageSummary } from './usage-tracker.service';

/**
 * UsageController
 * 
 * REST API endpoints for usage tracking and billing data.
 * 
 * Routes:
 * - GET /usage/summary - Get current period usage summary
 * - GET /usage/history - Get usage history for multiple periods
 */
@Controller('usage')
export class UsageController {
  constructor(private readonly usageTracker: UsageTrackerService) {}

  /**
   * Get usage summary for current or specified period
   * @param period Optional period in YYYY-MM format
   */
  @Get('summary')
  async getSummary(@Query('period') period?: string): Promise<UsageSummary> {
    return this.usageTracker.getSummary(period);
  }

  /**
   * Get usage history for multiple periods
   * @param months Number of months to retrieve (default: 12)
   */
  @Get('history')
  async getHistory(@Query('months') months?: number): Promise<UsageSummary[]> {
    return this.usageTracker.getHistory(months ? Number(months) : 12);
  }

  /**
   * Check if transaction limit is exceeded
   */
  @Get('limit-check')
  async checkLimit(): Promise<{ exceeded: boolean; message: string }> {
    const exceeded = await this.usageTracker.hasExceededTransactionLimit();
    return {
      exceeded,
      message: exceeded
        ? 'Transaction limit for this period has been reached'
        : 'Within transaction limits',
    };
  }
}
