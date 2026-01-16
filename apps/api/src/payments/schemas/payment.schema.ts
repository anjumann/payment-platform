import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BaseTenantDocument } from '../../common/schemas/base-tenant.schema';

/**
 * Payment Status Enum
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/**
 * Payment Method Enum
 */
export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  WALLET = 'wallet',
  UPI = 'upi',
}

/**
 * Currency Enum (common currencies)
 */
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  INR = 'INR',
  JPY = 'JPY',
}

/**
 * Payment Schema
 * 
 * Represents a payment transaction within a tenant's context.
 * Extends BaseTenantDocument for automatic tenant isolation.
 * 
 * All payments are automatically scoped to the current tenant
 * through the TenantAwareRepository.
 */
@Schema({
  timestamps: true,
  collection: 'payments',
})
export class Payment extends BaseTenantDocument {
  /**
   * Unique payment reference for the tenant
   */
  @Prop({ required: true, index: true })
  reference: string;

  /**
   * Payment amount in smallest currency unit (cents/paise)
   */
  @Prop({ required: true, min: 0 })
  amount: number;

  /**
   * Currency code
   */
  @Prop({ type: String, enum: Object.values(Currency), default: Currency.USD })
  currency: Currency;

  /**
   * Current payment status
   */
  @Prop({ 
    type: String, 
    enum: Object.values(PaymentStatus), 
    default: PaymentStatus.PENDING,
    index: true,
  })
  status: PaymentStatus;

  /**
   * Payment method used
   */
  @Prop({ type: String, enum: Object.values(PaymentMethod) })
  method?: PaymentMethod;

  /**
   * Description of the payment
   */
  @Prop({ maxlength: 500 })
  description?: string;

  /**
   * Payer information
   */
  @Prop({ type: Object })
  payer?: {
    name?: string;
    email?: string;
    phone?: string;
    accountNumber?: string;
  };

  /**
   * Payee information
   */
  @Prop({ type: Object })
  payee?: {
    name?: string;
    email?: string;
    phone?: string;
    accountNumber?: string;
  };

  /**
   * Metadata for extensibility
   */
  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  /**
   * External provider transaction ID
   */
  @Prop()
  externalId?: string;

  /**
   * Processing timestamps
   */
  @Prop()
  processedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  failedAt?: Date;

  /**
   * Failure details if applicable
   */
  @Prop()
  failureReason?: string;

  @Prop()
  failureCode?: string;

  /**
   * User who created the payment
   */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Compound indexes for efficient queries
PaymentSchema.index({ tenantId: 1, status: 1 });
PaymentSchema.index({ tenantId: 1, createdAt: -1 });
PaymentSchema.index({ tenantId: 1, reference: 1 }, { unique: true });

// Virtual for formatted amount
PaymentSchema.virtual('formattedAmount').get(function () {
  const amount = this.amount / 100; // Convert from cents
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency,
  }).format(amount);
});

PaymentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret: any) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    return ret;
  },
});
