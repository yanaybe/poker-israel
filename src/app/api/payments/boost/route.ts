import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generatePaymentLink, BOOST_OPTIONS } from '@/lib/payplus'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const { gameId, hours } = await req.json()
  if (!gameId || !hours) return NextResponse.json({ error: 'חסרים פרמטרים' }, { status: 400 })

  const game = await prisma.game.findUnique({ where: { id: gameId } })
  if (!game) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
  if (game.hostId !== session.user.id) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const option = BOOST_OPTIONS.find((o) => o.hours === hours)
  if (!option) return NextResponse.json({ error: 'אפשרות לא תקינה' }, { status: 400 })

  try {
    const url = await generatePaymentLink({
      amount: option.amount,
      description: `בוסט ${option.label} — ${game.title}`,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/games/${gameId}?boosted=1`,
      failureUrl: `${process.env.NEXT_PUBLIC_APP_URL}/games/${gameId}`,
      moreInfo: `boost:${gameId}:${hours}`,
    })
    return NextResponse.json({ url })
  } catch (err) {
    console.error('PayPlus boost error:', err)
    return NextResponse.json({ error: 'שגיאה ביצירת קישור תשלום' }, { status: 500 })
  }
}
