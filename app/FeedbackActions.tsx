'use client'
// app/FeedbackActions.tsx
// 保存済みの記録の講評の下に並べるボタン（再生・音声のダウンロード・メール＋ページごとのボタン）
// 質疑応答をした記録では、コーチの講評ではなく総評の下に置き、総評を読み上げる（feedback に総評を渡す）
// 並びは練習画面とそろえる：1段目 再生／2段目 音声のダウンロード・メール＋ページごとのボタン（children）

import { useEffect, useRef } from 'react'
import { useCoachVoice } from './useCoachVoice'
import { CoachVoicePlayer, VoiceDownloadButton } from './CoachVoiceControls'
import MailButton from './MailButton'

export default function FeedbackActions({
  id,
  feedback,
  downloadName,
  children,
}: {
  id: number
  feedback: string | null // 読み上げる講評（質疑応答をした記録では総評）。無ければ音声の段を出さない
  downloadName: string // 音声を保存するときのファイル名（例: coach_自己紹介を1分で_9-26.mp3）
  children?: React.ReactNode // 2段目のメールの右に置くボタン（詳細ページでは共有ボタン）
}) {
  // 講評があれば開いてすぐ作るので、最初から「作成中」で始める
  const { audioSrc, generating, speak, downloadVoice } = useCoachVoice(
    Boolean(feedback),
  )

  // ページを開いたら音声を作っておく（再生はしない。ブラウザは操作前の自動再生を止めるため）
  // 開発モードでは useEffect が2回動くので、同じ講評で2回作らないよう ref で覚えておく
  const requestedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!feedback || requestedRef.current === feedback) return
    requestedRef.current = feedback
    speak(feedback)
  }, [feedback, speak])

  return (
    <div className="mt-8 space-y-4">
      {feedback && (
        <CoachVoicePlayer
          audioSrc={audioSrc}
          generating={generating}
          onSpeak={() => speak(feedback)}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {feedback && (
          <>
            <VoiceDownloadButton
              audioSrc={audioSrc}
              onDownload={() => downloadVoice(feedback, downloadName)}
            />
            <MailButton sessionId={id} />
          </>
        )}
        {children}
      </div>
    </div>
  )
}
