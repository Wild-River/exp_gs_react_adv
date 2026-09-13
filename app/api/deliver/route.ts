// app/api/deliver/route.ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { Resend } from 'resend'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId)
    return Response.json({ error: 'ログインしてください' }, { status: 401 })

  const { feedback } = await request.json()

  // ログイン中ユーザーのメールアドレスを"送り先"にする
  const user = await currentUser()
  const to = user?.primaryEmailAddress?.emailAddress
  if (!to)
    return Response.json({ error: 'メールが取得できません' }, { status: 400 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'AI練習コーチ <onboarding@resend.dev>',
    to: [to],
    subject: 'きょうの練習レポート',
    html: `<h2>コーチのフィードバック</h2><p>${feedback}</p>`,
  })

  return Response.json({ ok: true })
}
