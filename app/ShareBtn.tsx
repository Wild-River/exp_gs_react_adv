'use client'
// app/ShareBtn.tsx
// 共有リンクの発行・コピー・停止
// 共有をやめる操作はあまり使わないので、目立たない文字リンクにし、押したら確認してから止める
// 練習画面（allowStop=false）では出さず、止めたいときは詳細ページで行う

import { useRef, useState } from 'react'
import { useToast } from './Toast'

export default function ShareBtn({
  id,
  shareId: initialShareId,
  allowStop = true,
}: {
  id: number
  shareId: string | null
  allowStop?: boolean // 「共有をやめる」を出すか（詳細ページだけ出す）
}) {
  const showToast = useToast()
  const [shareId, setShareId] = useState(initialShareId)
  const [sending, setSending] = useState(false)
  // confirm() の代わりに daisyUI の modal（<dialog>）で確認する（削除ボタンと同じ作り）
  const dialogRef = useRef<HTMLDialogElement>(null)

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
      dialogRef.current?.close()
    }
  }

  if (!shareId) {
    return (
      <button onClick={share} disabled={sending} className="btn btn-primary">
        共有リンクを作る
      </button>
    )
  }

  // 親のボタンの行（flex-wrap の横並び）にそのまま入るよう、外側を div で囲まない
  // - 「共有リンクをコピー」は、音声のダウンロード・メールと同じ行に並ぶ
  // - 共有中の表示と「共有をやめる」は、basis-full で次の行に回し、order-last で並びの一番最後に置く
  //   （親でこのあとに別のボタンが続いても、共有中の表示は必ず一番下に来る）
  return (
    <>
      <button
        onClick={() => copy(`${location.origin}/share/${shareId}`)}
        className="btn btn-primary"
      >
        共有リンクをコピー
      </button>

      <div className="order-last mt-3 flex basis-full items-center gap-3">
        {/* 共有中であることを、色だけでなく文字でも出す */}
        <span className="badge badge-outline badge-primary">共有中</span>

        {allowStop && (
          <button
            onClick={() => dialogRef.current?.showModal()}
            disabled={sending}
            className="link text-sm text-gray-500 hover:text-gray-700"
          >
            共有をやめる
          </button>
        )}
      </div>

      {allowStop && (
        <dialog ref={dialogRef} className="modal">
          <div className="modal-box">
            <h3 className="text-lg font-bold">共有をやめる</h3>
            <p className="py-4 leading-7">
              共有をやめると、これまでに送った共有リンクは開けなくなります。あとでもう一度共有すると、新しいリンクになります。
            </p>
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
                onClick={stopSharing}
                disabled={sending}
                className="btn btn-warning"
              >
                {sending ? '停止中…' : '共有をやめる'}
              </button>
            </div>
          </div>
          {/* 背景クリックでも閉じる */}
          <form method="dialog" className="modal-backdrop">
            <button>閉じる</button>
          </form>
        </dialog>
      )}
    </>
  )
}
