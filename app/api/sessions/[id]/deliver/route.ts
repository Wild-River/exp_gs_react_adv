// app/api/sessions/[id]/deliver/route.ts
// 保存済みの記録をメールで送る。画面からは id だけを受け取り、中身はDBから読む（書き換えた文章を送らせない）
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { auth, currentUser } from '@clerk/nextjs/server'
import { formatSeconds } from '@/app/practice'
import { escapeHtml, sendReportMail, toEmailHtml } from '@/app/reportMail'

// URLの id が正しい整数かを確認する（/api/sessions/abc/deliver のような呼び出しを弾く）
function parseId(id: string): number | null {
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function POST(
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

  // 自分の記録だけが対象（他人のidを指定されても送らない）
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
  const row = rows[0]
  if (!row)
    return Response.json({ error: '見つかりませんでした' }, { status: 404 })
  if (!row.feedback)
    return Response.json(
      { error: 'この記録には講評がありません。' },
      { status: 400 },
    )

  // currentUser() はメールなど詳細プロフィールまで取りに行く（少し重い）
  const user = await currentUser()
  const to = user?.primaryEmailAddress?.emailAddress
  if (!to)
    return Response.json({ error: 'メールが取得できません' }, { status: 400 })

  // サーバーはUTCで動くことがあるので、日付は日本時間で出す
  const date = row.createdAt.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
  })

  // メール内のリンクは、いま開いているサイトのURLをもとに作る（ローカルなら localhost になる）
  const origin = new URL(request.url).origin
  const detailUrl = `${origin}/history/${row.id}`
  // 共有中の記録だけ共有リンクも載せる。メールのために勝手に共有リンクを作ることはしない
  const shareUrl = row.shareId ? `${origin}/share/${row.shareId}` : null

  const timeText =
    row.durationSec === null
      ? '計測なし'
      : row.limitSec === null
        ? formatSeconds(row.durationSec)
        : `${formatSeconds(row.durationSec)}（目安 ${formatSeconds(row.limitSec)}）`

  const html = `
    <h2>${escapeHtml(row.topic)}（${date}）</h2>
    <p style="margin: 0 0 4px;">笑顔スコア：${row.smileScore === null ? '計測なし' : `${row.smileScore}%`}</p>
    <p style="margin: 0 0 24px;">話した時間：${timeText}</p>
    <h3>コーチのフィードバック</h3>
    ${toEmailHtml(row.feedback)}
    ${
      row.answerText
        ? `<h3>あなたの回答</h3><p style="margin: 0 0 16px; line-height: 1.8;">${escapeHtml(row.answerText).replaceAll('\n', '<br>')}</p>`
        : ''
    }
    <p style="margin: 24px 0 4px;"><a href="${detailUrl}">詳細ページで見る</a>（ログインが必要です）</p>
    ${shareUrl ? `<p style="margin: 0;"><a href="${shareUrl}">共有リンク</a>（ログインなしで見られます）</p>` : ''}
  `

  const error = await sendReportMail({
    to,
    subject: `練習レポート：${row.topic}（${date}）`,
    html,
  })
  if (error) return Response.json({ error }, { status: 500 })

  return Response.json({ ok: true })
}
