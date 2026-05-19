// TODO [HIGH][DevOps]:
// PrismaClient is initialized with no logging or query monitoring config.
// In production, slow queries are completely invisible.
// Fix: Add `log: [{ emit: 'event', level: 'query' }]` in development and
// integrate with a structured logger (pino/winston) or APM (Datadog, New Relic).
// Risk: Slow queries cause degraded UX with no visibility into root cause.

// TODO [HIGH][DevOps]:
// No connection pool configuration. PrismaClient uses default pool settings
// which may be insufficient for concurrent production load.
// Fix: Configure `datasources.db.url` with `?connection_limit=10&pool_timeout=20`
// for PostgreSQL. Consider PgBouncer for high-concurrency scenarios.
// Risk: Connection exhaustion under load causes 503s and data corruption.

// TODO [MEDIUM][Database]:
// No database health check utility exposed. There's no way to verify DB
// connectivity in a health endpoint (/api/health) or during startup.
// Fix: Create /api/health endpoint that runs `prisma.$queryRaw\`SELECT 1\``.
// Risk: Deployment to broken DB state is not detected until users hit errors.

// TODO [MEDIUM][DevOps]:
// The global prisma singleton pattern prevents connection reuse in serverless
// edge runtimes. Verify this is compatible with your deployment target.
// Fix: If deploying to edge (Vercel Edge Functions), use @prisma/adapter-neon
// or a connection pooler like PgBouncer/Supabase for serverless compatibility.
// Risk: Connection limit exhaustion on serverless at scale.

// TODO [LOW][Architecture]:
// No repository/service layer wrapping Prisma. Business logic and DB queries
// are mixed directly in API route handlers, making testing and reuse impossible.
// Fix: Create src/services/ directory with domain services (GameService, UserService,
// MessageService) that encapsulate all Prisma calls. Route handlers call services.
// Risk: Untestable business logic, duplicated queries, impossible to mock for tests.

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// TODO [HIGH][DevOps]: Add structured logging config for production query monitoring.
// In production, use `log: ['error', 'warn']`. In development, also log 'query'.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  // TODO [MEDIUM][DevOps]: Configure connection pooling params here for production.
  // log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
