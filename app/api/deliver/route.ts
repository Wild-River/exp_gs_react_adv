// app/api/deliver/route.ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { Resend } from 'resend'

// メールに載せるフィードバックの上限（フィードバックは200字程度。余裕を持って上限を設ける）
const MAX_FEEDBACK_LENGTH = 5000

// HTMLとして意味を持つ文字を置き換える（AIの出力に <script> などが混ざっても、ただの文字として表示させる）
function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// AIの出力（**太字** と空行区切りの段落）を、メール用のHTMLに変換する
function toEmailHtml(markdown: string) {
  return markdown
    .trim()
    .split(/\n\s*\n/) // 空行で段落に分ける
    .map((paragraph) => {
      const html = escapeHtml(paragraph.trim())
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // **〜** を太字に
        .replaceAll('\n', '<br>') // 段落内の改行はそのまま改行に
      return `<p style="margin: 0 0 16px; line-height: 1.8;">${html}</p>`
    })
    .join('')
}

export async function POST(request: Request) {
  // auth() は id だけを即・軽く取得
  const { userId } = await auth()
  if (!userId)
    return Response.json({ error: 'ログインしてください' }, { status: 401 })

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

  // feedbackが空／文字列でない／長すぎるケースのガード
  const { feedback } = body ?? {}
  if (typeof feedback !== 'string' || !feedback.trim()) {
    return Response.json(
      { error: '送るフィードバックがありません。' },
      { status: 400 },
    )
  }
  if (feedback.length > MAX_FEEDBACK_LENGTH) {
    return Response.json(
      {
        error: `フィードバックが長すぎます（${MAX_FEEDBACK_LENGTH}文字以内）。`,
      },
      { status: 400 },
    )
  }

  // currentUser() はメールなど詳細プロフィールまで取りに行く（少し重い）
  const user = await currentUser()
  const to = user?.primaryEmailAddress?.emailAddress
  if (!to)
    return Response.json({ error: 'メールが取得できません' }, { status: 400 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: 'AI練習コーチ <onboarding@resend.dev>',
    // 送り先は**配列（[ ]）**で渡す
    to: [to],
    subject: 'きょうの練習レポート',
    html: `<h2>コーチのフィードバック</h2>${toEmailHtml(feedback)}`,
  })

  if (error) {
    return Response.json(
      {
        error:
          'メール送信に失敗しました（無料枠では自分の登録メール宛のみ送れます）',
      },
      { status: 500 },
    )
  }
  return Response.json({ ok: true })
}
