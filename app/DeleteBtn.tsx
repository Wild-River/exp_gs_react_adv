'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useToast } from './Toast'

export default function DeleteBtn({
  id,
  topic,
}: {
  id: number
  topic: string
}) {
  const router = useRouter()
  const showToast = useToast()
  const [sending, setSending] = useState(false)
  // confirm() の代わりに daisyUI の modal（<dialog>）で確認する
  const dialogRef = useRef<HTMLDialogElement>(null)

  async function handleDelete() {
    setSending(true)
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error(`削除 ${res.status}`)
      }
      showToast('削除しました', 'success')
      router.refresh()
    } catch (e) {
      console.error(e)
      showToast('削除に失敗しました。もう一度お試しください。', 'error')
    } finally {
      setSending(false)
      dialogRef.current?.close()
    }
  }

  return (
    <>
      <button
        onClick={() => dialogRef.current?.showModal()}
        className="btn btn-warning"
      >
        削除
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">記録の削除</h3>
          <p className="py-4">「{topic}」を削除しますか？</p>
          <div className="modal-action">
            {/* method="dialog" のフォームは、送信するとダイアログを閉じる */}
            <form method="dialog">
              <button
                className="btn btn-outline btn-primary"
                disabled={sending}
              >
                キャンセル
              </button>
            </form>
            <button
              onClick={handleDelete}
              disabled={sending}
              className="btn btn-warning"
            >
              {sending ? '削除中…' : '削除する'}
            </button>
          </div>
        </div>
        {/* 背景クリックでも閉じる */}
        <form method="dialog" className="modal-backdrop">
          <button>閉じる</button>
        </form>
      </dialog>
    </>
  )
}
