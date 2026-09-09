// app/api/sessions/[id]/route.ts
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'

// 1件だけ取得
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params // Next.js16では params は await が必要
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, Number(id)))
  return Response.json(rows[0] ?? null)
}

// 1件 削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  await db.delete(sessions).where(eq(sessions.id, Number(id)))
  return Response.json({ ok: true })
}
