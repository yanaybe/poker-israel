import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const UpdateReportSchema = z.object({
  status: z.enum(['REVIEWED', 'RESOLVED', 'DISMISSED']),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'נא להתחבר' }, { status: 401 })
  if (!session.user.isAdmin) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const parsed = UpdateReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const report = await prisma.report.findUnique({ where: { id: params.id } })
  if (!report) return NextResponse.json({ error: 'הדיווח לא נמצא' }, { status: 404 })

  const updated = await prisma.report.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
    select: { id: true, status: true, updatedAt: true },
  })

  return NextResponse.json(updated)
}
