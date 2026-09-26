// app/api/sessions/[id]/route.ts
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { MAX_MEMO_LENGTH, parseOptionalText } from '@/app/practice'

// URLの id が正しい整数かを確認する（/api/sessions/abc のような呼び出しを弾く）
function parseId(id: string): number | null {
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function GET(
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

  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
  if (!rows[0])
    return Response.json({ error: '見つかりませんでした' }, { status: 404 })

  return Response.json(rows[0])
}

// メモを書き直す（講評のあとに書いたメモを、自動保存された記録に追記する）
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId)
    return Response.json({ error: 'ログインしてください' }, { status: 401 })

  const { id } = await params
  const sessionId = parseId(id)
  if (sessionId === null)
    return Response.json({ error: '不正なidです' }, { status: 400 })

  // JSON自体が壊れている場合（parseに失敗）はここで弾く
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'リクエストの形式が不正です。' },
      { status: 400 },
    )
  }

  // メモだけを受け付ける（講評や回答は書き換えさせない）。空にしたときは null で保存する
  const memoText = parseOptionalText(body?.memo, MAX_MEMO_LENGTH)
  if (memoText === false) {
    return Response.json(
      { error: `メモは${MAX_MEMO_LENGTH}文字以内で入力してください。` },
      { status: 400 },
    )
  }

  // 自分の記録だけが対象。更新できた行がなければ、他人の記録か存在しない記録
  try {
    const updated = await db
      .update(sessions)
      .set({ memo: memoText })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
      .returning({ id: sessions.id })
    if (updated.length === 0)
      return Response.json({ error: '見つかりませんでした' }, { status: 404 })
  } catch (error) {
    console.error('メモの保存に失敗:', error)
    return Response.json(
      { error: 'メモの保存に失敗しました。' },
      { status: 500 },
    )
  }

  return Response.json({ ok: true })
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

  // 自分の記録だけが対象。削除できた行がなければ、他人の記録か存在しない記録
  try {
    const deleted = await db
      .delete(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
      .returning({ id: sessions.id })
    if (deleted.length === 0)
      return Response.json({ error: '見つかりませんでした' }, { status: 404 })
  } catch (error) {
    console.error('記録の削除に失敗:', error)
    return Response.json({ error: '削除に失敗しました。' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
