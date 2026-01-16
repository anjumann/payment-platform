# Multi-Tenant Payment Platform API

A secure, scalable multi-tenant payment platform built with NestJS, MongoDB, and Redis.

## Features

- **Multi-Tenant Architecture**: Complete data isolation between tenants
- **Flexible Tenant Resolution**: Subdomain, header, or JWT-based identification
- **Tier-Based Limits**: Starter, Professional, and Enterprise tiers
- **Rate Limiting**: Redis-based sliding window algorithm
- **Usage Tracking**: Monthly aggregation for billing

## Tech Stack

- **Backend**: NestJS 10, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis for rate limiting and caching
- **Testing**: Vitest

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- MongoDB and Redis (or use Docker)

### Setup

1. **Start dependencies**:

   ```bash
   docker-compose up -d
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Seed the database**:

   ```bash
   npx ts-node src/scripts/seed.ts
   ```

4. **Start development server**:
   ```bash
   npm run start:dev
   ```

## API Endpoints

### Health Check

```
GET /health
```

### Tenants

```
GET  /api/tenants/current    # Get current tenant
GET  /api/tenants            # List all tenants (admin)
POST /api/tenants            # Create tenant (admin)
```

### Payments

```
POST   /api/payments         # Create payment
GET    /api/payments         # List payments
GET    /api/payments/stats   # Payment statistics
GET    /api/payments/:id     # Get payment by ID
PUT    /api/payments/:id     # Update payment
DELETE /api/payments/:id     # Cancel payment
```

### Usage

```
GET /api/usage/summary       # Current period usage
GET /api/usage/history       # Usage history
GET /api/usage/limit-check   # Check transaction limit
```

## Testing Tenant Resolution

### Via Header

```bash
curl -H "X-Tenant-ID: <api-key>" http://localhost:3000/api/tenants/current
```

### Via Subdomain

```bash
curl -H "Host: bank1.localhost:3000" http://localhost:3000/api/tenants/current
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Request Flow                        │
├─────────────────────────────────────────────────────────┤
│  Request → TenantMiddleware → TenantGuard → RateLimit   │
│                    ↓                                     │
│            TenantContext (AsyncLocalStorage)             │
│                    ↓                                     │
│  Controller → Service → TenantAwareRepository → MongoDB  │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── config/              # Configuration
├── tenants/             # Task A: Tenant resolution
│   ├── schemas/
│   ├── middleware/
│   ├── guards/
│   └── decorators/
├── common/              # Task B: Data isolation
│   ├── schemas/
│   ├── repositories/
│   └── decorators/
├── rate-limiting/       # Task C: Rate limiting
│   ├── guards/
│   └── decorators/
├── usage/               # Task C: Usage tracking
├── payments/            # Domain: Payment operations
└── scripts/             # Utility scripts
```

## License

MIT
