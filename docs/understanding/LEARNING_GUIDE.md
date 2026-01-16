# 📚 Complete Learning Guide: Multi-Tenant Payment Platform

> Everything you need to understand this assignment, explained two ways:
>
> - 🧒 **Like You're 5**: Simple analogies and easy concepts
> - 💼 **Senior Level**: Technical depth and production considerations

---

## Table of Contents

1. [What is Multi-Tenancy?](#1-what-is-multi-tenancy)
2. [The Tech Stack Explained](#2-the-tech-stack-explained)
3. [Task A: Tenant Context & Resolution](#3-task-a-tenant-context--resolution)
4. [Task B: Data Isolation](#4-task-b-data-isolation)
5. [Task C: Rate Limiting & Usage Tracking](#5-task-c-rate-limiting--usage-tracking)
6. [Architecture Concepts](#6-architecture-concepts)
7. [Key Design Patterns Used](#7-key-design-patterns-used)
8. [Common Interview Questions](#8-common-interview-questions)

---

# 1. What is Multi-Tenancy?

## 🧒 Like You're 5

Imagine a big apartment building:

- The **building** is your application
- Each **apartment** is a tenant (like a bank)
- Each apartment has its own **locked door** (security)
- They share the **elevator and lobby** (shared infrastructure)
- But they can NEVER enter each other's apartments (data isolation)

The building owner (you, the developer) manages the whole building, but tenants (banks) only see their own space.

```
🏢 The Payment Platform Building

   Floor 3: 🏦 Big Bank Inc.
            [Their own customers, payments, settings]

   Floor 2: 🏪 Small Credit Union
            [Their own customers, payments, settings]

   Floor 1: 💳 Payment Startup
            [Their own customers, payments, settings]

   Lobby:   🔐 Security Guard (Tenant Resolution)
            "Which floor are you going to?"
```

## 💼 Senior Level

**Multi-tenancy** is a software architecture where a single application instance serves multiple customers (tenants), with each tenant's data and configuration logically isolated.

### Architecture Patterns:

| Pattern                              | Description                                                | Isolation | Cost    | Complexity |
| ------------------------------------ | ---------------------------------------------------------- | --------- | ------- | ---------- |
| **Shared Database, Shared Schema**   | All tenants in same tables, separated by `tenantId` column | Lowest    | Lowest  | Medium     |
| **Shared Database, Separate Schema** | Same DB, different schema per tenant                       | Medium    | Medium  | Medium     |
| **Separate Database**                | Each tenant gets own database                              | Highest   | Highest | High       |
| **Hybrid**                           | Small tenants share, large tenants isolated                | Variable  | Optimal | Highest    |

### This Assignment Uses: **Shared Database, Shared Schema**

Why?

- Cost-effective for many tenants
- Simpler operations (one DB to backup/upgrade)
- Requires robust application-level isolation

**Critical Concern**: Application bugs can leak data between tenants. This is why Task B (Data Isolation) is the most complex.

---

# 2. The Tech Stack Explained

## 2.1 NestJS

### 🧒 Like You're 5

Think of NestJS as a **LEGO instruction book** for building servers. It tells you exactly where each piece goes, so everyone builds things the same way. This makes it easy to understand what others built.

### 💼 Senior Level

NestJS is a progressive Node.js framework built with TypeScript, inspired by Angular. Key concepts:

```typescript
// Module: Groups related functionality
@Module({
  imports: [DatabaseModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}

// Controller: Handles HTTP requests
@Controller("payments")
export class PaymentController {
  @Post()
  create(@Body() dto: CreatePaymentDto) {}
}

// Service: Business logic
@Injectable()
export class PaymentService {
  create(dto: CreatePaymentDto) {}
}
```

**Key Features for This Assignment**:

- **Dependency Injection**: Services automatically provided where needed
- **Middleware**: Perfect for tenant resolution on every request
- **Guards**: For authentication and rate limiting
- **Interceptors**: For logging, transformation, error handling

---

## 2.2 MongoDB with Mongoose

### 🧒 Like You're 5

MongoDB is like a **filing cabinet** where you can put any paper in any folder. You don't need to decide the folder shape beforehand. Mongoose is like a **secretary** who makes sure papers go in the right place and look correct.

### 💼 Senior Level

MongoDB is a document-oriented NoSQL database. Mongoose provides:

```typescript
// Schema: Define document structure
const PaymentSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "completed", "failed"] },
  createdAt: { type: Date, default: Date.now },
});

// Indexes crucial for multi-tenant queries
PaymentSchema.index({ tenantId: 1, createdAt: -1 });

// Middleware (hooks) for automatic tenantId injection
PaymentSchema.pre("save", function (next) {
  // Perfect place to ensure tenantId is set
  next();
});
```

**Multi-Tenant Considerations**:

- **Compound Indexes**: Always include `tenantId` first
- **Query Patterns**: All queries should hit tenantId index
- **Aggregations**: Must include `$match: { tenantId }` early in pipeline

---

## 2.3 Redis

### 🧒 Like You're 5

Redis is like a **super-fast whiteboard**. Writing and reading is instant! But if you turn off the lights (server restart), some notes might disappear. It's perfect for:

- "How many times has this person asked?" (rate limiting)
- "What's this tenant's info again?" (caching)

### 💼 Senior Level

Redis is an in-memory data structure store. For this assignment:

```
Use Cases in Multi-Tenant Platform:
───────────────────────────────────

1. RATE LIMITING (Sorted Sets)
   Key: ratelimit:tenant123:api
   Value: Timestamps of requests
   Commands: ZADD, ZRANGEBYSCORE, ZCARD

2. CACHING (Strings/Hashes)
   Key: tenant:bank1
   Value: Tenant configuration
   TTL: 5 minutes

3. USAGE TRACKING (Hashes)
   Key: usage:tenant123:2024-01
   Fields: api_calls, transactions
   Commands: HINCRBY

4. DISTRIBUTED LOCKS (Strings)
   Key: lock:tenant123:migration
   Commands: SET NX EX
```

**Production Considerations**:

- Use Redis Cluster for high availability
- Set appropriate maxmemory policies
- Use Lua scripts for atomic operations

---

## 2.4 BullMQ

### 🧒 Like You're 5

BullMQ is like a **to-do list** that remembers everything. If you write "send email later," it will definitely send that email, even if you go to sleep. It never forgets!

### 💼 Senior Level

BullMQ is a Redis-based queue for Node.js:

```typescript
// Producer: Add job to queue
await this.paymentQueue.add(
  "process-payment",
  {
    tenantId: "bank1",
    paymentId: "pay_123",
    amount: 1000,
  },
  {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  }
);

// Consumer: Process jobs
@Processor("payments")
export class PaymentProcessor {
  @Process("process-payment")
  async handlePayment(job: Job) {
    // CRITICAL: Set tenant context from job.data.tenantId
    const { tenantId, paymentId } = job.data;
    // Process payment...
  }
}
```

**Multi-Tenant Queue Patterns**:

- Include `tenantId` in every job payload
- Consider separate queues for high-volume tenants
- Use priority queues for enterprise customers

---

# 3. Task A: Tenant Context & Resolution

## 🧒 Like You're 5

When someone walks into the apartment building, the security guard asks: **"Which apartment are you visiting?"**

They might know this from:

1. **A key card** (JWT token) - Most trusted!
2. **A visitor badge** (Header) - For delivery people
3. **The button they press** (Subdomain) - Which floor?

The guard remembers this for the whole visit, so every room they enter knows who they're visiting.

```
Person arrives → Guard checks → "Ah, visiting Apartment 3!" →
Everyone knows for this visit: "They're with Apartment 3"
```

## 💼 Senior Level

### Resolution Strategy Implementation

```typescript
@Injectable()
export class TenantResolverService {
  async resolveTenant(request: Request): Promise<Tenant> {
    // Priority 1: JWT Claims (most secure - authenticated)
    const jwtTenant = this.resolveFromJwt(request);
    if (jwtTenant) return this.validateAndCache(jwtTenant);

    // Priority 2: X-Tenant-ID Header (API clients)
    const headerTenant = request.headers["x-tenant-id"];
    if (headerTenant) return this.validateAndCache(headerTenant);

    // Priority 3: Subdomain (web access)
    const subdomain = this.extractSubdomain(request.hostname);
    if (subdomain) return this.validateAndCache(subdomain);

    throw new TenantNotFoundException();
  }

  private extractSubdomain(hostname: string): string | null {
    // Handle: www.bank1.financeops.com → bank1
    // Handle: bank1.financeops.com:3000 → bank1
    // Handle: payments.theirbank.com → lookup custom domain

    const host = hostname.split(":")[0]; // Remove port
    const parts = host.split(".");

    // Check for custom domain first
    const customDomain = await this.lookupCustomDomain(host);
    if (customDomain) return customDomain.tenantSlug;

    // Extract subdomain (skip 'www')
    let subdomain = parts[0];
    if (subdomain === "www" && parts.length > 3) {
      subdomain = parts[1];
    }

    // Ignore if it's the main domain
    if (subdomain === "financeops") return null;

    return subdomain;
  }
}
```

### Tenant Context with AsyncLocalStorage

```typescript
import { AsyncLocalStorage } from "async_hooks";

@Injectable()
export class TenantContextService {
  private static storage = new AsyncLocalStorage<TenantContext>();

  // Run code within tenant context
  run<T>(tenant: Tenant, fn: () => T): T {
    return TenantContextService.storage.run(
      { tenant, requestId: generateId() },
      fn
    );
  }

  // Get current tenant (from anywhere in the call stack!)
  getCurrentTenant(): Tenant {
    const context = TenantContextService.storage.getStore();
    if (!context) {
      throw new TenantContextNotSetException();
    }
    return context.tenant;
  }
}
```

### Caching Strategy

```typescript
@Injectable()
export class TenantCacheService {
  constructor(private readonly redis: Redis) {}

  async getOrFetch(identifier: string): Promise<Tenant> {
    // Try cache first
    const cached = await this.redis.get(`tenant:${identifier}`);
    if (cached) return JSON.parse(cached);

    // Fetch from database
    const tenant = await this.tenantModel.findOne({
      $or: [{ slug: identifier }, { domains: identifier }, { _id: identifier }],
    });

    if (!tenant) throw new TenantNotFoundException(identifier);

    // Cache for 5 minutes
    await this.redis.setex(`tenant:${identifier}`, 300, JSON.stringify(tenant));

    return tenant;
  }

  // Invalidate when tenant is updated
  async invalidate(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`tenant:*${tenantId}*`);
    if (keys.length) await this.redis.del(...keys);
  }
}
```

---

# 4. Task B: Data Isolation

## 🧒 Like You're 5

In our apartment building, each apartment has a **magic filing cabinet**. When anyone opens it:

- It ONLY shows papers from their apartment
- When they add a paper, it automatically gets their apartment number

Even if a sneaky person tries to write someone else's apartment number, the cabinet says **"NO! Nice try!"** and stops them.

```
📁 Magic Filing Cabinet

You (Apartment 3): "Show me all payments"
Cabinet: *only shows Apartment 3's payments*

Sneaky person: "Show me Apartment 5's payments!"
Cabinet: "🚫 ACCESS DENIED" *alarm sounds*
```

## 💼 Senior Level

### Repository Pattern with Automatic Tenant Injection

```typescript
@Injectable()
export abstract class TenantAwareRepository<T extends BaseTenantDocument> {
  constructor(
    protected readonly model: Model<T>,
    protected readonly tenantContext: TenantContextService
  ) {}

  // All queries automatically filtered by tenant
  async find(filter: FilterQuery<T> = {}): Promise<T[]> {
    const safeFilter = this.injectTenantFilter(filter);
    return this.model.find(safeFilter).exec();
  }

  // All creates automatically get tenantId
  async create(data: Partial<T>): Promise<T> {
    const tenantId = this.tenantContext.getCurrentTenant()._id;

    // Prevent override attempt
    if (data.tenantId && data.tenantId !== tenantId) {
      throw new TenantSecurityException(
        "Attempted to create document with different tenantId"
      );
    }

    return this.model.create({
      ...data,
      tenantId,
    });
  }

  private injectTenantFilter(filter: FilterQuery<T>): FilterQuery<T> {
    const tenantId = this.tenantContext.getCurrentTenant()._id;

    // SECURITY: Detect and block tenantId override attempts
    if (filter.tenantId && filter.tenantId !== tenantId) {
      throw new TenantSecurityException(
        `Attempted to query with unauthorized tenantId: ${filter.tenantId}`
      );
    }

    return {
      ...filter,
      tenantId,
      deletedAt: null, // Soft delete filter
    };
  }
}
```

### Aggregation Pipeline Protection

```typescript
async aggregate(pipeline: PipelineStage[]): Promise<any[]> {
  const tenantId = this.tenantContext.getCurrentTenant()._id;

  // Ensure tenant filter is first stage
  const safePipeline: PipelineStage[] = [
    { $match: { tenantId, deletedAt: null } },
    ...this.sanitizePipeline(pipeline),
  ];

  return this.model.aggregate(safePipeline).exec();
}

private sanitizePipeline(pipeline: PipelineStage[]): PipelineStage[] {
  return pipeline.map(stage => {
    // Check for $lookup stages
    if ('$lookup' in stage) {
      const lookup = stage.$lookup;

      // Ensure $lookup has tenant filter in pipeline
      if (lookup.pipeline) {
        lookup.pipeline = [
          { $match: { tenantId: this.tenantContext.getCurrentTenant()._id } },
          ...lookup.pipeline,
        ];
      } else {
        // Convert simple $lookup to pipeline format with tenant filter
        stage.$lookup = {
          from: lookup.from,
          let: { ...lookup.let, foreignTenantId: '$tenantId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$tenantId', '$$foreignTenantId'] } } },
            { $match: { [lookup.foreignField]: `$$${lookup.localField}` } },
          ],
          as: lookup.as,
        };
      }
    }

    return stage;
  });
}
```

### Cross-Tenant Access for Admins

```typescript
// Decorator for bypassing tenant isolation
export function BypassTenantIsolation(): MethodDecorator {
  return SetMetadata(BYPASS_TENANT_KEY, true);
}

// Guard to validate bypass permission
@Injectable()
export class TenantBypassGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const bypass = this.reflector.get<boolean>(
      BYPASS_TENANT_KEY,
      context.getHandler()
    );

    if (!bypass) return true;

    const user = context.switchToHttp().getRequest().user;

    // Only super admins can bypass
    if (!user.roles.includes("SUPER_ADMIN")) {
      throw new ForbiddenException(
        "Only super admins can access cross-tenant data"
      );
    }

    // Log for audit trail
    this.auditLogger.warn({
      event: "TENANT_BYPASS",
      userId: user.id,
      endpoint: context.getHandler().name,
    });

    return true;
  }
}
```

---

# 5. Task C: Rate Limiting & Usage Tracking

## 🧒 Like You're 5

### Rate Limiting

Imagine a cookie jar with a rule: **"Only 3 cookies per hour!"**

Every time you take a cookie, Mom writes down the time. When you ask for another cookie, she checks: "Did you already have 3 cookies in the last hour?"

- If yes: "No more cookies! Wait 20 minutes."
- If no: "Here's your cookie!" _writes down time_

### Usage Tracking

At the end of each month, Mom counts: "You ate 87 cookies this month!" This is for knowing how many cookies to buy (billing).

## 💼 Senior Level

### Sliding Window Rate Limiting with Redis

```typescript
@Injectable()
export class RateLimiterService {
  constructor(private readonly redis: Redis) {}

  async checkLimit(
    tenantId: string,
    limit: number,
    windowMs: number = 60000
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${tenantId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Lua script for atomic operation
    const luaScript = `
      -- Remove expired entries
      redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
      
      -- Count current entries
      local count = redis.call('ZCARD', KEYS[1])
      
      if count < tonumber(ARGV[2]) then
        -- Under limit: add new entry
        redis.call('ZADD', KEYS[1], ARGV[3], ARGV[3])
        redis.call('EXPIRE', KEYS[1], ARGV[4])
        return {1, count + 1}
      else
        -- Over limit: return remaining time
        local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
        local resetTime = oldest[2] + ARGV[5]
        return {0, count, resetTime}
      end
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      key,
      windowStart, // ARGV[1]: window start
      limit, // ARGV[2]: max requests
      now, // ARGV[3]: current timestamp
      Math.ceil(windowMs / 1000), // ARGV[4]: TTL in seconds
      windowMs // ARGV[5]: window size for reset calc
    );

    const [allowed, count, resetTime] = result as number[];

    return {
      allowed: allowed === 1,
      remaining: Math.max(0, limit - count),
      resetAt: resetTime ? new Date(resetTime) : undefined,
      limit,
    };
  }
}
```

### Rate Limit Guard

```typescript
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly tenantContext: TenantContextService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tenant = this.tenantContext.getCurrentTenant();
    const res = context.switchToHttp().getResponse();

    const result = await this.rateLimiter.checkLimit(
      tenant._id,
      tenant.limits.apiRateLimit
    );

    // Always set headers
    res.setHeader("X-RateLimit-Limit", result.limit);
    res.setHeader("X-RateLimit-Remaining", result.remaining);

    if (!result.allowed) {
      res.setHeader(
        "Retry-After",
        Math.ceil((result.resetAt!.getTime() - Date.now()) / 1000)
      );
      throw new HttpException(
        "Rate limit exceeded",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}
```

### Usage Tracking

```typescript
@Injectable()
export class UsageTrackerService {
  constructor(private readonly redis: Redis) {}

  private getMonthKey(tenantId: string): string {
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1
    ).padStart(2, "0")}`;
    return `usage:${tenantId}:${month}`;
  }

  async trackApiCall(tenantId: string): Promise<void> {
    const key = this.getMonthKey(tenantId);
    await this.redis
      .multi()
      .hincrby(key, "api_calls", 1)
      .expire(key, 90 * 24 * 60 * 60) // 90 days retention
      .exec();
  }

  async trackTransaction(tenantId: string, amount: number): Promise<void> {
    const key = this.getMonthKey(tenantId);
    await this.redis
      .multi()
      .hincrby(key, "transactions", 1)
      .hincrbyfloat(key, "transaction_volume", amount)
      .expire(key, 90 * 24 * 60 * 60)
      .exec();
  }

  async getUsageSummary(tenantId: string): Promise<UsageSummary> {
    const key = this.getMonthKey(tenantId);
    const data = await this.redis.hgetall(key);

    return {
      tenantId,
      period: key.split(":")[2],
      apiCalls: parseInt(data.api_calls || "0", 10),
      transactions: parseInt(data.transactions || "0", 10),
      transactionVolume: parseFloat(data.transaction_volume || "0"),
    };
  }
}
```

---

# 6. Architecture Concepts

## 6.1 Noisy Neighbor Problem

### 🧒 Like You're 5

What if one apartment throws a HUGE party with 1000 people? The elevator gets stuck, the water runs out, and nobody else can use anything!

We need rules:

- "Maximum 50 party guests per apartment"
- "Use your own party elevator for big events"

### 💼 Senior Level

**Problem**: One tenant consuming excessive resources affects others.

**Solutions**:

| Strategy                   | Implementation                          | Trade-offs                        |
| -------------------------- | --------------------------------------- | --------------------------------- |
| **Resource Quotas**        | Hard limits on CPU, memory, connections | May block legitimate high-traffic |
| **Queue Isolation**        | Separate queues for large tenants       | Operational complexity            |
| **Database Sharding**      | Dedicated database for whale tenants    | Migration complexity              |
| **Request Prioritization** | QoS levels based on tier                | Complexity in implementation      |

```typescript
// Example: Queue isolation for enterprise tenants
async addPaymentJob(tenant: Tenant, data: PaymentData) {
  const queueName = tenant.tier === 'enterprise'
    ? `payments-${tenant._id}` // Dedicated queue
    : 'payments-shared';       // Shared queue

  await this.bullQueue.add(queueName, data);
}
```

---

## 6.2 Database Connection Pooling

### 🧒 Like You're 5

Imagine the apartment building only has 10 water pipes. If one apartment uses all 10 for their pool, nobody else gets water!

Solution: Each apartment gets assigned 2 pipes maximum.

### 💼 Senior Level

```typescript
// Per-tenant connection pooling
@Injectable()
export class TenantDatabaseService {
  private connections = new Map<string, mongoose.Connection>();

  async getConnection(tenantId: string): Promise<mongoose.Connection> {
    if (this.connections.has(tenantId)) {
      return this.connections.get(tenantId)!;
    }

    const tenant = await this.getTenantConfig(tenantId);

    const connection = await mongoose.createConnection(tenant.dbUri, {
      maxPoolSize: this.getPoolSize(tenant.tier),
      minPoolSize: 2,
    });

    this.connections.set(tenantId, connection);
    return connection;
  }

  private getPoolSize(tier: TenantTier): number {
    switch (tier) {
      case "enterprise":
        return 20;
      case "professional":
        return 10;
      case "starter":
        return 5;
    }
  }
}
```

---

# 7. Key Design Patterns Used

## 7.1 Repository Pattern

**Purpose**: Abstract database access, making tenant isolation transparent.

```typescript
// Developers use this:
const payments = await paymentRepository.find({ status: "pending" });

// Behind the scenes:
// SELECT * FROM payments WHERE status='pending' AND tenantId='current' AND deletedAt IS NULL
```

## 7.2 Strategy Pattern

**Purpose**: Different tenant resolution strategies.

```typescript
interface TenantResolutionStrategy {
  resolve(request: Request): Promise<string | null>;
  priority: number;
}

class JwtResolutionStrategy implements TenantResolutionStrategy {
  priority = 1; // Highest
  async resolve(request) {
    /* ... */
  }
}

class HeaderResolutionStrategy implements TenantResolutionStrategy {
  priority = 2;
  async resolve(request) {
    /* ... */
  }
}
```

## 7.3 Decorator Pattern

**Purpose**: Add tenant behavior to existing services.

```typescript
@TenantScoped() // Decorator ensures tenant context
@Injectable()
export class PaymentService {
  // All methods automatically tenant-aware
}
```

---

# 8. Common Interview Questions

## Quick Answers Prep

| Question                                        | Key Points                                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| "How do you prevent tenant data leaks?"         | Repository layer, query interception, aggregation sanitization, audit logging          |
| "What if a tenant outgrows shared DB?"          | Migration strategy: pause writes → copy data → switch connection → verify → delete old |
| "How to handle 1000+ tenants?"                  | Caching, connection pooling, database sharding, async processing                       |
| "How do you audit cross-tenant access?"         | Structured logging, decorator-based bypass tracking, immutable audit log               |
| "Sliding window vs fixed window rate limiting?" | Sliding = no burst at boundaries, slightly more complex, fair distribution             |
| "How to handle month boundary in usage?"        | UTC timestamps, new key per month, overlap period for late-arriving events             |

---

## 🎓 Summary

This assignment tests:

1. **System Design** - Can you architect a multi-tenant system?
2. **Security Mindset** - Can you prevent data leaks?
3. **Distributed Systems** - Can you use Redis correctly?
4. **Code Quality** - Is your code production-ready?
5. **Communication** - Can you explain your decisions?

**Remember**: Working code > Complete coverage. Show you understand the problems even if you don't solve everything.

---

> 💡 **Final Tip**: During the discussion, always mention trade-offs. There's rarely a "perfect" solution—showing you understand the trade-offs demonstrates senior-level thinking.
