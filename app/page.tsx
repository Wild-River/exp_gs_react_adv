'use client'
// src/app/page.tsx

import { useState, useRef, useCallback, useEffect, use } from 'react'
import CoachFeedbackText from './CoachFeedbackText'
import FaceMeter from './FaceMeter'
import Recorder, { type RecorderPhase } from './Recorder'
import RecordingTimer from './RecordingTimer'
import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { useToast } from './Toast'
import {
  TOPICS,
  STRICTNESS_LEVELS,
  MAX_ANSWER_LENGTH,
  MAX_MEMO_LENGTH,
  JUDGE_QUESTION_COUNT,
  coachAudioFileName,
  findLimitSec,
} from './practice'
import { useCoachVoice } from './useCoachVoice'
import { CoachVoicePlayer, VoiceDownloadButton } from './CoachVoiceControls'
import MailButton from './MailButton'
import JudgePanel from './JudgePanel'

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const showToast = useToast()
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [strictness, setStrictness] = useState('普通') // コーチの厳しさ（講評と質疑応答で共通）
  // 詳細ページの「このお題でもう一度練習する」から来たときは、URLの ?topic= のお題を選んだ状態で始める
  // Client Component のページでは、searchParams（Promise）を React の use() で読む
  const topicParam = use(searchParams).topic
  const [topic, setTopic] = useState(
    // 一覧にないお題（手で書き換えたURLなど）は無視して、先頭のお題にする
    TOPICS.find((t) => t.label === topicParam)?.label ?? TOPICS[0].label,
  )
  const samplesRef = useRef<number[]>([]) // 貯める配列
  const recordingRef = useRef(false) // いま録音中か
  const [recordedSmile, setRecordedSmile] = useState<number[]>([]) // 録音中に貯めた笑顔率の配列
  const { audioSrc, generating, speak, downloadVoice, resetVoice } =
    useCoachVoice()
  const [memo, setMemo] = useState('')
  const [sessionId, setSessionId] = useState<number | null>(null) // 講評と一緒に自動保存された記録のid（未ログイン・保存失敗は null）
  const [savedMemo, setSavedMemo] = useState('') // DBに入っているメモ。今のメモと違えば「メモを保存」を押せる
  const [memoSaving, setMemoSaving] = useState(false)
  const startedAtRef = useRef<number | null>(null) // 録音を始めた時刻
  const [isRecording, setIsRecording] = useState(false) // 録音中は画面の表示（タイマー・お題の選択）を切り替える
  // 録音ボタンの段階（マイクの準備中・録音中・文字起こし中は、回答が確定していない）
  const [recorderPhase, setRecorderPhase] = useState<RecorderPhase>('idle')
  const [judgeStarted, setJudgeStarted] = useState(false) // AIコーチとの質疑応答を始めたか（講評カードと入れ替える）
  const [judgeActive, setJudgeActive] = useState(false) // AIコーチとの質疑応答の途中か
  const [elapsedSec, setElapsedSec] = useState(0) // 表示用の経過秒数
  const [durationSec, setDurationSec] = useState<number | null>(null) // 録音を止めたときに確定した秒数（未録音は null）

  // 選んでいるお題の制限時間（topic から計算できるので state にしない）
  const limitSec = findLimitSec(topic)

  // 録音まわり（準備中・録音中・文字起こし中）か講評を作っている途中は、ほかの操作をさせない
  // コーチとの質疑応答の途中も、練習用の録音やクリアをさせない（やりとりの元の記録が変わってしまうため）
  const busy = recorderPhase !== 'idle' || loading || judgeActive

  // AIコーチとの質疑応答を始める（講評カードが質疑応答に入れ替わり、すぐ1問目を聞く）
  function startJudge() {
    setJudgeStarted(true)
    setJudgeActive(true) // 1問目が届くまでの間も、練習用のボタンを止める
  }

  // 新しい練習を始めるときは、質疑応答の表示を講評カードに戻す
  function resetJudge() {
    setJudgeStarted(false)
    setJudgeActive(false)
  }

  // 録音中だけ経過時間を更新する
  // 「1秒ごとに+1」だとずれていくので、毎回「今 − 開始時刻」で計算し直す
  useEffect(() => {
    if (!isRecording) return
    const timer = setInterval(() => {
      if (startedAtRef.current === null) return
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 250)
    // 録音を止めたとき／録音中にページを離れたときに止める
    return () => clearInterval(timer)
  }, [isRecording])

  async function handleSubmit() {
    setLoading(true)
    resetVoice()
    setSessionId(null)
    resetJudge()
    const memoAtSubmit = memo // 待っている間にメモを書き足しても区別できるよう、送った時点のメモを残す

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          answer,
          strictness,
          recordedSmile, // 録音中に貯めた笑顔率の配列を送る
          durationSec, // 話した秒数（未録音は null）
          memo: memoAtSubmit, // 講評の前に書いたメモは一緒に保存される
        }),
      })
      const data = await res.json()
      const fb = data.feedback ?? 'エラーが起きました。もう一度お試しください。'
      setFeedback(fb)

      // ログインしていれば、講評と一緒に記録が保存されている
      if (res.ok) {
        setSessionId(typeof data.sessionId === 'number' ? data.sessionId : null)
        setSavedMemo(memoAtSubmit)
        if (data.saveError) showToast(data.saveError, 'error')
      }

      await speak(fb)
    } catch {
      setFeedback('通信に失敗しました。ネットワークを確認してください。')
    } finally {
      setLoading(false)
    }
  }

  const handleScore = useCallback((n: number) => {
    if (recordingRef.current) samplesRef.current.push(n) // 録音中だけ貯める
  }, [])

  function handleStart() {
    setFeedback('')
    resetVoice()
    // 前の練習の記録に付けたメモは、次の練習に持ち越さない（録音前に書いたメモは残す）
    if (sessionId !== null) {
      setMemo('')
      setSavedMemo('')
    }
    setSessionId(null)
    resetJudge()
    samplesRef.current = []
    recordingRef.current = true
    // onStart はマイクの許可が下りて録音が始まってから呼ばれるので、許可待ちの時間は含まれない
    startedAtRef.current = Date.now()
    setElapsedSec(0)
    setDurationSec(null)
    setIsRecording(true)
  }

  function handleStop() {
    recordingRef.current = false
    setRecordedSmile([...samplesRef.current]) // 録音中に貯めた笑顔率の配列をstateにセット
    // 表示とずれないよう、止めた瞬間の秒数で確定させる
    const sec =
      startedAtRef.current === null
        ? 0
        : Math.floor((Date.now() - startedAtRef.current) / 1000)
    startedAtRef.current = null
    setElapsedSec(sec)
    setDurationSec(sec)
    setIsRecording(false)
  }

  const avgSmile = recordedSmile.length
    ? Math.round(
        recordedSmile.reduce((a, b) => a + b, 0) / recordedSmile.length,
      )
    : null

  // 講評のあとに書いたメモを、自動保存された記録に追記する
  const memoChanged = memo.trim() !== savedMemo.trim() // サーバーは前後の空白を除いて保存するので、比べるときもそろえる

  async function saveMemo() {
    if (sessionId === null) return
    setMemoSaving(true)
    const memoToSave = memo
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: memoToSave }),
      })
      const data = await res.json().catch(() => null) // 本文がJSONでないケースに備える
      if (!res.ok) {
        throw new Error(data?.error ?? `sessions ${res.status}`)
      }
      setSavedMemo(memoToSave)
      showToast('メモを保存しました', 'success')
    } catch (e) {
      console.error(e)
      showToast(
        e instanceof Error
          ? e.message
          : 'メモの保存に失敗しました。もう一度お試しください。',
        'error',
      )
    } finally {
      setMemoSaving(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* ── 左：操作パネル ── */}
        <aside className="space-y-5 lg:sticky lg:top-8 lg:col-span-5 lg:self-start">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <label className="text-lg">
              お題：
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                // 録音中に変えると制限時間が、文字起こし・講評の途中に変えると講評とお題がずれるため
                disabled={busy}
                className="select ml-2 w-auto"
              >
                {TOPICS.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              厳しさ：
              <select
                value={strictness}
                onChange={(e) => setStrictness(e.target.value)}
                // 講評や質疑応答の途中に変えると、質問の聞き方や総評の厳しさがぶれるため
                disabled={busy}
                className="select ml-2 w-auto"
              >
                {STRICTNESS_LEVELS.map((s) => (
                  <option key={s.label} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <RecordingTimer
            elapsedSec={elapsedSec}
            limitSec={limitSec}
            phase={
              isRecording ? 'recording' : durationSec !== null ? 'done' : 'idle'
            }
          />

          <div>
            <textarea
              maxLength={MAX_ANSWER_LENGTH}
              rows={6}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              // 録音・文字起こしの途中に書いても、文字起こしの結果で上書きされるので入力させない
              disabled={recorderPhase !== 'idle'}
              placeholder="ここに回答を入力"
              className="textarea w-full"
            />
            <div className="text-right text-sm text-gray-500">
              {answer.length} / {MAX_ANSWER_LENGTH}文字
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Recorder
              onText={(t) => setAnswer(t)}
              onStart={handleStart}
              onStop={handleStop}
              // 録音・文字起こしのエラーは講評の欄ではなくトーストで知らせる（講評として音声や記録のボタンが出ないように）
              onError={(msg) => showToast(msg, 'error')}
              onPhaseChange={setRecorderPhase}
              disabled={loading} // 講評を作っている途中に録音を始めると、届いた講評と回答がずれるため
            />
            <button
              onClick={handleSubmit}
              // 録音・文字起こしの途中は、回答がまだ確定していないので送らせない
              disabled={busy || !answer.trim()}
              className="btn btn-primary"
            >
              {loading ? '生成中…' : 'コーチに見てもらう'}
            </button>
            <button
              onClick={() => {
                setAnswer('')
                setFeedback('')
                resetVoice()
                setElapsedSec(0)
                setDurationSec(null)
                // 記録はもう保存済みなので、画面だけを最初の状態にもどす
                setMemo('')
                setSavedMemo('')
                setSessionId(null)
                resetJudge()
              }}
              disabled={busy} // 録音・文字起こし・講評の途中に消すと、あとから届いた結果だけが残ってしまうため
              className="btn btn-outline btn-primary"
            >
              クリア
            </button>
          </div>
          <div className="flex items-center text-lg font-semibold">
            {avgSmile !== null ? (
              <>
                <span className="mr-2 text-5xl">
                  {avgSmile > 70 ? '😃' : avgSmile > 30 ? '😊' : '😐'}
                </span>
                あなたの平均笑顔率: {avgSmile}%
              </>
            ) : (
              '（録音後はこちらに笑顔の平均値が出ます）'
            )}
          </div>
          <div className="space-y-2">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={MAX_MEMO_LENGTH}
              className="textarea w-full"
              placeholder="ここにメモを残す"
            />
            <SignedIn>
              {sessionId !== null ? (
                // 書き足して保存が必要なときだけボタンを出す（押せないグレーのボタンは出さない）
                memoChanged || memoSaving ? (
                  <button
                    onClick={saveMemo}
                    disabled={memoSaving}
                    className="btn mt-2 btn-outline btn-primary"
                  >
                    {memoSaving ? '保存中…' : 'メモを保存'}
                  </button>
                ) : (
                  memo.trim() && (
                    <p className="mt-2 font-semibold text-teal-700">
                      ✓ メモは保存済み
                    </p>
                  )
                )
              ) : (
                <p className="text-sm text-gray-500">
                  メモは講評と一緒に記録されます。講評のあとに書き足すこともできます。
                </p>
              )}
            </SignedIn>
          </div>
        </aside>

        {/* ── 右：表示エリア ── */}
        <section className="min-h-96 rounded-xl lg:col-span-7">
          {!feedback ? (
            <div className="space-y-4">
              <FaceMeter onScore={handleScore} />
            </div>
          ) : judgeStarted && sessionId !== null ? (
            // AIコーチとの質疑応答。講評カードの場所に入れ替わって出す（コーチの講評は詳細ページで見返せる）
            // 記録が変わったら key で最初から
            <JudgePanel
              key={sessionId}
              sessionId={sessionId}
              topic={topic}
              strictness={strictness}
              onActiveChange={setJudgeActive}
            />
          ) : (
            <div className="border-8 border-teal-600/30 px-10 py-10 text-lg leading-12">
              <CoachFeedbackText>{feedback}</CoachFeedbackText>

              {/* 並びは詳細ページとそろえる：記録の状態／1段目 再生／2段目 音声のダウンロード・メール＋ページごとのボタン */}
              <div className="mt-8 space-y-4">
                {/* 記録の状態（ログイン中だけ） */}
                <SignedIn>
                  {sessionId !== null ? (
                    <p className="font-semibold text-teal-700">
                      ✓ 記録しました
                    </p>
                  ) : (
                    !loading && (
                      <p className="text-sm text-gray-500">
                        この講評は記録されていません。
                      </p>
                    )
                  )}
                </SignedIn>
                {/* 音声はログインしていなくても聞ける・保存できる */}
                <CoachVoicePlayer
                  audioSrc={audioSrc}
                  generating={generating}
                  disabled={loading} // 講評を作り直している途中は、前の講評の音声を作るボタンを出さない
                  onSpeak={() => speak(feedback)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <VoiceDownloadButton
                    audioSrc={audioSrc}
                    onDownload={() =>
                      downloadVoice(
                        feedback,
                        coachAudioFileName(topic, new Date()), // 講評を受けた直後なので、日付は今日
                      )
                    }
                  />
                  <SignedIn>
                    {sessionId !== null && (
                      <>
                        <MailButton sessionId={sessionId} />
                        <Link
                          href={`/history/${sessionId}`}
                          className="btn btn-primary"
                        >
                          詳細を見る
                        </Link>
                      </>
                    )}
                  </SignedIn>
                  <SignedOut>
                    <SignInButton>
                      <button className="btn btn-primary">ログインする</button>
                    </SignInButton>
                    <p className="text-sm text-gray-500">
                      ログインすると、練習が自動で記録され、メールでも受け取れます。
                    </p>
                  </SignedOut>
                </div>
              </div>

              {/* AIコーチへの入り口（講評が記録できたときだけ）。押すと、このカードが質疑応答に入れ替わる */}
              <SignedIn>
                {sessionId !== null && (
                  <div className="mt-10 space-y-3 border-t border-gray-200 pt-8">
                    <p className="text-base text-gray-500">
                      この回答をもとに、AIコーチが{JUDGE_QUESTION_COUNT}
                      つ質問します。答え終わると、まとめて講評します。
                    </p>
                    <button
                      onClick={startJudge}
                      disabled={busy}
                      className="btn btn-primary"
                    >
                      コーチに質問してもらう
                    </button>
                  </div>
                )}
              </SignedIn>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
