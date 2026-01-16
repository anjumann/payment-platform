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
import { PaymentService } from './payment.service';
import { CreatePaymentDto, UpdatePaymentDto, PaymentQueryDto, PaymentResponseDto } from './dto/payment.dto';

/**
 * PaymentController
 * 
 * REST API endpoints for payment operations.
 * All routes automatically scoped to current tenant via TenantAwareRepository.
 * 
 * Routes:
 * - POST /payments - Create new payment
 * - GET /payments - List payments (paginated)
 * - GET /payments/stats - Get payment statistics
 * - GET /payments/:id - Get payment by ID
 * - GET /payments/reference/:ref - Get payment by reference
 * - PUT /payments/:id - Update payment
 * - DELETE /payments/:id - Cancel payment
 */
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Create a new payment
   */
  @Post()
  async create(@Body() createDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    return this.paymentService.create(createDto);
  }

  /**
   * List payments with pagination
   */
  @Get()
  async findAll(@Query() query: PaymentQueryDto) {
    return this.paymentService.findAll(query);
  }

  /**
   * Get payment statistics
   */
  @Get('stats')
  async getStats() {
    return this.paymentService.getStats();
  }

  /**
   * Get payment by ID
   */
  @Get(':id')
  async findById(@Param('id') id: string): Promise<PaymentResponseDto> {
    return this.paymentService.findById(id);
  }

  /**
   * Get payment by reference
   */
  @Get('reference/:ref')
  async findByReference(@Param('ref') ref: string): Promise<PaymentResponseDto> {
    return this.paymentService.findByReference(ref);
  }

  /**
   * Update payment
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.update(id, updateDto);
  }

  /**
   * Cancel payment
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string): Promise<PaymentResponseDto> {
    return this.paymentService.cancel(id);
  }
}
