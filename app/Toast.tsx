'use client'
// app/Toast.tsx
// alert() の代わりに画面右下へ通知を出す仕組み（daisyUI の toast + alert）
// layout で <ToastProvider> に包み、各コンポーネントでは useToast() で呼び出す

import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; type: ToastType }

// Tailwind がクラス名を拾えるよう、文字列を組み立てずに丸ごと書いておく
const alertClass: Record<ToastType, string> = {
  success: 'alert-success',
  error: 'alert-error',
  info: 'alert-info',
}

// エラーは読む時間が必要なので少し長めに表示する
const DURATION: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  info: 3000,
}

const ToastContext = createContext<(message: string, type?: ToastType) => void>(
  () => {},
)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  // useCallback で関数を固定し、useEffect の依存配列に入れても再実行されないようにする
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, DURATION[type])
  }, [])

  return (
    <ToastContext value={showToast}>
      {children}
      <div className="toast toast-end z-50" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`alert ${alertClass[t.type]}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
