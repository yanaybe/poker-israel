// TODO [CRITICAL][Security]:
// Webhook signature check can be bypassed by omitting the signature header —
// see inline TODO below. Fix is to always reject missing signatures.

// TODO [HIGH][Backend]:
// No idempotency protection. If PayPlus sends the same webhook twice (which
// happens for retry logic), the subscription's currentPeriodEnd gets extended
// an extra 30 days on each duplicate webhook.
// Fix: Store processed transactionUids in a WebhookEvent log table. Return 200
// immediately if the transactionUid was already processed (idempotent handler).
// Risk: Double-processing webhooks gives users extra subscription time for free.

// TODO [HIGH][Backend]:
// moreInfo format is parsed by splitting on ':' with no validation.
// If PayPlus returns a malformed or unexpected moreInfo value, the split produces
// wrong [type, ...parts] values which then attempt invalid DB operations.
// Fix: Validate moreInfo format with regex before processing.
// Risk: Malformed webhook payloads cause silent failures or DB corruption.

// TODO [HIGH][Legal]:
// No receipt/invoice generation on successful payment.
// Israeli law (חשבוניות) requires providing receipts for paid services.
// Fix: Generate a PDF receipt and email it to the user on successful payment.
// Risk: Tax law non-compliance.

// TODO [MEDIUM][Backend]:
// amount is cast as `payload.amount as number ?? 0` — if PayPlus sends amount
// as a string "30.00", this comparison will be wrong and stored amount is 0.
// Fix: Use parseFloat(payload.amount as string) with proper validation.
// Risk: GameBoost records store incorrect amounts, breaking payment reporting.

// TODO [MEDIUM][Backend]:
// On sub webhook, currentPeriodEnd is always set to now+30 days regardless of
// when in the billing cycle the webhook arrives. For re-subscriptions, the period
// end should be based on the previous period end, not "now".
// Fix: Extend from Math.max(currentPeriodEnd, now) + 30 days.
// Risk: Users lose subscription days if they renew early.

// TODO [LOW][DevOps]:
// No webhook replay / retry mechanism. If the DB is down when PayPlus sends
// a webhook, the payment is silently lost.
// Fix: Store raw webhook payload in a WebhookEvent table immediately on receipt,
// then process asynchronously. Retry failed processing with backoff.
// Risk: Failed webhooks during DB downtime = lost payment, subscription not activated.

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

  // TODO [CRITICAL][Security]:
  // Webhook signature verification is SKIPPED when NODE_ENV !== 'production'.
  // If this is ever deployed to staging/dev with a real PayPlus webhook URL,
  // any attacker can send fake payment confirmations and get free premium.
  // Fix: ALWAYS verify the signature regardless of NODE_ENV.
  // Use a separate flag like PAYPLUS_SKIP_SIG_VERIFY=true only for local testing.
  // The current `&& signature` condition also means: if signature header is MISSING,
  // the check is bypassed even in production — an attacker omitting the header
  // gets through the check!
  // Fix: Reject immediately if signature is empty: if (!signature) return 401
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
