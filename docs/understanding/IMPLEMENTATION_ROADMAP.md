# 🗺️ Implementation Roadmap: Multi-Tenant Payment Platform

> A step-by-step guide to building your multi-tenant payment platform

---

## 📊 Assignment Complexity Analysis

### Overall Complexity: **8/10** (Senior Level)

| Task                                | Complexity | Time Estimate  | Why It's Complex                                            |
| ----------------------------------- | ---------- | -------------- | ----------------------------------------------------------- |
| **Task A: Tenant Resolution**       | 6/10       | 4-6 hours      | Multiple resolution strategies, priority handling, caching  |
| **Task B: Data Isolation**          | 9/10       | 8-12 hours     | Security-critical, query interception, aggregation handling |
| **Task C: Rate Limiting**           | 7/10       | 4-6 hours      | Distributed systems, Redis algorithms, atomicity concerns   |
| **Part 2: Architecture Discussion** | 8/10       | 2-3 hours prep | Real-world scenarios, scaling strategies, security auditing |

**Total Estimated Time: 18-27 hours**

---

## 🎯 Phase 0: Project Setup (2-3 hours)

### Step 0.1: Initialize the Monorepo

```bash
# Create Nx workspace (optional but recommended)
npx create-nx-workspace@latest payment-platform --preset=ts

# Or create standalone NestJS app
npx -y @nestjs/cli new payment-platform-api

# Create Next.js frontend
npx -y create-next-app@14 payment-platform-web --typescript --tailwind --app
```

### Step 0.2: Install Core Dependencies

```bash
# Backend dependencies
npm install @nestjs/mongoose mongoose
npm install @nestjs/bullmq bullmq
npm install ioredis
npm install class-validator class-transformer
npm install passport @nestjs/passport passport-jwt

# Dev dependencies
npm install -D vitest @nestjs/testing
```

### Step 0.3: Setup Docker Environment

Create `docker-compose.yml`:

```yaml
version: "3.8"
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  redis_data:
```

### ✅ Checkpoint: Environment Ready

- [ ] NestJS app running on localhost:3000
- [ ] MongoDB connected
- [ ] Redis connected
- [ ] Basic health check endpoint working

---

## 🏗️ Phase 1: Task A - Tenant Context & Resolution (4-6 hours)

### Step 1.1: Create Tenant Schema (30 min)

**File:** `src/tenants/schemas/tenant.schema.ts`

```typescript
// Define the tenant model with all tier configurations
export interface Tenant {
  _id: string;
  slug: string; // 'bank1' for bank1.financeops.com
  name: string; // 'First National Bank'
  tier: "starter" | "professional" | "enterprise";
  domains: string[]; // ['payments.theirbank.com']
  settings: TenantSettings;
  limits: TenantLimits;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Step 1.2: Create Tenant Context Service (1 hour)

**File:** `src/tenants/tenant-context.service.ts`

Purpose: Store tenant info for the current request using `AsyncLocalStorage`

```
┌─────────────────────────────────────────────────────────┐
│  Request comes in                                        │
│         ↓                                                │
│  ┌─────────────────────┐                                │
│  │ AsyncLocalStorage   │ ← Store tenant for this request│
│  │ (Request-Scoped)    │                                │
│  └─────────────────────┘                                │
│         ↓                                                │
│  Any service can access current tenant                   │
│  without passing it through parameters                   │
└─────────────────────────────────────────────────────────┘
```

### Step 1.3: Create Tenant Resolver Service (2 hours)

**File:** `src/tenants/tenant-resolver.service.ts`

Resolution Priority (highest to lowest):

1. JWT claims → Most trusted (authenticated)
2. X-Tenant-ID header → API integrations
3. Subdomain → Web access

```
┌─────────────────────────────────────────────────────────┐
│              Tenant Resolution Flow                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Request: bank1.financeops.com/api/payments             │
│                    ↓                                     │
│  ┌────────────────────────────────────────────┐         │
│  │ 1. Check JWT token for tenantId claim      │         │
│  │    - If found & valid → Use this           │         │
│  └────────────────────────────────────────────┘         │
│                    ↓ (not found)                         │
│  ┌────────────────────────────────────────────┐         │
│  │ 2. Check X-Tenant-ID header                │         │
│  │    - If found & valid → Use this           │         │
│  └────────────────────────────────────────────┘         │
│                    ↓ (not found)                         │
│  ┌────────────────────────────────────────────┐         │
│  │ 3. Extract subdomain from Host header      │         │
│  │    - bank1.financeops.com → 'bank1'        │         │
│  │    - Handle www. prefix                    │         │
│  │    - Handle custom domains                 │         │
│  └────────────────────────────────────────────┘         │
│                    ↓                                     │
│  ┌────────────────────────────────────────────┐         │
│  │ 4. Lookup tenant in DB (with Redis cache)  │         │
│  │    - Cache for 5 minutes                   │         │
│  │    - Verify tenant is active               │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Step 1.4: Create Tenant Middleware (1 hour)

