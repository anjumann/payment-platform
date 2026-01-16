import { IsString, IsEnum, IsArray, IsEmail, IsOptional, IsBoolean, ValidateNested, MinLength, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { TenantTier } from '../constants/tier-config';

/**
 * Tenant Settings DTO
 */
export class TenantSettingsDto {
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Primary color must be a valid hex color' })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Secondary color must be a valid hex color' })
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @IsOptional()
  @IsString()
  defaultLanguage?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  defaultCurrency?: string;
}

/**
 * Create Tenant DTO
 */
export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsEnum(TenantTier)
  tier?: TenantTier;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TenantSettingsDto)
  settings?: TenantSettingsDto;

  @IsEmail()
  adminEmail: string;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;
}

/**
 * Update Tenant DTO
 */
export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(TenantTier)
  tier?: TenantTier;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TenantSettingsDto)
  settings?: TenantSettingsDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;
}

/**
 * Tenant Response DTO
 */
export class TenantResponseDto {
  id: string;
  slug: string;
  name: string;
  tier: TenantTier;
  domains: string[];
  settings: TenantSettingsDto;
  isActive: boolean;
  limits: {
    maxUsers: number;
    maxTransactionsPerMonth: number;
    apiRateLimit: number;
  };
  features: {
    basicPayments: boolean;
    bulkPayments: boolean;
    analytics: boolean;
    customWorkflows: boolean;
    whiteLabel: boolean;
    apiAccess: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
