import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Cancel subscription — keeps premium until currentPeriodEnd, then expires naturally
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } })
  if (!sub || sub.status !== 'active') return NextResponse.json({ error: 'אין מנוי פעיל' }, { status: 404 })

  await prisma.subscription.update({
    where: { userId: session.user.id },
    data: { status: 'canceled' },
  })

  return NextResponse.json({ canceled: true, activeUntil: sub.currentPeriodEnd })
}
