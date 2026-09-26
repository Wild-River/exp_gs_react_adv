// app/reportMail.ts
// 練習レポートのメール作成（サーバー側で使う）。/api/sessions/[id]/deliver から使う
import { Resend } from 'resend'

// HTMLとして意味を持つ文字を置き換える（AIの出力に <script> などが混ざっても、ただの文字として表示させる）
export function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// AIの出力（**太字** と空行区切りの段落）を、メール用のHTMLに変換する
export function toEmailHtml(markdown: string) {
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

// 送信する。失敗したときはエラーメッセージ（画面にそのまま出せる文）を返す
export async function sendReportMail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<string | null> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: 'AI練習コーチ <onboarding@resend.dev>',
    // 送り先は**配列（[ ]）**で渡す
    to: [to],
    subject,
    html,
  })
  if (error) {
    console.error('メール送信に失敗:', error)
    return 'メール送信に失敗しました（無料枠では自分の登録メール宛のみ送れます）'
  }
  return null
}
