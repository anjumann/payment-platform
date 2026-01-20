import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Redis from 'ioredis';
import { Request } from 'express';
import { Tenant } from './schemas/tenant.schema';
import { config } from '../config';

/**
 * Resolution Result - Contains tenant and resolution method
 */
export interface ResolutionResult {
  tenant: Tenant;
  resolvedVia: 'jwt' | 'header' | 'subdomain' | 'domain';
}

/**
 * TenantResolverService
 * 
 * Resolves tenant from incoming HTTP requests using multiple strategies.
 * 
 * Resolution Priority (highest to lowest):
 * 1. JWT Claims - Most trusted (authenticated user)
 * 2. X-Tenant-ID Header - For API integrations
 * 3. Subdomain - For web access (bank1.financeops.com)
 * 4. Custom Domain - For white-label domains
 * 
 * Why this priority?
 * - JWT is cryptographically signed = highest trust
 * - Header is explicit = good for APIs
 * - Subdomain is implicit = user-facing
 * 
 * Caching Strategy:
 * - Tenant lookups are cached in Redis for 5 minutes
 * - Cache invalidated on tenant updates
 * - Reduces database load significantly
 */
@Injectable()
export class TenantResolverService {
  private readonly logger = new Logger(TenantResolverService.name);
  private readonly redis: Redis;
  private readonly CACHE_PREFIX = 'tenant:';
  private readonly CACHE_TTL = config.tenant.cacheTtlSeconds;

  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
  ) {
    // Initialize Redis connection
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      lazyConnect: true,
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    this.redis.connect().catch((err) => {
      this.logger.warn('Redis connection failed, caching disabled:', err.message);
    });
  }

  /**
   * Resolve tenant from request
   * Tries each resolution method in priority order
   */
  async resolve(request: Request): Promise<ResolutionResult | null> {
    // 1. Try JWT claims first (highest priority)
    const jwtTenant = await this.resolveFromJwt(request);
    if (jwtTenant) {
      this.logger.debug(`Tenant resolved from JWT: ${jwtTenant.slug}`);
      return { tenant: jwtTenant, resolvedVia: 'jwt' };
    }

    // 2. Try X-Tenant-ID header
    const headerTenant = await this.resolveFromHeader(request);
    if (headerTenant) {
      this.logger.debug(`Tenant resolved from header: ${headerTenant.slug}`);
      return { tenant: headerTenant, resolvedVia: 'header' };
    }

    // 3. Try subdomain extraction
    const subdomainTenant = await this.resolveFromSubdomain(request);
    if (subdomainTenant) {
      this.logger.debug(`Tenant resolved from subdomain: ${subdomainTenant.slug}`);
      return { tenant: subdomainTenant, resolvedVia: 'subdomain' };
    }

    // 4. Try custom domain lookup
    const domainTenant = await this.resolveFromCustomDomain(request);
    if (domainTenant) {
      this.logger.debug(`Tenant resolved from domain: ${domainTenant.slug}`);
      return { tenant: domainTenant, resolvedVia: 'domain' };
    }

    return null;
  }

  /**
   * Resolve from JWT token claims
   * Looks for 'tenantId' or 'tenant_id' in the decoded JWT payload
   */
  private async resolveFromJwt(request: Request): Promise<Tenant | null> {
    // Check if request has decoded JWT (set by Passport)
    const user = (request as any).user;
    if (!user) return null;

    const tenantId = user.tenantId || user.tenant_id;
    if (!tenantId) return null;

    return this.findTenantById(tenantId);
  }

  /**
   * Resolve from X-Tenant-ID header
   * Used by API clients for programmatic access
   */
  private async resolveFromHeader(request: Request): Promise<Tenant | null> {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) return null;

    // Could be tenant ID or API key
    return this.findTenantByIdOrApiKey(tenantId);
  }

  /**
   * Resolve from subdomain
   * Extracts subdomain from Host header
   * 
   * Handles edge cases:
   * - www prefix: www.bank1.financeops.com -> bank1
   * - Port numbers: bank1.financeops.com:3000 -> bank1
   * - Multiple subdomains: www.api.bank1.financeops.com -> bank1
   */
  private async resolveFromSubdomain(request: Request): Promise<Tenant | null> {
    const host = request.headers.host;
    if (!host) return null;

    // Remove port number if present
    const hostname = host.split(':')[0];

    // Extract subdomain
    const baseDomain = config.tenant.baseDomain;
    if (!hostname.endsWith(baseDomain)) {
      return null; // Not our main domain, might be custom domain
    }

    // Get the subdomain part
    // Example: bank1.financeops.com -> bank1
    // Example: www.bank1.financeops.com -> bank1
    const subdomainPart = hostname.slice(0, -(baseDomain.length + 1)); // +1 for the dot

    if (!subdomainPart) return null;

    // Remove www prefix if present
    const subdomain = subdomainPart
      .split('.')
      .filter((part) => part !== 'www')
      .pop(); // Get the last part (closest to base domain)

    if (!subdomain) return null;

    return this.findTenantBySlug(subdomain);
  }

  /**
   * Resolve from custom domain
   * Looks up the full hostname in tenant's domain list
   */
  private async resolveFromCustomDomain(request: Request): Promise<Tenant | null> {
    const host = request.headers.host;
    if (!host) return null;

    // Remove port number
    const hostname = host.split(':')[0];

    return this.findTenantByDomain(hostname);
  }

  /**
   * Find tenant by ID with caching
   */
  async findTenantById(id: string): Promise<Tenant | null> {
    const cacheKey = `${this.CACHE_PREFIX}id:${id}`;
    return this.findWithCache(cacheKey, () =>
      this.tenantModel.findOne({ _id: id, isActive: true }).exec(),
    );
  }

  /**
   * Find tenant by slug with caching
   */
  async findTenantBySlug(slug: string): Promise<Tenant | null> {
    const cacheKey = `${this.CACHE_PREFIX}slug:${slug}`;
    return this.findWithCache(cacheKey, () =>
      this.tenantModel.findOne({ slug, isActive: true }).exec(),
    );
  }

  /**
   * Find tenant by API key with caching
   */
  async findTenantByIdOrApiKey(idOrKey: string): Promise<Tenant | null> {
    const cacheKey = `${this.CACHE_PREFIX}key:${idOrKey}`;
    return this.findWithCache(cacheKey, () =>
      this.tenantModel
        .findOne({
          // Accept multiple identifiers:
          // - Mongo _id (admin/internal) (only if ObjectId-valid to avoid CastError)
          // - apiKey (pat_... key for API integrations)
          // - slug (useful for local dev / subdomain-based UIs that pass X-Tenant-ID)
          $or: [
            ...(Types.ObjectId.isValid(idOrKey) ? [{ _id: idOrKey }] : []),
            { apiKey: idOrKey },
            { slug: idOrKey },
          ],
          isActive: true,
        })
        .exec(),
    );
  }

  /**
   * Find tenant by custom domain with caching
   */
  async findTenantByDomain(domain: string): Promise<Tenant | null> {
    const cacheKey = `${this.CACHE_PREFIX}domain:${domain}`;
    return this.findWithCache(cacheKey, () =>
      this.tenantModel.findOne({ domains: domain, isActive: true }).exec(),
    );
  }

  /**
   * Generic cached find operation
   * Checks Redis cache first, then database
   */
  private async findWithCache(
    cacheKey: string,
    dbQuery: () => Promise<Tenant | null>,
  ): Promise<Tenant | null> {
    // Try cache first
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        const data = JSON.parse(cached);
        // Reconstruct as Mongoose document for methods
        return new this.tenantModel(data);
      }
    } catch (err) {
      this.logger.warn(`Cache read error: ${err.message}`);
    }

    // Query database
    const tenant = await dbQuery();

    // Cache result if found
    if (tenant) {
      try {
        await this.redis.setex(
          cacheKey,
          this.CACHE_TTL,
          JSON.stringify(tenant.toJSON()),
        );
      } catch (err) {
        this.logger.warn(`Cache write error: ${err.message}`);
      }
    }

    return tenant;
  }

  /**
   * Invalidate all caches for a tenant
   * Call this when tenant is updated
   */
  async invalidateTenantCache(tenant: Tenant): Promise<void> {
    const keys = [
      `${this.CACHE_PREFIX}id:${tenant._id}`,
      `${this.CACHE_PREFIX}slug:${tenant.slug}`,
      tenant.apiKey ? `${this.CACHE_PREFIX}key:${tenant.apiKey}` : null,
      ...tenant.domains.map((d) => `${this.CACHE_PREFIX}domain:${d}`),
    ].filter(Boolean) as string[];

    try {
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Invalidated cache for tenant ${tenant.slug}`);
      }
    } catch (err) {
      this.logger.warn(`Cache invalidation error: ${err.message}`);
    }
  }
}