**File:** `src/tenants/middleware/tenant.middleware.ts`

```
Request Lifecycle:
┌──────────┐     ┌────────────────┐     ┌──────────────┐     ┌────────────┐
│ Request  │ →   │ Tenant         │ →   │ Auth Guard   │ →   │ Controller │
│ Arrives  │     │ Middleware     │     │ (Optional)   │     │ Handler    │
└──────────┘     └────────────────┘     └──────────────┘     └────────────┘
                        ↓
                 Resolve tenant
                 Set in context
```

### Step 1.5: Create Tenant Guard (30 min)

**File:** `src/tenants/guards/tenant.guard.ts`

For routes that REQUIRE a valid tenant context.

### ✅ Checkpoint: Task A Complete

- [ ] Tenant middleware resolves from subdomain
- [ ] Tenant middleware resolves from header
- [ ] Tenant middleware resolves from JWT
- [ ] Context accessible in any service
- [ ] Invalid tenant returns 404
- [ ] Tests pass for all resolution methods

---

## 🔒 Phase 2: Task B - Data Isolation Layer (8-12 hours)

### Step 2.1: Create Base Tenant Schema (30 min)

**File:** `src/common/schemas/base-tenant.schema.ts`

All tenant-owned data extends this:

```typescript
export class BaseTenantDocument {
  tenantId: string; // Always required
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // Soft delete
}
```

### Step 2.2: Create Tenant-Aware Repository Base (3-4 hours)

**File:** `src/common/repositories/tenant-aware.repository.ts`

```
┌─────────────────────────────────────────────────────────────┐
│           Tenant-Aware Repository Pattern                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Developer writes:        What actually executes:            │
│  ─────────────────        ─────────────────────              │
│                                                              │
│  repository.find({        repository.find({                 │
│    status: 'active'         tenantId: 'current-tenant', ←──┐│
│  })                         status: 'active',              ││
│                             deletedAt: null                ││
│                           })                                ││
│                                               Auto-injected ┘│
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  repository.create({      repository.create({               │
│    amount: 100              tenantId: 'current-tenant', ←───┐│
│  })                         amount: 100                     ││
│                           })                                ││
│                                               Auto-injected ┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Step 2.3: Implement Query Protection (2-3 hours)

**File:** `src/common/repositories/query-protector.ts`

```
Security: Preventing Tenant Override
────────────────────────────────────

BLOCKED: Malicious query trying to access other tenant:
┌─────────────────────────────────────────────────────────┐
│  repository.find({ tenantId: 'victim-tenant' })         │
│                         ↓                                │
│  ❌ REJECTED: Cannot override tenantId in query filter  │
│  Throws: TenantSecurityException                        │
└─────────────────────────────────────────────────────────┘

BLOCKED: $lookup to non-tenant collections:
┌─────────────────────────────────────────────────────────┐
│  Pipeline: [{ $lookup: { from: 'other_tenant_data' }}]  │
│                         ↓                                │
│  ❌ REJECTED: $lookup must include tenantId match       │
│  Auto-adds: { $match: { tenantId: 'current-tenant' }}   │
└─────────────────────────────────────────────────────────┘
```

### Step 2.4: Handle Cross-Tenant Operations (1 hour)

**File:** `src/common/decorators/bypass-tenant.decorator.ts`

For admin/analytics that need cross-tenant access:

```typescript
@BypassTenantIsolation() // Requires SUPER_ADMIN role
async getGlobalAnalytics() { ... }
```

### Step 2.5: Implement Soft Deletes (1 hour)

**File:** `src/common/repositories/soft-delete.mixin.ts`

```
Soft Delete in Multi-Tenant:
────────────────────────────

1. delete() → Sets deletedAt = new Date()
2. find() → Auto-adds { deletedAt: null } filter
3. findWithDeleted() → Shows all including deleted
4. restore() → Sets deletedAt = null
5. hardDelete() → Actually removes (admin only)

Benefits:
- Audit trail preserved
- Easy recovery
- Tenant can "undo" deletes
```

### ✅ Checkpoint: Task B Complete

- [ ] All CRUD operations auto-inject tenantId
- [ ] Cannot query other tenant's data
- [ ] Aggregation pipelines protected
- [ ] Soft delete works correctly
- [ ] Admin bypass works for authorized users
- [ ] Tests cover all edge cases

---

## ⚡ Phase 3: Task C - Rate Limiting & Usage Tracking (4-6 hours)

### Step 3.1: Choose Rate Limiting Algorithm (Research: 30 min)

```
Sliding Window Log Algorithm (RECOMMENDED)
──────────────────────────────────────────

Why this algorithm?
✓ Fair to all requests
✓ No boundary issues between windows
✓ Precise rate limiting
✓ Works well with Redis

