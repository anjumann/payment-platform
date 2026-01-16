import { IsString, IsNumber, IsEnum, IsOptional, IsObject, Min, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, PaymentStatus, Currency } from '../schemas/payment.schema';

/**
 * Payer/Payee Info DTO
 */
export class PartyInfoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;
}

/**
 * Create Payment DTO
 */
export class CreatePaymentDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PartyInfoDto)
  payer?: PartyInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PartyInfoDto)
  payee?: PartyInfoDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Update Payment DTO
 */
export class UpdatePaymentDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  failureReason?: string;

  @IsOptional()
  @IsString()
  failureCode?: string;
}

/**
 * Payment Query DTO
 */
export class PaymentQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

/**
 * Payment Response DTO
 */
export class PaymentResponseDto {
  id: string;
  reference: string;
  amount: number;
  formattedAmount: string;
  currency: Currency;
  status: PaymentStatus;
  method?: PaymentMethod;
  description?: string;
  payer?: PartyInfoDto;
  payee?: PartyInfoDto;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}
