import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      age: true,
      city: true,
      skillLevel: true,
      image: true,
      createdAt: true,
      _count: {
        select: {
          gamesHosted: true,
          gameRequests: true,
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
  return NextResponse.json(user)
}
