import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generatePaymentLink } from '@/lib/payplus'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  try {
    const url = await generatePaymentLink({
      amount: 199,
      description: 'פוקר ישראל פרמיום — חודש אחד',
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/premium?success=1`,
      failureUrl: `${process.env.NEXT_PUBLIC_APP_URL}/premium?canceled=1`,
      moreInfo: `sub:${session.user.id}`,
    })
    return NextResponse.json({ url })
  } catch (err) {
    console.error('PayPlus subscribe error:', err)
    return NextResponse.json({ error: 'שגיאה ביצירת קישור תשלום' }, { status: 500 })
  }
}
