// app/api/sessions/route.ts
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { desc } from 'drizzle-orm'

// 一覧を取得（新しい順）
export async function GET() {
  const rows = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.createdAt))
  return Response.json(rows)
}

// 1件保存
export async function POST(request: Request) {
  const body = await request.json()
  const userId = 'demo' // ← Day4で本物のログインidに置きかえる

  await db.insert(sessions).values({
    userId,
    topic: body.topic,
    answerText: body.answer,
    smileScore: body.smileScore,
    feedback: body.feedback,
  })

  return Response.json({ ok: true })
}
