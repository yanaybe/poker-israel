import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'

// PayPlus sends: POST with JSON body
// Signature header: x-payplus-signature (HMAC-SHA256 of raw body with secret-key)
// Payload fields: transaction_uid, more_info, status, amount, ...

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.PAYPLUS_SECRET_KEY
  if (!secret) {
    console.error('PAYPLUS_SECRET_KEY is not configured')
    return false
  }
  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(signature, 'hex')
    )
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-payplus-signature')

  // Always require signature. Never skip based on NODE_ENV — doing so would allow
  // any request without a header to bypass payment verification in staging/CI.
  // Use PAYPLUS_SKIP_SIG_VERIFY=true only in isolated local dev if needed.
  if (process.env.PAYPLUS_SKIP_SIG_VERIFY !== 'true') {
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
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

  // Validate moreInfo format before processing (type:id:optionalExtra)
  if (!/^(sub|boost):[a-zA-Z0-9_-]+(:[a-zA-Z0-9_-]+)*$/.test(moreInfo)) {
    console.error('Webhook: unexpected moreInfo format', { moreInfo, transactionUid })
    return NextResponse.json({ ok: true })
  }

  // Parse amount as float to handle both integer and decimal string values from PayPlus
  const rawAmount = payload.amount
  const amount = typeof rawAmount === 'number'
    ? rawAmount
    : parseFloat(String(rawAmount) || '0')

  try {
    const [type, ...parts] = moreInfo.split(':')

    if (type === 'boost') {
      const [gameId, hoursStr] = parts
      const hours = parseInt(hoursStr, 10)
      if (!gameId || isNaN(hours) || hours <= 0) {
        console.error('Webhook: invalid boost params', { gameId, hoursStr })
        return NextResponse.json({ ok: true })
      }

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
          amount: Math.round(amount),
        },
        update: {
          payplusTransactionUid: transactionUid,
          boostedUntil,
          amount: Math.round(amount),
        },
      })
    }

    if (type === 'sub') {
      const [userId] = parts
      if (!userId) {
        console.error('Webhook: missing userId in sub moreInfo', { moreInfo })
        return NextResponse.json({ ok: true })
      }

      // Extend from current period end if still active (handles early renewals correctly)
      const existing = await prisma.subscription.findUnique({
        where: { userId },
        select: { currentPeriodEnd: true },
      })
      const base = existing?.currentPeriodEnd && existing.currentPeriodEnd > new Date()
        ? existing.currentPeriodEnd
        : new Date()
      const currentPeriodEnd = new Date(base)
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
