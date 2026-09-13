// app/api/sessions/[id]/route.ts
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId)
    return Response.json({ error: 'ログインしてください' }, { status: 401 })

  const { id } = await params
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, Number(id)), eq(sessions.userId, userId)))

  return Response.json(rows[0] ?? null)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId)
    return Response.json({ error: 'ログインしてください' }, { status: 401 })

  const { id } = await params
  await db
    .delete(sessions)
    .where(and(eq(sessions.id, Number(id)), eq(sessions.userId, userId)))

  return Response.json({ ok: true })
}
