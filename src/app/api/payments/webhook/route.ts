import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'

// PayPlus sends: POST with JSON body
// Signature header: x-payplus-signature (HMAC-SHA256 of raw body with secret-key)
// Payload fields: transaction_uid, more_info, status, amount, ...

function verifySignature(rawBody: string, signature: string): boolean {
  const computed = crypto
    .createHmac('sha256', process.env.PAYPLUS_SECRET_KEY!)
    .update(rawBody)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-payplus-signature') ?? ''

  // Skip signature check in dev; enforce in production
  if (process.env.NODE_ENV === 'production' && signature && !verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const status = (payload.status as string)?.toLowerCase()
  const moreInfo = payload.more_info as string | undefined
  const transactionUid = payload.transaction_uid as string | undefined

  // Only process successful payments
  if (status !== 'success' && status !== 'approved') {
    return NextResponse.json({ ok: true })
  }

  if (!moreInfo || !transactionUid) return NextResponse.json({ ok: true })

  try {
    const [type, ...parts] = moreInfo.split(':')

    if (type === 'boost') {
      const [gameId, hoursStr] = parts
      const hours = parseInt(hoursStr)
      const boostedUntil = new Date(Date.now() + hours * 3600000)
      const game = await prisma.game.findUnique({ where: { id: gameId }, select: { hostId: true } })
      if (!game) return NextResponse.json({ ok: true })

      await prisma.gameBoost.upsert({
        where: { gameId },
        create: {
          gameId,
          hostId: game.hostId,
          payplusTransactionUid: transactionUid,
          boostedUntil,
          amount: payload.amount as number ?? 0,
        },
        update: {
          payplusTransactionUid: transactionUid,
          boostedUntil,
          amount: payload.amount as number ?? 0,
        },
      })
    }

    if (type === 'sub') {
      const [userId] = parts
      const currentPeriodEnd = new Date()
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30)

      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          payplusToken: transactionUid,
          status: 'active',
          currentPeriodEnd,
        },
        update: {
          payplusToken: transactionUid,
          status: 'active',
          currentPeriodEnd,
        },
      })
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
