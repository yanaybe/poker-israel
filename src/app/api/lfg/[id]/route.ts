import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })

  const post = await prisma.lfgPost.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
  if (post.userId !== session.user.id) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  await prisma.lfgPost.update({ where: { id: params.id }, data: { status: 'CLOSED' } })
  return NextResponse.json({ closed: true })
}
