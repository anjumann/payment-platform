/**
 * Shared Types for Multi-Tenant Payment Platform
 * 
 * This library contains types shared between API and Web apps
 */

// Tenant Types
export enum TenantTier {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export interface TenantLimits {
  maxUsers: number;
  maxTransactionsPerMonth: number;
  apiRateLimit: number;
}

export interface TenantFeatures {
  whiteLabeling: boolean;
  customDomains: boolean;
  prioritySupport: boolean;
  advancedAnalytics: boolean;
  webhooks: boolean;
}

export interface TenantSettings {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  defaultLanguage: string;
  timezone: string;
  defaultCurrency: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  tier: TenantTier;
  domains: string[];
  settings: TenantSettings;
  limits: TenantLimits;
  features: TenantFeatures;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Payment Types
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  WALLET = 'wallet',
  UPI = 'upi',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  INR = 'INR',
  JPY = 'JPY',
}

export interface PayerInfo {
  name?: string;
  email?: string;
  phone?: string;
  accountNumber?: string;
}

export interface Payment {
  id: string;
  reference: string;
  tenantId: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  method?: PaymentMethod;
  description?: string;
  payer?: PayerInfo;
  payee?: PayerInfo;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

// Usage Types
export interface UsageSummary {
  tenantId: string;
  period: string;
  usage: {
    apiCalls: number;
    transactions: number;
    storageBytes: number;
    bandwidthBytes: number;
  };
  limits: {
    maxTransactionsPerMonth: number;
    transactionPercentUsed: number;
  };
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Rate Limit Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;
}
