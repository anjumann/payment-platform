import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PaymentRepository } from './repositories/payment.repository';
import { CreatePaymentDto, UpdatePaymentDto, PaymentResponseDto, PaymentQueryDto } from './dto/payment.dto';
import { Payment, PaymentStatus, Currency } from './schemas/payment.schema';
import { TenantContextService } from '../tenants/tenant-context.service';

/**
 * PaymentService
 * 
 * Business logic for payment operations.
 * Uses PaymentRepository which automatically enforces tenant isolation.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Create a new payment
   */
  async create(createDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    const reference = this.generateReference();
    
    const payment = await this.paymentRepository.create({
      ...createDto,
      reference,
      currency: createDto.currency || Currency.USD,
      status: PaymentStatus.PENDING,
    });

    this.logger.log(`Payment created: ${reference}`);
    return this.toResponseDto(payment);
  }

  /**
   * Find payment by ID
   */
  async findById(id: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundException(`Payment not found`);
    }
    return this.toResponseDto(payment);
  }

  /**
   * Find payment by reference
   */
  async findByReference(reference: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findByReference(reference);
    if (!payment) {
      throw new NotFoundException(`Payment with reference '${reference}' not found`);
    }
    return this.toResponseDto(payment);
  }

  /**
   * List payments with pagination
   */
  async findAll(query: PaymentQueryDto): Promise<{
    data: PaymentResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }

    const result = await this.paymentRepository.findPaginated({
      filter,
      page: query.page || 1,
      limit: query.limit || 20,
      sort: { createdAt: -1 },
    });

    return {
      ...result,
      data: result.data.map((p) => this.toResponseDto(p)),
    };
  }

  /**
   * Update payment
   */
  async update(id: string, updateDto: UpdatePaymentDto): Promise<PaymentResponseDto> {
    // Handle status transitions
    if (updateDto.status) {
      const current = await this.paymentRepository.findById(id);
      if (!current) {
        throw new NotFoundException(`Payment not found`);
      }
      this.validateStatusTransition(current.status, updateDto.status);
    }

    const updateData: any = { ...updateDto };
    
    // Set timestamps based on status
    if (updateDto.status === PaymentStatus.PROCESSING) {
      updateData.processedAt = new Date();
    } else if (updateDto.status === PaymentStatus.COMPLETED) {
      updateData.completedAt = new Date();
    } else if (updateDto.status === PaymentStatus.FAILED) {
      updateData.failedAt = new Date();
    }

    const payment = await this.paymentRepository.updateById(id, { $set: updateData });
    if (!payment) {
      throw new NotFoundException(`Payment not found`);
    }

    this.logger.log(`Payment updated: ${payment.reference} -> ${updateDto.status || 'metadata'}`);
    return this.toResponseDto(payment);
  }

  /**
   * Cancel a pending payment
   */
  async cancel(id: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundException(`Payment not found`);
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException(`Can only cancel pending payments`);
    }

    const updated = await this.paymentRepository.updateById(id, {
      $set: { status: PaymentStatus.CANCELLED },
    });

    this.logger.log(`Payment cancelled: ${payment.reference}`);
    return this.toResponseDto(updated!);
  }

  /**
   * Get payment statistics
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    completed: number;
    failed: number;
    totalAmount: number;
    formattedTotalAmount: string;
  }> {
    const stats = await this.paymentRepository.getStats();
    return {
      ...stats,
      formattedTotalAmount: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(stats.totalAmount / 100),
    };
  }

  /**
   * Generate unique payment reference
   */
  private generateReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().substring(0, 8).toUpperCase();
    return `PAY-${timestamp}-${random}`;
  }

  /**
   * Validate payment status transitions
   */
  private validateStatusTransition(current: PaymentStatus, next: PaymentStatus): void {
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [PaymentStatus.PROCESSING, PaymentStatus.CANCELLED],
      [PaymentStatus.PROCESSING]: [PaymentStatus.COMPLETED, PaymentStatus.FAILED],
      [PaymentStatus.COMPLETED]: [PaymentStatus.REFUNDED],
      [PaymentStatus.FAILED]: [PaymentStatus.PENDING], // Allow retry
      [PaymentStatus.CANCELLED]: [],
      [PaymentStatus.REFUNDED]: [],
    };

    if (!validTransitions[current].includes(next)) {
      throw new ConflictException(
        `Invalid status transition from ${current} to ${next}`,
      );
    }
  }

  /**
   * Convert Payment to response DTO
   */
  private toResponseDto(payment: Payment): PaymentResponseDto {
    return {
      id: payment._id.toString(),
      reference: payment.reference,
      amount: payment.amount,
      formattedAmount: (payment as any).formattedAmount || 
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: payment.currency,
        }).format(payment.amount / 100),
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      description: payment.description,
      payer: payment.payer,
      payee: payment.payee,
      metadata: payment.metadata,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      processedAt: payment.processedAt,
      completedAt: payment.completedAt,
    };
  }
}
