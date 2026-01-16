# Multi-Tenant Payment Platform - Architecture Guide

A comprehensive guide to the multi-tenant payment platform built with NestJS + Next.js in an Nx monorepo.

---

## 📋 Table of Contents

1. [Quick Start Commands](#-quick-start-commands)
2. [Project Structure](#-project-structure)
3. [Database Architecture](#-database-architecture)
4. [Backend Architecture (API)](#-backend-architecture-api)
5. [Frontend Architecture (Web)](#-frontend-architecture-web)
6. [Multi-Tenancy Design](#-multi-tenancy-design)
7. [Rate Limiting & Usage Tracking](#-rate-limiting--usage-tracking)
8. [Data Flow Diagrams](#-data-flow-diagrams)

---

## 🚀 Quick Start Commands

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm

### Step-by-Step Setup

```bash
# 1. Navigate to the project
cd /Users/apple/Desktop/Intv/payment-platform

# 2. Install dependencies
npm install

# 3. Start infrastructure (MongoDB + Redis)
npm run docker:up

# 4. Seed the database with sample tenants
npm run seed

# 5. Start all applications
npm run start:all

# Or start individually:
npm run start:api   # Backend at http://localhost:3000
npm run start:web   # Frontend at http://localhost:3001
```

### Available Commands

| Command               | Description                       |
| --------------------- | --------------------------------- |
| `npm run start:api`   | Start API in watch mode           |
| `npm run start:web`   | Start Web in dev mode             |
| `npm run start:all`   | Start all apps concurrently       |
| `npm run build:all`   | Build all apps                    |
| `npm run lint:all`    | Lint all apps                     |
| `npm run docker:up`   | Start MongoDB + Redis containers  |
| `npm run docker:down` | Stop Docker services              |
| `npm run seed`        | Seed database with sample tenants |

### Testing the API

After seeding, test with these commands:

```bash
# Get current tenant info using API key header
curl -H "X-Tenant-ID: bank1" http://localhost:3000/api/tenants/current

# Or use subdomain (requires /etc/hosts configuration)
curl -H "Host: bank1.localhost:3000" http://localhost:3000/api/tenants/current
```

---

## 📁 Project Structure

```
payment-platform/
├── apps/
│   ├── api/                    # NestJS Backend (port 3000)
│   │   ├── src/
│   │   │   ├── common/         # Shared utilities & base schemas
│   │   │   ├── config/         # Environment configuration
│   │   │   ├── payments/       # Payment module (CRUD operations)
│   │   │   ├── rate-limiting/  # Rate limiting module
│   │   │   ├── scripts/        # Database seed scripts
│   │   │   ├── tenants/        # Tenant module (core multi-tenancy)
│   │   │   ├── usage/          # Usage tracking module
│   │   │   ├── app.module.ts   # Root module
│   │   │   └── main.ts         # Application entry point
│   │   └── docker-compose.yml  # MongoDB + Redis containers
│   │
│   └── web/                    # Next.js Frontend (port 3001)
│       └── src/
│           ├── app/            # Next.js App Router pages
│           │   ├── analytics/  # Analytics dashboard
│           │   ├── payments/   # Payments management
│           │   └── settings/   # Settings page
│           ├── components/     # Reusable UI components
│           └── lib/            # Utilities & tenant context
│
├── libs/
│   └── shared-types/           # Shared TypeScript interfaces
│
├── nx.json                     # Nx workspace configuration
├── package.json                # Root dependencies & scripts
└── tsconfig.base.json          # Base TypeScript config
```

---

## 💾 Database Architecture

### Technology Stack

- **MongoDB 7**: Primary database for tenants, payments, and usage data
- **Redis 7**: Caching layer and rate limiting storage

### Docker Setup (docker-compose.yml)

```yaml
services:
  mongodb:
    image: mongo:7
    container_name: payment-platform-mongodb
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password123

  redis:
    image: redis:7-alpine
    container_name: payment-platform-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
```

### Database Connection (config/index.ts)

```typescript
export const config = {
  mongodb: {
    uri:
      process.env.MONGODB_URI || "mongodb://localhost:27017/payment-platform",
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },
  // ... other config
};
```

### Collections

#### 1. `tenants` Collection

Stores all tenant configurations:

| Field          | Type     | Description                             |
| -------------- | -------- | --------------------------------------- |
| `slug`         | String   | URL-safe identifier (e.g., "bank1")     |
| `name`         | String   | Display name                            |
| `tier`         | Enum     | "starter", "professional", "enterprise" |
| `domains`      | String[] | Custom domains for white-labeling       |
| `settings`     | Object   | Branding (colors, logo, language)       |
| `apiKey`       | String   | API key for X-Tenant-ID header          |
| `isActive`     | Boolean  | Soft-disable flag                       |
| `customLimits` | Object   | Override tier defaults                  |

**Indexes:**

- `slug` (unique)
- `apiKey` (unique, sparse)
- `domains` (array index)
- Compound: `{ slug: 1, isActive: 1 }`

#### 2. `payments` Collection

Stores all payment transactions:

| Field       | Type     | Description                                                 |
| ----------- | -------- | ----------------------------------------------------------- |
| `tenantId`  | ObjectId | **Foreign key to tenant**                                   |
| `reference` | String   | Unique payment reference                                    |
| `amount`    | Number   | Amount in smallest unit (cents)                             |
| `currency`  | Enum     | USD, EUR, GBP, INR, JPY                                     |
| `status`    | Enum     | pending, processing, completed, failed, cancelled, refunded |
| `method`    | Enum     | bank_transfer, credit_card, debit_card, wallet, upi         |
| `payer`     | Object   | Payer info (name, email, phone)                             |
| `payee`     | Object   | Payee info                                                  |
| `metadata`  | Object   | Extensible custom data                                      |
| `deletedAt` | Date     | Soft delete timestamp                                       |

**Indexes:**

- `{ tenantId: 1, status: 1 }`
- `{ tenantId: 1, createdAt: -1 }`
- `{ tenantId: 1, reference: 1 }` (unique)

### Data Isolation Pattern

All tenant-owned documents extend `BaseTenantDocument`:

```typescript
@Schema({ timestamps: true })
export abstract class BaseTenantDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId; // Every document belongs to a tenant

  @Prop({ type: Date, default: null, index: true })
  deletedAt: Date | null; // Soft delete support
}
```

This ensures:

- Every document has a `tenantId`
- Queries are automatically scoped to current tenant
- Complete data isolation between tenants

---

## 🔧 Backend Architecture (API)

### Module Loading Order

```
1. MongooseModule     → Database connection
2. TenantModule       → Tenant resolution & context
3. CommonModule       → Shared utilities
4. RateLimitingModule → API rate limiting
5. UsageModule        → Usage tracking
6. PaymentModule      → Payment CRUD operations
```

### Global Guards

Two global guards protect all routes:

```typescript
providers: [
  { provide: APP_GUARD, useClass: TenantGuard },     // Ensures tenant context
  { provide: APP_GUARD, useClass: RateLimitGuard },  // Enforces rate limits
],
```

### Key Services

#### TenantResolverService

Resolves tenant from incoming requests using 4 strategies:

```
┌──────────────────────────────────────────────────────────┐
│                    Request Arrives                        │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  1. JWT Claims (Highest Priority)                         │
│     - Checks decoded JWT for tenantId claim               │
│     - Most trusted (cryptographically signed)             │
└──────────────────────────────────────────────────────────┘
                            │ Not found?
                            ▼
┌──────────────────────────────────────────────────────────┐
│  2. X-Tenant-ID Header                                    │
│     - Looks for "X-Tenant-ID" header                      │
│     - Value can be: slug, tenant ID, or API key           │
└──────────────────────────────────────────────────────────┘
                            │ Not found?
                            ▼
┌──────────────────────────────────────────────────────────┐
│  3. Subdomain Extraction                                  │
│     - Parses Host header: bank1.financeops.com → bank1    │
│     - Handles www prefix & port numbers                   │
└──────────────────────────────────────────────────────────┘
                            │ Not found?
                            ▼
┌──────────────────────────────────────────────────────────┐
│  4. Custom Domain Lookup                                  │
│     - Full domain lookup in tenant.domains array          │
│     - Example: payments.theirbank.com                     │
└──────────────────────────────────────────────────────────┘
```

#### Redis Caching Strategy

```typescript
// Cache keys follow pattern: tenant:<type>:<identifier>
// Examples:
//   tenant:slug:bank1
//   tenant:id:60f7b1c3e4b...
//   tenant:domain:payments.theirbank.com

// TTL: 5 minutes (configurable via TENANT_CACHE_TTL env)
// Invalidation: On tenant update, all related keys are deleted
```

#### RateLimiterService

Per-tenant rate limiting using Redis:

```typescript
// Rate limits are tier-based:
// STARTER:      60 requests/minute
// PROFESSIONAL: 300 requests/minute
// ENTERPRISE:   1000 requests/minute

// Response headers on every request:
// X-RateLimit-Limit: 300
// X-RateLimit-Remaining: 289
// X-RateLimit-Reset: 1642345678
```

### API Endpoints

| Method | Endpoint               | Description                   |
| ------ | ---------------------- | ----------------------------- |
| GET    | `/api/tenants/current` | Get current tenant info       |
| GET    | `/api/tenants/:id`     | Get tenant by ID              |
| POST   | `/api/tenants`         | Create new tenant             |
| PATCH  | `/api/tenants/:id`     | Update tenant                 |
| GET    | `/api/payments`        | List payments (tenant-scoped) |
| POST   | `/api/payments`        | Create payment                |
| GET    | `/api/payments/:id`    | Get payment by ID             |
| PATCH  | `/api/payments/:id`    | Update payment                |

---

## 🎨 Frontend Architecture (Web)

### Technology Stack

- **Next.js 14** with App Router
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **React Context** for tenant state

### Tenant Context

The frontend uses React Context to manage tenant state:

```typescript
// TenantProvider wraps the app
export function TenantProvider({ children }) {
  // 1. Extract subdomain from URL
  const subdomain = getTenantFromSubdomain();

  // 2. Fetch tenant from API
  const response = await fetch(`${apiUrl}/api/tenants/current`, {
    headers: { "X-Tenant-ID": subdomain },
  });

  // 3. Provide tenant to all components
  return (
    <TenantContext.Provider value={{ tenant, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

// Usage in components:
const { tenant } = useTenant();
```

### Page Structure

```
src/app/
├── page.tsx           # Dashboard home
├── layout.tsx         # Root layout with TenantProvider
├── analytics/page.tsx # Analytics dashboard
├── payments/page.tsx  # Payment management
└── settings/page.tsx  # Tenant settings
```

### UI Components

Located in `src/components/ui/`:

- `button.tsx`
- `card.tsx`
- `badge.tsx`
- etc.

---

## 🏢 Multi-Tenancy Design

### Tier System

| Tier             | Max Users | Transactions/Month | API Rate Limit | Features                                    |
| ---------------- | --------- | ------------------ | -------------- | ------------------------------------------- |
| **Starter**      | 10        | 1,000              | 60/min         | Basic payments                              |
| **Professional** | 100       | 50,000             | 300/min        | + Bulk payments, Analytics                  |
| **Enterprise**   | ∞         | ∞                  | 1,000/min      | + Custom workflows, White-label, API access |

### Feature Flags

```typescript
interface TenantFeatures {
  basicPayments: boolean; // All tiers
  bulkPayments: boolean; // Professional+
  analytics: boolean; // Professional+
  customWorkflows: boolean; // Enterprise only
  whiteLabel: boolean; // Enterprise only
  apiAccess: boolean; // Enterprise only
}
```

### Tenant Settings (White-Labeling)

```typescript
interface TenantSettings {
  primaryColor: string; // Brand color
  secondaryColor: string; // Accent color
  logoUrl: string; // Custom logo
  faviconUrl: string; // Custom favicon
  defaultLanguage: string; // UI language
  timezone: string; // Display timezone
  defaultCurrency: string; // Default currency
}
```

---

## ⚡ Rate Limiting & Usage Tracking

### How Rate Limiting Works

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Request   │────▶│  RateLimitGuard  │────▶│   Redis     │
└─────────────┘     └──────────────────┘     └─────────────┘
                            │                       │
                            │  Check limit          │
                            │◀──────────────────────│
                            │                       │
                    ┌───────┴───────┐               │
                    │  Under Limit? │               │
                    └───────┬───────┘               │
                   Yes │         │ No               │
                       │         │                  │
                       ▼         ▼                  │
              ┌────────────┐ ┌────────────────┐     │
              │  Continue  │ │ 429 Too Many   │     │
              │  to Route  │ │ Requests       │     │
              └────────────┘ └────────────────┘     │
                       │                            │
                       │  Increment counter         │
                       └────────────────────────────│
```

### Redis Key Structure

```
rate:tenant:<tenantId>:endpoint:<endpoint>
Example: rate:tenant:60f7b1c3:endpoint:/api/payments
```

### Bypassing Rate Limits

Use the `@SkipRateLimit()` decorator:

```typescript
@SkipRateLimit()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

---

## 📊 Data Flow Diagrams

### Complete Request Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT REQUEST                                    │
│                    (Browser / API Client / Mobile App)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NestJS API                                      │
│                                                                              │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────────────────┐ │
│  │   TenantGuard  │───▶│ RateLimitGuard │───▶│     Controller + Service   │ │
│  │                │    │                │    │                            │ │
│  │ 1. Resolve     │    │ 1. Check Redis │    │ 1. Business logic          │ │
│  │    tenant      │    │    for limit   │    │ 2. Query MongoDB           │ │
│  │ 2. Set context │    │ 2. Increment   │    │ 3. Return response         │ │
│  └────────────────┘    └────────────────┘    └────────────────────────────┘ │
│           │                    │                          │                  │
│           ▼                    ▼                          ▼                  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         INFRASTRUCTURE                                  │ │
│  │                                                                         │ │
│  │    ┌──────────────┐              ┌──────────────┐                       │ │
│  │    │    MongoDB   │              │    Redis     │                       │ │
│  │    │              │              │              │                       │ │
│  │    │ • tenants    │              │ • Caching    │                       │ │
│  │    │ • payments   │              │ • Rate limits│                       │ │
│  │    │ • usage      │              │ • Sessions   │                       │ │
│  │    └──────────────┘              └──────────────┘                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Payment Creation Flow

```
                    ┌───────────────────────────────────┐
                    │    POST /api/payments             │
                    │    { amount: 10000, ... }         │
                    └───────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
          ┌──────────────────┐              ┌──────────────────┐
          │   TenantGuard    │              │  RateLimitGuard  │
          │   Resolves:      │              │  Checks:         │
          │   tenantId       │              │  300/min limit   │
          └──────────────────┘              └──────────────────┘
                    │                                   │
                    └─────────────────┬─────────────────┘
                                      ▼
                    ┌───────────────────────────────────┐
                    │     PaymentController.create()    │
                    └───────────────────────────────────┘
                                      │
                                      ▼
                    ┌───────────────────────────────────┐
                    │       PaymentService.create()     │
                    │                                   │
                    │  1. Validate DTO                  │
                    │  2. Generate unique reference     │
                    │  3. Add tenantId from context     │
                    │  4. Save to MongoDB               │
                    │  5. Track usage                   │
                    └───────────────────────────────────┘
                                      │
                                      ▼
                    ┌───────────────────────────────────┐
                    │           MongoDB                 │
                    │   payments.insertOne({            │
                    │     tenantId: "...",              │
                    │     reference: "PAY-xxx",         │
                    │     amount: 10000,                │
                    │     status: "pending"             │
                    │   })                              │
                    └───────────────────────────────────┘
```

---

## 🔒 Security Considerations

1. **Tenant Isolation**: Every document is scoped by `tenantId`
2. **API Keys**: Unique `pat_` prefixed keys for programmatic access
3. **Rate Limiting**: Per-tenant limits prevent abuse
4. **Soft Delete**: Data is never permanently deleted (audit trail)
5. **JWT Support**: For authenticated user sessions

---

## 🌐 Environment Variables

| Variable               | Default                                      | Description                          |
| ---------------------- | -------------------------------------------- | ------------------------------------ |
| `MONGODB_URI`          | `mongodb://localhost:27017/payment-platform` | MongoDB connection string            |
| `REDIS_HOST`           | `localhost`                                  | Redis host                           |
| `REDIS_PORT`           | `6379`                                       | Redis port                           |
| `JWT_SECRET`           | (dev only)                                   | JWT signing secret                   |
| `JWT_EXPIRES_IN`       | `24h`                                        | JWT expiration                       |
| `BASE_DOMAIN`          | `financeops.com`                             | Base domain for subdomain resolution |
| `TENANT_CACHE_TTL`     | `300`                                        | Tenant cache TTL in seconds          |
| `RATE_LIMIT_WINDOW_MS` | `60000`                                      | Rate limit window (1 minute)         |

---

## 📝 Sample Tenants (After Seeding)

| Slug          | Name                  | Tier         | API Key          |
| ------------- | --------------------- | ------------ | ---------------- |
| `bank1`       | First National Bank   | Enterprise   | (auto-generated) |
| `fintech-pro` | FinTech Pro Solutions | Professional | (auto-generated) |
| `startup-pay` | Startup Payments Inc  | Starter      | (auto-generated) |

---

## 🔗 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                 Nx Monorepo                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────┐        ┌─────────────────────────────┐      │
│  │       apps/web              │        │       apps/api              │      │
│  │       (Next.js)             │  HTTP  │       (NestJS)              │      │
│  │                             │◀──────▶│                             │      │
│  │  • React Components         │        │  • TenantModule             │      │
│  │  • TenantContext            │        │  • PaymentModule            │      │
│  │  • Tailwind + shadcn/ui     │        │  • RateLimitingModule       │      │
│  │  • App Router               │        │  • UsageModule              │      │
│  │                             │        │                             │      │
│  │  Port: 3001                 │        │  Port: 3000                 │      │
│  └─────────────────────────────┘        └─────────────────────────────┘      │
│                │                                      │                       │
│                │                                      │                       │
│                └──────────┬───────────────────────────┘                       │
│                           │                                                   │
│                           ▼                                                   │
│               ┌─────────────────────────────┐                                 │
│               │    libs/shared-types        │                                 │
│               │                             │                                 │
│               │  • Tenant interface         │                                 │
│               │  • Payment interface        │                                 │
│               │  • Enums & types            │                                 │
│               └─────────────────────────────┘                                 │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
          ┌──────────────────┐              ┌──────────────────┐
          │     MongoDB      │              │      Redis       │
          │                  │              │                  │
          │  • tenants       │              │  • Tenant cache  │
          │  • payments      │              │  • Rate limits   │
          │  • usage         │              │  • Session data  │
          │                  │              │                  │
          │  Port: 27017     │              │  Port: 6379      │
          └──────────────────┘              └──────────────────┘
```

---

_Generated on 2026-01-16_
