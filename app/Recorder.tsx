'use client'
// src/app/Recorder.tsx

import { useRef, useState } from 'react'

// これより短い録音は文字起こしに送らない
const MIN_RECORDING_MS = 1000

// 録音ボタンの段階。準備中・文字起こし中は押せないようにする（二重に録音・送信しないため）
export type RecorderPhase = 'idle' | 'starting' | 'recording' | 'transcribing'

export default function Recorder({
  onText,
  onStart,
  onStop,
  onError,
  onPhaseChange,
  disabled = false,
}: {
  onText: (t: string) => void
  onStart?: () => void
  onStop?: () => void // 録音を止めたとき（このあと文字起こしが始まり、終わると onText か onError が呼ばれる）
  onError?: (msg: string) => void
  onPhaseChange?: (phase: RecorderPhase) => void // 親が他のボタンを止めるために、段階が変わるたびに知らせる
  disabled?: boolean // 親の都合で録音を始めさせたくないとき（講評を作っている途中など）
}) {
  const [phase, setPhaseState] = useState<RecorderPhase>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // 自分の表示を切り替えつつ、親にも同じ段階を知らせる
  function setPhase(next: RecorderPhase) {
    setPhaseState(next)
    onPhaseChange?.(next)
  }

  async function startRec() {
    setPhase('starting') // マイクの許可を待つ間に、もう一度押されないようにする
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      console.error(e)
      setPhase('idle')
      onError?.(
        'マイクを使えませんでした。ブラウザでマイクを『許可』してから、もう一度お試しください。',
      )
      return
    }
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    // ondataavailableで音の断片を貯める
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
    const startedAt = Date.now() // 短すぎる録音を見分けるため

    // onstop … 止めたら 断片を1つのファイル(Blob)にまとめて /api/transcribe へ
    recorder.onstop = async () => {
      // 押してすぐ止めたような短い録音は、文字起こしに送らない
      // （無音に近い音声は Whisper が文をでっち上げやすく、APIの回数も無駄になるため）
      if (Date.now() - startedAt < MIN_RECORDING_MS) {
        recorder.stream.getTracks().forEach((t) => t.stop())
        setPhase('idle')
        onError?.('録音が短すぎます。1秒以上話してから止めてください。')
        return
      }

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

        // 声が入っていない区間はサーバーが捨てるので、何も残らなければ空文字が返ってくる
        // 前の回答が残ったままにならないよう、回答欄は空にしてから知らせる
        if (!data.text.trim()) {
          onText('')
          onError?.('声が聞き取れませんでした。もう一度録音してください。')
          return
        }

        onText(data.text)
      } catch (e) {
        console.error(e)
        onError?.('文字起こしに失敗しました。もう一度お試しください。')
      } finally {
        recorder.stream.getTracks().forEach((t) => t.stop()) // 成功でも失敗でもマイクを止める
        setPhase('idle')
      }
    }

    recorder.start()
    onStart?.() // 録音開始時に onStart を呼び出す
    recorderRef.current = recorder
    setPhase('recording')
  }

  function stopRec() {
    onStop?.() // 録音停止時に onStop を呼び出す
    recorderRef.current?.stop()
    setPhase('transcribing')
  }

  const label = {
    idle: '録音する',
    starting: 'マイクを準備中…',
    recording: '録音を止める',
    transcribing: '文字起こし中…',
  }[phase]

  return (
    <button
      onClick={phase === 'recording' ? stopRec : startRec}
      // 押せるのは「待機中（親が止めていなければ）」と「録音中（止めるため）」だけ
      disabled={
        phase === 'starting' ||
        phase === 'transcribing' ||
        (phase === 'idle' && disabled)
      }
      className="btn btn-warning"
    >
      {label}
    </button>
  )
}
