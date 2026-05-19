// TODO [HIGH][Security]:
// PayPlus API credentials (PAYPLUS_API_KEY, PAYPLUS_SECRET_KEY) are only referenced
// via process.env with no startup validation. If missing in production, the first
// payment attempt throws a cryptic runtime error.
// Fix: Add startup validation: if (!process.env.PAYPLUS_API_KEY) throw new Error(...)
// Risk: Silent payment failures in production if env vars misconfigured.

// TODO [HIGH][Legal]:
// No VAT (מע"מ, currently 17% in Israel) calculation on payment amounts.
// Subscription (₪199) and boost fees should include or separate VAT for legal compliance.
// Fix: Calculate VAT-inclusive amounts, generate proper tax invoices/receipts.
// Risk: Tax authority non-compliance, potential fines.

// TODO [HIGH][Backend]:
// No retry logic on PayPlus API calls. A transient network failure causes the
// entire payment link generation to fail with no recovery.
// Fix: Wrap fetch call with exponential backoff retry (3 attempts, 1s/2s/4s).
// Risk: Users get payment errors due to transient PayPlus API issues.

// TODO [MEDIUM][Scalability]:
// BOOST_OPTIONS prices are hardcoded in source code. Changing pricing requires
// a code deployment.
// Fix: Move pricing to database table or environment variables.
// Risk: Cannot A/B test pricing, cannot run promotions without code changes.

// TODO [MEDIUM][Backend]:
// No idempotency key on payment link generation. If a user double-clicks,
// two payment links are generated for the same intent.
// Fix: Generate a deterministic idempotency key (userId + gameId + timestamp_bucket)
// and pass to PayPlus if supported.
// Risk: Duplicate payments, user confusion.

// TODO [MEDIUM][Legal]:
// PayPlus is Israel-only. This single-provider approach blocks any future
// expansion to other markets (diaspora communities, EU).
// Fix: Abstract payment processing behind a PaymentProvider interface.
// Implement PayPlusProvider and StripeProvider implementing the same interface.
// Risk: Cannot expand outside Israel without full payment refactor.

// TODO [LOW][Backend]:
// No logging of payment link generation attempts (success/failure).
// Fix: Log all payment events with userId, amount, gameId to structured logger.
// Risk: No audit trail for payment disputes.

const PAYPLUS_BASE = process.env.NODE_ENV === 'production'
  ? 'https://restapi.payplus.co.il/api/v1.0'
  : 'https://restapidev.payplus.co.il/api/v1.0'

function headers() {
  return {
    'Content-Type': 'application/json',
    'api-key': process.env.PAYPLUS_API_KEY!,
    'secret-key': process.env.PAYPLUS_SECRET_KEY!,
  }
}

export async function generatePaymentLink({
  amount,
  description,
  successUrl,
  failureUrl,
  moreInfo,
}: {
  amount: number       // ILS, e.g. 30 = ₪30
  description: string
  successUrl: string
  failureUrl: string
  moreInfo: string     // passed back in webhook payload
}) {
  const res = await fetch(`${PAYPLUS_BASE}/PaymentPages/generateLink`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      payment_page_uid: process.env.PAYPLUS_PAYMENT_PAGE_UID!,
      charge_method: 0,
      amount,
      currency_code: 'ILS',
      refURL_success: successUrl,
      refURL_failure: failureUrl,
      sendEmailApproval: true,
      sendEmailFailure: false,
      more_info: moreInfo,
      items: [{ name: description, quantity: 1, price: amount, discount: 0, vat_type: 0 }],
    }),
  })
  const json = await res.json()
  const link = json?.data?.payment_page_link
  if (!link) throw new Error(json?.results?.description ?? 'PayPlus: failed to generate link')
  return link as string
}

export const BOOST_OPTIONS = [
  { label: '24 שעות', hours: 24, amount: 30 },
  { label: '48 שעות', hours: 48, amount: 50 },
  { label: '7 ימים',  hours: 168, amount: 80 },
] as const

export type BoostHours = 24 | 48 | 168
