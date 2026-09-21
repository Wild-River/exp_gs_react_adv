// app/api/deliver/route.ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { Resend } from 'resend'

export async function POST(request: Request) {
  // auth() は id だけを即・軽く取得
  const { userId } = await auth()
  if (!userId)
    return Response.json({ error: 'ログインしてください' }, { status: 401 })

  const { feedback } = await request.json()

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
    html: `<h2>コーチのフィードバック</h2><p>${feedback}</p>`,
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
