'use client'
// app/page.tsx

import { useState } from 'react'
import Link from 'next/link'
import FaceMeter from './FaceMeter'

export default function Home() {
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [smileScore, setSmileScore] = useState(0)
  const topic = '自己紹介を1分で'

  async function handleSubmit() {
    setLoading(true)
    setFeedback('')
    const res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, answer, smileScore }),
    })
    const data = await res.json()
    setFeedback(data.feedback)
    setLoading(false)
  }

  async function save() {
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, answer, smileScore, feedback }),
    })
    alert('保存しました')
  }

  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h1>AI練習コーチ</h1>
      <Link href="/history">📖 履歴を見る</Link>

      <FaceMeter onScore={setSmileScore} />
      <p>いまの笑顔率：{smileScore}%</p>

      <p>お題：{topic}</p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={5}
        style={{ width: '100%' }}
        placeholder="ここに回答を入力"
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{ marginTop: 12 }}
      >
        {loading ? '生成中…' : 'コーチに見てもらう'}
      </button>

      {feedback && (
        <>
          <p style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>{feedback}</p>
          <button onClick={save}>💾 保存する</button>
        </>
      )}
    </main>
  )
}
