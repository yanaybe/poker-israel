import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()

  let dbStatus: 'ok' | 'error' = 'ok'
  let dbLatencyMs: number | null = null

  try {
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - start
  } catch {
    dbStatus = 'error'
  }

  const healthy = dbStatus === 'ok'

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      version: process.env.npm_package_version ?? '0.1.0',
      db: { status: dbStatus, latencyMs: dbLatencyMs },
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  )
}
