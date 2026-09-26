'use client'
// app/JudgePanel.tsx
// AIコーチとの質疑応答。練習画面で「コーチに質問してもらう」を押すと、講評カードの場所に入れ替わって出る
// どこまで進んだかはサーバー（/api/sessions/[id]/judge）が決め、画面は返ってきた状態を表示するだけ
// 講評は1問ごとには出さず、3問すべて答え終わってから、まとめて1回だけ出る

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import Link from 'next/link'
import Recorder, { type RecorderPhase } from './Recorder'
import { useToast } from './Toast'
import {
  JUDGE_QUESTION_COUNT,
  MAX_JUDGE_ANSWER_LENGTH,
  coachAudioFileName,
} from './practice'
import JudgeChat, { type JudgeTurn } from './JudgeChat'
import FeedbackActions from './FeedbackActions'
import ShareBtn from './ShareBtn'

// 画面の段階。真偽値を増やさず、今どこにいるかを1つで持つ
// off：1問目を聞けなかった（もう一度聞くボタンを出す）／thinking：コーチが考え中／answering：質問に答える番／done：終わり
type JudgePhase = 'off' | 'thinking' | 'answering' | 'done'

export default function JudgePanel({
  sessionId,
  topic,
  strictness,
  onActiveChange,
}: {
  sessionId: number
  topic: string // 総評の音声を保存するときのファイル名に使う
  strictness: string // コーチの厳しさ（質問の聞き方と総評の書き方に反映される）
  onActiveChange?: (active: boolean) => void // 質疑応答の途中は、親の練習用ボタンを止めるために知らせる
}) {
  const showToast = useToast()
  // 表示されたらすぐ1問目を聞くので、最初から「考え中」で始める
  const [phase, setPhaseState] = useState<JudgePhase>('thinking')
  const [turns, setTurns] = useState<JudgeTurn[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [draft, setDraft] = useState('') // 送る前の回答（文字起こしの結果を直せる）
  const [recorderPhase, setRecorderPhase] = useState<RecorderPhase>('idle')

  // 自分の表示を切り替えつつ、親にも「途中かどうか」を知らせる
  function setPhase(next: JudgePhase) {
    setPhaseState(next)
    onActiveChange?.(next === 'thinking' || next === 'answering')
  }

  // サーバーに送り、返ってきた状態を表示する
  // 失敗したら、まだ質問がなければ「もう一度聞く」に、あれば「答える番」に戻す
  async function send(answer?: string) {
    const fallback: JudgePhase = turns.length === 0 ? 'off' : 'answering'
    setPhase('thinking')
    try {
      const res = await fetch(`/api/sessions/${sessionId}/judge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strictness, answer }),
      })
      const data = await res.json().catch(() => null) // 本文がJSONでないケースに備える
      if (!res.ok || !Array.isArray(data?.turns)) {
        throw new Error(data?.error ?? `judge ${res.status}`)
      }
      setTurns(data.turns)
      setSummary(data.summary ?? null)
      setDraft('')
      setPhase(data.summary ? 'done' : 'answering')
    } catch (e) {
      console.error(e)
      setPhase(fallback)
      showToast(
        e instanceof Error
          ? e.message
          : 'コーチと通信できませんでした。もう一度お試しください。',
        'error',
      )
    }
  }

  // 表示されたらすぐ1問目を聞く
  // 開発モードでは useEffect が2回動くので、2回聞かないよう ref で覚えておく（2回目はDBの重複禁止で失敗してしまう）
  const startedRef = useRef(false)
  const start = useEffectEvent(() => send())
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    start()
  }, [])

  const current = turns[turns.length - 1] // いま答える質問（answering のとき）
  const recording = recorderPhase !== 'idle'

  return (
    // 講評カードと同じ枠にして、同じ場所に入れ替わって出す
    <div className="border-8 border-teal-600/30 px-10 py-10 text-lg">
      <h2 className="mb-6 text-xl font-bold text-teal-700">
        AIコーチとの質疑応答
      </h2>

      {/* これまでの質問と回答（コーチは左、自分は右の吹き出し）と、終わったら全体の講評 */}
      {/* 総評の行間は、練習画面のコーチの講評（leading-12）とそろえる */}
      <JudgeChat
        turns={turns}
        summary={summary}
        summaryClassName="leading-12"
      />

      {phase === 'off' && (
        <button onClick={() => send()} className="btn btn-primary">
          もう一度質問してもらう
        </button>
      )}

      {phase === 'thinking' && (
        <p role="status" className="mt-4 flex items-center gap-2 text-gray-500">
          <span className="loading loading-sm loading-spinner" aria-hidden />
          {turns.length === JUDGE_QUESTION_COUNT
            ? 'コーチが講評をまとめています…'
            : 'コーチが考えています…'}
        </p>
      )}

      {/* 答える番：回答の録音と入力・送信 */}
      {phase === 'answering' && current && (
        <div className="mt-4 space-y-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            // 録音・文字起こしの途中に書いても、文字起こしの結果で上書きされるので入力させない
            disabled={recording}
            maxLength={MAX_JUDGE_ANSWER_LENGTH}
            rows={4}
            placeholder="録音するか、ここに回答を入力"
            className="textarea w-full"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Recorder
              onText={(t) => setDraft(t)}
              onError={(msg) => showToast(msg, 'error')}
              onPhaseChange={setRecorderPhase}
            />
            <button
              onClick={() => send(draft)}
              disabled={recording || !draft.trim()}
              className="btn btn-primary"
            >
              回答を送る
            </button>
          </div>
        </div>
      )}

      {/* 終わり：総評の読み上げ・音声の保存・メール（質疑応答と総評も送る）・共有と、詳細ページへ
          並びは詳細ページとそろえる。コーチの講評も含めて、詳細ページで見返せる */}
      {phase === 'done' && summary && (
        <FeedbackActions
          id={sessionId}
          feedback={summary}
          downloadName={coachAudioFileName(topic, new Date(), '総評')} // 質疑応答の直後なので、日付は今日
        >
          {/* 新しい記録なので、まだ共有していない状態から始める
              共有をやめる操作は詳細ページだけで行う（練習画面をすっきりさせるため） */}
          <ShareBtn id={sessionId} shareId={null} allowStop={false} />
          <Link href={`/history/${sessionId}`} className="btn btn-primary">
            詳細を見る
          </Link>
        </FeedbackActions>
      )}
    </div>
  )
}
