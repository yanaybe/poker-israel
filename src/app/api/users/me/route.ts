import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  try {
    const { name, age, city, skillLevel, image } = await req.json()

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name && { name }),
        age: age ?? null,
        city: city ?? null,
        ...(skillLevel && { skillLevel }),
        image: image ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        age: true,
        city: true,
        skillLevel: true,
        image: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'שגיאה בעדכון הפרופיל' }, { status: 500 })
  }
}
