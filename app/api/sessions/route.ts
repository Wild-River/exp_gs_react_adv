// app/api/sessions/route.ts
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'

// 各項目の文字数上限（text型は無制限なので、サーバー側で必ず上限を設ける）
const MAX_TOPIC_LENGTH = 100
const MAX_ANSWER_LENGTH = 1000
const MAX_FEEDBACK_LENGTH = 5000
const MAX_MEMO_LENGTH = 500

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

// 任意テキスト項目の検証（未入力は null として保存する）
// 戻り値は「検証OKなら値、NGなら false」— 値が null になりうるので false で失敗を表す
function parseOptionalText(value: unknown, max: number): string | null | false {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length > max) return false
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

// 1件保存
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'ログインしてください' }, { status: 401 })
  }

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

  // body: null など、JSONとしては妥当だが中身が無いケースのガード
  const { topic, answer, avgSmile, feedback, memo } = body ?? {}

  // topic はDB側が notNull なので必須。空文字も弾く
  if (
    typeof topic !== 'string' ||
    !topic.trim() ||
    topic.length > MAX_TOPIC_LENGTH
  ) {
    return Response.json(
      { error: `お題は${MAX_TOPIC_LENGTH}文字以内で必ず指定してください。` },
      { status: 400 },
    )
  }

  // 任意テキストの検証（null許容カラムなので、未入力はnullで保存する）
  const answerText = parseOptionalText(answer, MAX_ANSWER_LENGTH)
  if (answerText === false) {
    return Response.json(
      { error: `回答は${MAX_ANSWER_LENGTH}文字以内で入力してください。` },
      { status: 400 },
    )
  }

  const feedbackText = parseOptionalText(feedback, MAX_FEEDBACK_LENGTH)
  if (feedbackText === false) {
    return Response.json(
      {
        error: `フィードバックが長すぎます（${MAX_FEEDBACK_LENGTH}文字以内）。`,
      },
      { status: 400 },
    )
  }

  const memoText = parseOptionalText(memo, MAX_MEMO_LENGTH)
  if (memoText === false) {
    return Response.json(
      { error: `メモは${MAX_MEMO_LENGTH}文字以内で入力してください。` },
      { status: 400 },
    )
  }

  // 笑顔スコアは未計測（null）が正常系。値がある場合だけ型と範囲を確認する
  // typeof だけでは NaN / Infinity を通してしまうので Number.isFinite も見る
  let smileScore: number | null = null
  if (avgSmile !== undefined && avgSmile !== null) {
    if (
      typeof avgSmile !== 'number' ||
      !Number.isFinite(avgSmile) ||
      avgSmile < 0 ||
      avgSmile > 100
    ) {
      return Response.json(
        { error: '笑顔スコアは0〜100の数値で指定してください。' },
        { status: 400 },
      )
    }
    smileScore = Math.round(avgSmile) // 小数で送られても整数カラムに収まるようにする
  }

  // DB接続や制約違反で失敗しうるのでtry/catchで囲む
  try {
    await db.insert(sessions).values({
      userId,
      topic: topic.trim(),
      answerText,
      smileScore,
      feedback: feedbackText,
      memo: memoText,
    })
  } catch (error) {
    console.error('セッションの保存に失敗:', error)
    return Response.json(
      { error: '保存に失敗しました。時間をおいてもう一度お試しください。' },
      { status: 500 },
    )
  }

  return Response.json({ ok: true })
}
