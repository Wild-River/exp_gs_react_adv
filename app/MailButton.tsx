'use client'
// app/MailButton.tsx
// 保存済みの記録をメールで受け取るボタン。練習画面と詳細ページで共通
// 講評の文章は送らず id だけ送る。中身はサーバーがDBから読む

import { useState } from 'react'
import { useToast } from './Toast'

export default function MailButton({ sessionId }: { sessionId: number }) {
  const showToast = useToast()
  const [sending, setSending] = useState(false)

  async function deliver() {
    setSending(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/deliver`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => null) // 本文がJSONでないケースに備える
      if (!res.ok) {
        throw new Error(data?.error ?? `deliver ${res.status}`)
      }
      showToast('メールを送りました', 'success')
    } catch (e) {
      console.error(e)
      showToast(
        e instanceof Error
          ? e.message
          : 'メール送信に失敗しました（無料枠では自分の登録メール宛のみ送れます）',
        'error',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <button
      onClick={deliver}
      disabled={sending}
      className="btn btn-outline btn-primary"
    >
      {sending ? '送信中…' : 'メールで受け取る'}
    </button>
  )
}
