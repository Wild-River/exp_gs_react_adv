'use client'
// app/ShareBtn.tsx
// 共有リンクの発行・コピー・停止。詳細ページ（自分の記録）から使う

import { useState } from 'react'
import { useToast } from './Toast'

export default function ShareBtn({
  id,
  shareId: initialShareId,
}: {
  id: number
  shareId: string | null
}) {
  const showToast = useToast()
  const [shareId, setShareId] = useState(initialShareId)
  const [sending, setSending] = useState(false)

  // クリップボードは https か localhost でしか使えないので、失敗したらURLを通知に出す
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      showToast('共有リンクをコピーしました', 'success')
    } catch {
      showToast(`共有リンク: ${url}`, 'info')
    }
  }

  async function share() {
    setSending(true)
    try {
      const res = await fetch(`/api/sessions/${id}/share`, { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok || typeof data?.shareId !== 'string') {
        throw new Error(data?.error ?? `share ${res.status}`)
      }
      setShareId(data.shareId)
      await copy(`${location.origin}/share/${data.shareId}`)
    } catch (e) {
      console.error(e)
      showToast(
        e instanceof Error
          ? e.message
          : '共有リンクの発行に失敗しました。もう一度お試しください。',
        'error',
      )
    } finally {
      setSending(false)
    }
  }

  async function stopSharing() {
    setSending(true)
    try {
      const res = await fetch(`/api/sessions/${id}/share`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error(`share ${res.status}`)
      }
      setShareId(null)
      showToast('共有をやめました', 'success')
    } catch (e) {
      console.error(e)
      showToast('共有の停止に失敗しました。もう一度お試しください。', 'error')
    } finally {
      setSending(false)
    }
  }

  if (!shareId) {
    return (
      <button onClick={share} disabled={sending} className="btn btn-primary">
        共有リンクを作る
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => copy(`${location.origin}/share/${shareId}`)}
        className="btn btn-primary"
      >
        共有リンクをコピー
      </button>
      <button
        onClick={stopSharing}
        disabled={sending}
        className="btn btn-outline btn-primary"
      >
        共有をやめる
      </button>
    </div>
  )
}
