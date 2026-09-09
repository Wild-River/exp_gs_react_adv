'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteBtn({
  id,
  topic,
}: {
  id: number
  topic: string
}) {
  const router = useRouter()
  const [sending, setSending] = useState(false)

  async function handleDelete() {
    const submit = window.confirm(`${topic}を削除しますか？`)
    if (submit) {
      setSending(true)
      try {
        const res = await fetch(`/api/sessions/${id}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          throw new Error(`削除 ${res.status}`)
        }
        router.refresh()
      } catch (e) {
        console.error(e)
        alert('削除に失敗しました。もう一度お試しください。')
      } finally {
        setSending(false)
      }
    }
  }

  return (
    <button
      disabled={sending}
      onClick={() => handleDelete()}
      className="block rounded bg-yellow-500 px-4 py-2 font-bold text-white hover:bg-yellow-400 disabled:opacity-50"
    >
      削除
    </button>
  )
}
