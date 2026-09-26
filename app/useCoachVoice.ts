// app/useCoachVoice.ts
// コーチの講評を読み上げる音声（mp3）を作るフック。練習画面と詳細ページで使う
import { useCallback, useState } from 'react'
import { useToast } from './Toast'

// 講評の「**良かった点**」の ** まで読み上げないよう、記号を取り除く
function toSpeechText(text: string) {
  return text.replaceAll('**', '')
}

// startGenerating: 画面を開いてすぐ自動で作るときは true にする
// （最初から「作成中」で始めるので、作り始めるまでの一瞬「コーチの声で聞く」ボタンが見えてしまうのを防ぐ）
export function useCoachVoice(startGenerating = false) {
  const showToast = useToast()
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [generating, setGenerating] = useState(startGenerating) // 音声を作っている途中か（ボタンの連打を防ぐ）

  // 音声を作って audioSrc にセットする。作った音声のURLも返す（ダウンロードですぐ使えるように）
  const speak = useCallback(
    async (text: string): Promise<string | null> => {
      setGenerating(true)
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: toSpeechText(text) }),
        })
        const data = await res.json()
        if (!res.ok || typeof data.audio !== 'string') {
          throw new Error(data.error ?? `tts ${res.status}`)
        }
        const src = 'data:audio/mp3;base64,' + data.audio
        setAudioSrc(src)
        return src
      } catch (e) {
        console.error(e)
        showToast(
          e instanceof Error
            ? e.message
            : '読み上げに失敗しました。もう一度お試しください。',
          'error',
        )
        return null
      } finally {
        setGenerating(false)
      }
    },
    [showToast],
  )

  // 音声をまだ作っていなければ作ってから、ファイル名を付けて保存する
  // （<audio> の標準メニューからだと data: URL にはファイル名を付けられないため、こちらを使う）
  const downloadVoice = useCallback(
    async (text: string, fileName: string) => {
      const src = audioSrc ?? (await speak(text))
      if (!src) return // 作るのに失敗したときは speak 側で通知済み
      const a = document.createElement('a')
      a.href = src
      a.download = fileName
      a.click()
    },
    [audioSrc, speak],
  )

  // 講評が変わったときなど、前の音声を消す
  const resetVoice = useCallback(() => setAudioSrc(null), [])

  return { audioSrc, generating, speak, downloadVoice, resetVoice }
}
