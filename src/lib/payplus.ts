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
