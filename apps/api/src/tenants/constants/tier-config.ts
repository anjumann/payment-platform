/**
 * Tenant Tier Definitions
 * Defines the limits and features available for each subscription tier
 */
export enum TenantTier {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export interface TenantLimits {
  maxUsers: number;
  maxTransactionsPerMonth: number;
  apiRateLimit: number; // requests per minute
}

export interface TenantFeatures {
  basicPayments: boolean;
  bulkPayments: boolean;
  analytics: boolean;
  customWorkflows: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
}

/**
 * Tier configuration mapping
 * Based on the assignment requirements
 */
export const TIER_CONFIGS: Record<
  TenantTier,
  { limits: TenantLimits; features: TenantFeatures }
> = {
  [TenantTier.STARTER]: {
    limits: {
      maxUsers: 10,
      maxTransactionsPerMonth: 1000,
      apiRateLimit: 60, // 60/min
    },
    features: {
      basicPayments: true,
      bulkPayments: false,
      analytics: false,
      customWorkflows: false,
      whiteLabel: false,
      apiAccess: false,
    },
  },
  [TenantTier.PROFESSIONAL]: {
    limits: {
      maxUsers: 100,
      maxTransactionsPerMonth: 50000,
      apiRateLimit: 300, // 300/min
    },
    features: {
      basicPayments: true,
      bulkPayments: true,
      analytics: true,
      customWorkflows: false,
      whiteLabel: false,
      apiAccess: false,
    },
  },
  [TenantTier.ENTERPRISE]: {
    limits: {
      maxUsers: Infinity,
      maxTransactionsPerMonth: Infinity,
      apiRateLimit: 1000, // 1000/min
    },
    features: {
      basicPayments: true,
      bulkPayments: true,
      analytics: true,
      customWorkflows: true,
      whiteLabel: true,
      apiAccess: true,
    },
  },
};

/**
 * Get limits for a specific tier
 */
export function getTierLimits(tier: TenantTier): TenantLimits {
  return TIER_CONFIGS[tier].limits;
}

/**
 * Get features for a specific tier
 */
export function getTierFeatures(tier: TenantTier): TenantFeatures {
  return TIER_CONFIGS[tier].features;
}

/**
 * Check if a tier has a specific feature
 */
export function hasFeature(
  tier: TenantTier,
  feature: keyof TenantFeatures,
): boolean {
  return TIER_CONFIGS[tier].features[feature];
}
