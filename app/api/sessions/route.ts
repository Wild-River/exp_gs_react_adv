// app/api/sessions/route.ts
// 記録の保存は /api/coach が講評を作ったときに行う（講評の文章を画面から受け取って保存しないため）
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'

// 一覧を取得（新しい順）
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'ログインしてください' }, { status: 401 })
  }

  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt))
  return Response.json(rows)
}
