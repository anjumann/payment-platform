import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TenantTier, TenantLimits, TenantFeatures, TIER_CONFIGS } from '../constants/tier-config';

/**
 * Tenant Settings - Customizable settings per tenant
 */
export class TenantSettings {
  @Prop({ default: '#1976d2' })
  primaryColor: string;

  @Prop({ default: '#dc004e' })
  secondaryColor: string;

  @Prop()
  logoUrl?: string;

  @Prop()
  faviconUrl?: string;

  @Prop({ default: 'en' })
  defaultLanguage: string;

  @Prop({ default: 'UTC' })
  timezone: string;

  @Prop({ default: 'USD' })
  defaultCurrency: string;
}

/**
 * Tenant Document - MongoDB schema for tenant entities
 * 
 * This is the core tenant schema that stores all tenant configuration,
 * including slugs for subdomain access, custom domains, tier limits, and settings.
 */
@Schema({
  timestamps: true,
  collection: 'tenants',
})
export class Tenant extends Document {
  /**
   * URL-safe slug for subdomain access
   * Example: 'bank1' for bank1.financeops.com
   */
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  /**
   * Display name of the tenant
   * Example: 'First National Bank'
   */
  @Prop({ required: true })
  name: string;

  /**
   * Subscription tier determining limits and features
   */
  @Prop({ 
    type: String, 
    enum: Object.values(TenantTier), 
    default: TenantTier.STARTER 
  })
  tier: TenantTier;

  /**
   * List of custom domains pointing to this tenant
   * Example: ['payments.theirbank.com', 'pay.theirbank.com']
   */
  @Prop({ type: [String], default: [] })
  domains: string[];

  /**
   * Tenant-specific settings for white-labeling
   */
  @Prop({ type: TenantSettings, default: () => new TenantSettings() })
  settings: TenantSettings;

  /**
   * Override limits (for custom enterprise agreements)
   * If null, defaults to tier limits
   */
  @Prop({ type: Object })
  customLimits?: Partial<TenantLimits>;

  /**
   * Whether the tenant is active
   * Inactive tenants cannot access the platform
   */
  @Prop({ default: true, index: true })
  isActive: boolean;

  /**
   * API key for X-Tenant-ID header authentication
   * Used by API clients for programmatic access
   */
  @Prop({ unique: true, sparse: true })
  apiKey?: string;

  /**
   * Contact email for the tenant administrator
   */
  @Prop({ required: true })
  adminEmail: string;

  /**
   * Billing information
   */
  @Prop()
  billingEmail?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  /**
   * Get effective limits for this tenant
   * Returns custom limits if set, otherwise tier defaults
   */
  getEffectiveLimits(): TenantLimits {
    const tierLimits = TIER_CONFIGS[this.tier].limits;
    if (!this.customLimits) {
      return tierLimits;
    }
    return {
      ...tierLimits,
      ...this.customLimits,
    };
  }

  /**
   * Get features available for this tenant's tier
   */
  getFeatures(): TenantFeatures {
    return TIER_CONFIGS[this.tier].features;
  }

  /**
   * Check if tenant has a specific feature
   */
  hasFeature(feature: keyof TenantFeatures): boolean {
    return this.getFeatures()[feature];
  }
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

// ---- Schema methods (ensure available on hydrated documents) ----
// Note: Class methods are not reliably attached to Mongoose documents unless explicitly added.
TenantSchema.methods.getEffectiveLimits = function (): TenantLimits {
  const tierLimits = TIER_CONFIGS[this.tier].limits;
  if (!this.customLimits) return tierLimits;
  return {
    ...tierLimits,
    ...this.customLimits,
  };
};

TenantSchema.methods.getFeatures = function (): TenantFeatures {
  return TIER_CONFIGS[this.tier].features;
};

TenantSchema.methods.hasFeature = function (feature: keyof TenantFeatures): boolean {
  return this.getFeatures()[feature];
};

// Add compound indexes for efficient lookups
TenantSchema.index({ slug: 1, isActive: 1 });
TenantSchema.index({ domains: 1 });
TenantSchema.index({ apiKey: 1 });

// Add virtual for id
TenantSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtuals are included in JSON
TenantSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret: any) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    return ret;
  },
});
