'use client'
// src/app/Recorder.tsx

import { useRef, useState } from 'react'

export default function Recorder({
  onText,
  onStart,
  onStop,
  onError,
}: {
  onText: (t: string) => void
  onStart?: () => void
  onStop?: () => void
  onError?: (msg: string) => void
}) {
  const [recording, setRecording] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRec() {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      console.error(e)
      onError?.(
        'マイクを使えませんでした。ブラウザでマイクを『許可』してから、もう一度お試しください。',
      )
      return
    }
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    // ondataavailableで音の断片を貯める
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data)

    // onstop … 止めたら 断片を1つのファイル(Blob)にまとめて /api/transcribe へ
    recorder.onstop = async () => {
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const form = new FormData()
        form.append('audio', blob, 'audio.webm')

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: form,
        })
        const data = await res.json()
        if (!res.ok || typeof data.text !== 'string') {
          throw new Error(data.error ?? `transcribe ${res.status}`)
        }

        onText(data.text)
      } catch (e) {
        console.error(e)
        onError?.('文字起こしに失敗しました。もう一度お試しください。')
      } finally {
        recorder.stream.getTracks().forEach((t) => t.stop()) // 成功でも失敗でもマイクを止める
      }
    }

    recorder.start()
    onStart?.() // 録音開始時に onStart を呼び出す
    recorderRef.current = recorder
    setRecording(true)
  }

  function stopRec() {
    onStop?.() // 録音停止時に onStop を呼び出す
    recorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <button
      onClick={recording ? stopRec : startRec}
      className="block bg-yellow-500 text-white font-bold px-4 py-2 rounded hover:bg-yellow-400 disabled:opacity-50"
    >
      {recording ? '文字起こし' : '🎤 録音する'}
    </button>
  )
}
