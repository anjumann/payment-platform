// Environment configuration
export const config = {
  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/payment-platform?authSource=admin',
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Tenant Configuration
  tenant: {
    baseDomain: process.env.BASE_DOMAIN || 'financeops.com',
    cacheTtlSeconds: parseInt(process.env.TENANT_CACHE_TTL || '300', 10), // 5 minutes
  },

  // Rate Limiting Configuration
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  },
};

export type Config = typeof config;
