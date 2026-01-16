import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { TenantModule } from '../tenants/tenant.module';

/**
 * PaymentModule
 * 
 * Handles all payment-related operations with automatic tenant isolation.
 * 
 * Key Points:
 * - PaymentRepository extends TenantAwareRepository
 * - All queries automatically filtered by tenant
 * - No explicit tenant handling needed in business logic
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    TenantModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentRepository, PaymentService],
  exports: [PaymentRepository, PaymentService],
})
export class PaymentModule {}
