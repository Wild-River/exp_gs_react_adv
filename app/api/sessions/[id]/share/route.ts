// app/api/sessions/[id]/share/route.ts
// 共有リンクの発行（POST）と取り消し（DELETE）
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'

// URLの id が正しい整数かを確認する（/api/sessions/abc/share のような呼び出しを弾く）
function parseId(id: string): number | null {
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId)
    return Response.json({ error: 'ログインしてください' }, { status: 401 })

  const { id } = await params
  const sessionId = parseId(id)
  if (sessionId === null)
    return Response.json({ error: '不正なidです' }, { status: 400 })

  // 自分の記録だけが対象（他人のidを指定されても共有リンクは作らせない）
  const rows = await db
    .select({ shareId: sessions.shareId })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
  const row = rows[0]
  if (!row)
    return Response.json({ error: '見つかりませんでした' }, { status: 404 })

  // すでに発行済みなら同じリンクを返す（押すたびにURLが変わらないように）
  if (row.shareId) return Response.json({ shareId: row.shareId })

  const shareId = crypto.randomUUID()
  try {
    await db
      .update(sessions)
      .set({ shareId })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
  } catch (error) {
    console.error('共有リンクの発行に失敗:', error)
    return Response.json(
      { error: '共有リンクの発行に失敗しました。' },
      { status: 500 },
    )
  }

  return Response.json({ shareId })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId)
    return Response.json({ error: 'ログインしてください' }, { status: 401 })

  const { id } = await params
  const sessionId = parseId(id)
  if (sessionId === null)
    return Response.json({ error: '不正なidです' }, { status: 400 })

  // トークンを消せば、共有していたリンクはもう開けなくなる
  try {
    await db
      .update(sessions)
      .set({ shareId: null })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
  } catch (error) {
    console.error('共有の停止に失敗:', error)
    return Response.json(
      { error: '共有の停止に失敗しました。' },
      { status: 500 },
    )
  }

  return Response.json({ ok: true })
}
