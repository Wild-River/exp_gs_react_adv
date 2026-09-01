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
  const [speaking, setSpeaking] = useState(false)
  const samplesRef = useRef<number[]>([]) // 貯める配列
  const recordingRef = useRef(false) // いま録音中か
  const [recordedSmile, setRecordedSmile] = useState<number[]>([]) // 録音中に貯めた笑顔率の配列

  async function handleSubmit() {
    setLoading(true)
    setFeedback('')

    // 自分のAPI(/api/coach)を呼ぶ（Groqのキーはこの先＝サーバー側にある）
    // 通信やAPI側の失敗で画面が無反応にならないよう try/catch/finally で守る
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, answer, tone, recordedSmile }), // 録音中に貯めた笑顔率の配列を送る
      })
      const data = await res.json()
      setFeedback(
        data.feedback ?? 'エラーが起きました。もう一度お試しください。',
      )
    } catch {
      setFeedback('通信に失敗しました。ネットワークを確認してください。')
    } finally {
      setLoading(false)
    }
  }

  const handleScore = useCallback((n: number) => {
    if (recordingRef.current) samplesRef.current.push(n) // 録音中だけ貯める
  }, [])

  async function speak() {
    // ① 前の音声を止める
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setSpeaking(true)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: feedback }),
      })
      const data = await res.json()
      if (!res.ok || typeof data.audio !== 'string') {
        throw new Error(data.error ?? `tts ${res.status}`)
      }

      const audio = new Audio('data:audio/mp3;base64,' + data.audio)
      audioRef.current = audio
      audio.onended = () => setSpeaking(false)
      // 再生開始直後に停止すると play() が AbortError で reject するので握りつぶす
      audio.play().catch(() => {})
    } catch (e) {
      console.error(e)
      alert('読み上げに失敗しました。もう一度お試しください。')
      setSpeaking(false)
    }
  }

  function stopSpeak() {
    audioRef.current?.pause()
    audioRef.current = null
    setSpeaking(false)
  }

  function handleStart() {
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
    <main className="flex flex-col items-center justify-center min-h-screen p-4 w-full max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎉 AI練習コーチ 🎉</h1>

      {/* 子→親へ値を渡すときは、親から関数(onScore)を渡す。 */}
      <FaceMeter onScore={handleScore} />
      <div className="flex items-center text-center text-lg font-semibold">
        {avgSmile !== null ? (
          <>
            <span className="text-5xl mr-2">
              {avgSmile > 70 ? '😃' : avgSmile > 30 ? '😊' : '😐'}
            </span>
            直近の録音の平均笑顔率: {avgSmile}%
          </>
        ) : (
          '録音するとここに平均が出ます'
        )}
      </div>

      <div className="flex justify-between my-6 w-full">
        <p className="text-lg">
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
        </p>

        <div className="">
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
        </div>
      </div>

      {/* maxLengthでサーバー側の文字数上限とフロント側を一致させる */}
      <textarea
        maxLength={1000}
        className="outline outline-stone-300 rounded p-2 mt-2 w-full max-w-md"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={5}
        placeholder="ここに回答を入力"
      />
      <div className="text-right text-sm text-gray-500 w-full max-w-md">
        {answer.length} / 1000文字
      </div>

      <div className="flex justify-around my-6 w-full">
        <Recorder
          onText={(t) => setAnswer(t)}
          onStart={handleStart}
          onStop={handleStop}
          onError={setFeedback}
        />

        {/* !answer.trim()で空回答での送信防止 */}
        <button
          className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-4 rounded disabled:bg-gray-400"
          onClick={handleSubmit}
          disabled={loading || !answer.trim()}
        >
          {loading ? '生成中…' : 'コーチに見てもらう'}
        </button>
      </div>

      {feedback && (
        <>
          <div className="pre-wrap text-lg leading-10 pt-10 px-10 border-8 border-teal-600/30">
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
          </div>
          <button
            onClick={speaking ? stopSpeak : speak}
            className="bg-teal-500 text-white font-bold my-6 px-4 py-2 rounded disabled:opacity-50"
          >
            {speaking ? '■ 停止' : '🔊 読み上げ'}
          </button>
        </>
      )}
    </main>
  )
}
