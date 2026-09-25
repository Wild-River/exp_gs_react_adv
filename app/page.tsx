'use client'
// src/app/page.tsx

import { useState, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import FaceMeter from './FaceMeter'
import Recorder from './Recorder'
import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { useToast } from './Toast'

export default function Home() {
  const showToast = useToast()
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [tone, setTone] = useState('やさしめ')
  const [topic, setTopic] = useState('自己紹介を1分で')
  const samplesRef = useRef<number[]>([]) // 貯める配列
  const recordingRef = useRef(false) // いま録音中か
  const [recordedSmile, setRecordedSmile] = useState<number[]>([]) // 録音中に貯めた笑顔率の配列
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)

  async function speak(text: string) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok || typeof data.audio !== 'string') {
        throw new Error(data.error ?? `tts ${res.status}`)
      }
      setAudioSrc('data:audio/mp3;base64,' + data.audio)
    } catch (e) {
      console.error(e)
      showToast(
        e instanceof Error
          ? e.message
          : '読み上げに失敗しました。もう一度お試しください。',
        'error',
      )
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setAudioSrc(null)

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, answer, tone, recordedSmile }), // 録音中に貯めた笑顔率の配列を送る
      })
      const data = await res.json()
      const fb = data.feedback ?? 'エラーが起きました。もう一度お試しください。'
      setFeedback(fb)

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
    setAudioSrc(null)
    samplesRef.current = []
    recordingRef.current = true
  }

  function handleStop() {
    recordingRef.current = false
    setRecordedSmile([...samplesRef.current]) // 録音中に貯めた笑顔率の配列をstateにセット
  }

  const avgSmile = recordedSmile.length
    ? Math.round(
        recordedSmile.reduce((a, b) => a + b, 0) / recordedSmile.length,
      )
    : null

  async function save() {
    setSaving(true)

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, answer, avgSmile, feedback, memo }),
      })
      const data = await res.json().catch(() => null) // 本文がJSONでないケースに備える
      if (!res.ok) {
        throw new Error(data?.error ?? `sessions ${res.status}`)
      }
      showToast('保存しました', 'success')
    } catch (e) {
      console.error(e)
      showToast(
        e instanceof Error
          ? e.message
          : '保存に失敗しました。もう一度お試しください。',
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  async function deliver() {
    try {
      const res = await fetch('/api/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      })
      const data = await res.json().catch(() => null) // 本文がJSONでないケースに備える
      if (!res.ok) {
        throw new Error(data?.error ?? `deliver ${res.status}`)
      }
      showToast('メールを送りました', 'success')
    } catch (e) {
      console.error(e)
      showToast(
        e instanceof Error
          ? e.message
          : 'メール送信に失敗しました（無料枠では自分の登録メール宛のみ送れます）',
        'error',
      )
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
                className="select ml-2 w-auto"
              >
                <option value="自己紹介を1分で">自己紹介を1分で</option>
                <option value="志望動機">志望動機</option>
                <option value="自分の強み">自分の強み</option>
                <option value="転職理由">転職理由</option>
              </select>
            </label>
            <label>
              口調：
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="select ml-2 w-auto"
              >
                <option value="やさしめ">やさしめ</option>
                <option value="スパルタ">スパルタ</option>
                <option value="ていねい">ていねい</option>
              </select>
            </label>
          </div>

          <div>
            <textarea
              maxLength={1000}
              rows={6}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="ここに回答を入力"
              className="textarea w-full"
            />
            <div className="text-right text-sm text-gray-500">
              {answer.length} / 1000文字
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Recorder
              onText={(t) => setAnswer(t)}
              onStart={handleStart}
              onStop={handleStop}
              onError={setFeedback}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !answer.trim()}
              className="btn btn-primary"
            >
              {loading ? '生成中…' : 'コーチに見てもらう'}
            </button>
            <button
              onClick={() => {
                setAnswer('')
                setFeedback('')
                setAudioSrc(null)
              }}
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
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="textarea w-full"
            placeholder="ここにメモを残す"
          />
          <div className="mt-10">
            <Link
              href="/history"
              className="font-bold text-teal-600 hover:text-teal-700 hover:opacity-70"
            >
              練習の記録を見る →
            </Link>
          </div>
        </aside>

        {/* ── 右：表示エリア ── */}
        <section className="min-h-96 rounded-xl lg:col-span-7">
          {!feedback ? (
            <div className="space-y-4">
              <FaceMeter onScore={handleScore} />
            </div>
          ) : (
            <div className="border-8 border-teal-600/30 px-10 py-10 text-lg leading-12">
              <ReactMarkdown
                components={{
                  // 出力のMarkdownの中に出てきたtagに指定した処理を使う
                  strong: ({ children }) => (
                    <strong className="block font-bold text-teal-700">
                      {children}
                    </strong>
                  ),
                  p: ({ children }) => (
                    <p className="even:pb-10">
                      <span className="border-b-2 border-dotted border-slate-400 pb-2 nth-[2]:border">
                        {children}
                      </span>
                    </p>
                  ),
                }}
              >
                {feedback}
              </ReactMarkdown>

              <div className="flex items-center gap-4">
                {!audioSrc && !loading && (
                  <button
                    onClick={() => speak(feedback)}
                    className="btn btn-primary btn-sm"
                  >
                    🔊 読み上げ
                  </button>
                )}
                {audioSrc && <audio src={audioSrc} controls />}
              </div>
              <SignedIn>
                <div className="mt-4 flex items-center gap-4">
                  <button
                    onClick={save}
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    💾 保存する
                  </button>
                  <button onClick={deliver} className="btn btn-primary">
                    ✉ メールで受け取る
                  </button>
                </div>
              </SignedIn>
              <SignedOut>
                <p>練習を保存・メールで受け取るには、ログインしてください。</p>
                <SignInButton>
                  <button className="btn mt-2 btn-primary">ログインする</button>
                </SignInButton>
              </SignedOut>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