How it works:
┌────────────────────────────────────────────────────────┐
│  Timeline (1 minute window, limit: 60 req/min)         │
│                                                         │
│  Requests stored as timestamps:                         │
│  ├─ 12:00:15 ─┤                                        │
│  ├─ 12:00:23 ─┤                                        │
│  ├─ 12:00:45 ─┤                                        │
│  ├─ 12:01:02 ─┤ ← New request at 12:01:02              │
│                                                         │
│  Sliding window: 12:00:02 → 12:01:02                   │
│  Count requests in window: 4                            │
│  4 < 60 → ✅ ALLOWED                                   │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Step 3.2: Implement Rate Limiter Service (2 hours)

**File:** `src/rate-limiting/rate-limiter.service.ts`

```
Redis Data Structure: Sorted Set
─────────────────────────────────

Key: rate_limit:{tenantId}:{endpoint}
Value: Sorted set of timestamps

Commands (atomic with Lua script):
1. ZREMRANGEBYSCORE - Remove old timestamps
2. ZCARD - Count current requests
3. ZADD - Add new timestamp if allowed
4. EXPIRE - Set TTL for cleanup
```

### Step 3.3: Create Rate Limit Guard (1 hour)

**File:** `src/rate-limiting/guards/rate-limit.guard.ts`

```
Response Headers:
─────────────────
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642089600
Retry-After: 30 (only when limited)
```

### Step 3.4: Implement Usage Tracking (2 hours)

**File:** `src/usage/usage-tracker.service.ts`

```
Redis Structure for Monthly Usage:
──────────────────────────────────

┌─────────────────────────────────────────────────────────┐
│  Hash Key: usage:{tenantId}:2024-01                     │
│  ├── api_calls: 15234                                   │
│  ├── transactions: 892                                  │
│  ├── storage_bytes: 104857600                           │
│  └── bandwidth_bytes: 52428800                          │
│                                                          │
│  TTL: 90 days (for billing reconciliation)              │
└─────────────────────────────────────────────────────────┘

Month Boundary Handling:
─────────────────────────
- Use UTC consistently
- New month = new Redis key
- Old data retained for 90 days
- Billing job reads at month end
```

### Step 3.5: Create Usage Summary Endpoint (30 min)

**File:** `src/usage/usage.controller.ts`

Provides billing-ready usage data:

```json
{
  "tenantId": "bank1",
  "period": "2024-01",
  "usage": {
    "apiCalls": 15234,
    "transactions": 892,
    "limits": {
      "transactions": 50000,
      "percentUsed": 1.78
    }
  }
}
```

### ✅ Checkpoint: Task C Complete

- [ ] Rate limiting enforced per tenant tier
- [ ] Rate limit headers returned
- [ ] Usage tracking working
- [ ] Monthly aggregation accurate
- [ ] Month boundary handled correctly
- [ ] Tests cover edge cases

---

## 🎨 Phase 4: Frontend (Time Permitting)

### Step 4.1: Setup Next.js with Tenant Context

- Tenant detection from subdomain
- Tenant-specific theming

### Step 4.2: Create Basic Payment UI

- Payment form with validation
- Transaction history

---

## 📝 Part 2: Architecture Discussion Prep (2-3 hours)

### Key Topics to Prepare:

1. **Database Sharding Strategy**

   - Document when to shard
   - Explain tenant migration process

2. **Noisy Neighbor Problem**

   - Resource quotas
   - Queue isolation
   - Background job separation

3. **Security Audit Trail**

   - What to log
   - Log structure
   - Retention policy

4. **Migration Scenarios**
   - Large data import strategy
   - Zero-downtime migration
   - Rollback plans

---

## 🎯 Final Checklist

### Code Quality

- [ ] All TypeScript strict mode
- [ ] No `any` types
- [ ] Comments on complex logic
- [ ] Error messages are helpful

### Testing

- [ ] Unit tests for all services
- [ ] Integration tests for critical paths
- [ ] Security tests for tenant isolation

### Documentation

- [ ] README with setup instructions
- [ ] API documentation
- [ ] Architecture decision records

### Ready for Discussion

- [ ] Can explain all design decisions
- [ ] Prepared for edge case questions
- [ ] Have diagrams ready

---

## 📅 Suggested Timeline

| Day   | Focus                              | Hours |
| ----- | ---------------------------------- | ----- |
| Day 1 | Setup + Task A (Tenant Resolution) | 6-8   |
| Day 2 | Task B (Data Isolation)            | 6-8   |
| Day 3 | Task C (Rate Limiting) + Polish    | 6-8   |
| Day 4 | Testing + Architecture Prep        | 4-6   |

**Total: 22-30 hours over 4 days**

---

> 💡 **Pro Tip**: Start with Task A as it's foundational. Tasks B and C depend on having tenant context available. Focus on working code for one complete flow before polishing.
