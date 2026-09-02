'use client'
// src/app/page.tsx

import { useState, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import FaceMeter from './FaceMeter'
import Recorder from './Recorder'

export default function Home() {
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [tone, setTone] = useState('やさしめ')
  const [topic, setTopic] = useState('自己紹介を1分で')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const samplesRef = useRef<number[]>([]) // 貯める配列
  const recordingRef = useRef(false) // いま録音中か
  const [recordedSmile, setRecordedSmile] = useState<number[]>([]) // 録音中に貯めた笑顔率の配列
  const [audioSrc, setAudioSrc] = useState<string | null>(null)

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
      alert('読み上げに失敗しました。もう一度お試しください。')
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

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="border-b border-gray-200 pb-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        プレゼン&就活面接 AIコーチ
      </h1>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* ── 左：操作パネル ── */}
        <aside className="space-y-5 lg:col-span-5 lg:sticky lg:top-8 lg:self-start">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <label className="text-lg">
              お題：
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="outline outline-stone-300 rounded p-2 ml-2"
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
                className="outline outline-stone-300 rounded p-2 ml-2"
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
              className="w-full rounded p-3 outline outline-stone-300"
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
              className="rounded bg-teal-500 px-4 py-2 font-bold text-white hover:bg-teal-600 disabled:bg-gray-400"
            >
              {loading ? '生成中…' : 'コーチに見てもらう'}
            </button>
            <button
              onClick={() => {
                setAnswer('')
                setFeedback('')
                setAudioSrc(null)
              }}
              className="rounded bg-white px-4 py-2 font-bold text-teal-500 hover:bg-teal-500-600 border border-teal-500 hover:text-white hover:bg-teal-500"
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
        </aside>

        {/* ── 右：表示エリア ── */}
        <section className="min-h-96 rounded-xl lg:col-span-7">
          {!feedback ? (
            <div className="space-y-4">
              <FaceMeter onScore={handleScore} />
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-lg leading-10 py-10 px-10 border-8 border-teal-600/30">
              <ReactMarkdown
                components={{
                  // 出力のMarkdownの中に出てきたtagに指定した処理を使う
                  strong: ({ children }) => (
                    <strong className="font-bold text-teal-700 block">
                      {children}
                    </strong>
                  ),
                  p: ({ children }) => (
                    <p className="even:pb-10">
                      <span className="nth-[2]:border border-b-2 border-dotted border-slate-400 pb-2">
                        {children}
                      </span>
                    </p>
                  ),
                }}
              >
                {feedback}
              </ReactMarkdown>
              {feedback && !audioSrc && (
                <button
                  onClick={() => speak(feedback)}
                  disabled={loading}
                  className="rounded bg-teal-500 px-4 py-1 font-bold text-white hover:bg-teal-600 disabled:opacity-50"
                >
                  🔊 読み上げ
                </button>
              )}
              {audioSrc && <audio ref={audioRef} src={audioSrc} controls />}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
