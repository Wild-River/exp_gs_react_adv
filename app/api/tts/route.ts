// src/app/api/tts/route.ts
import { EdgeTTS } from '@andresaya/edge-tts'

// 読み上げるテキストの上限（フィードバックは200字程度。余裕を持って上限を設ける）
const MAX_TEXT_LENGTH = 5000

export async function POST(request: Request) {
  // JSON自体が壊れている場合（parseに失敗）はここで弾く
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'リクエストの形式が不正です。' },
      { status: 400 },
    )
  }

  const { text } = body ?? {}

  // textが空／文字列でない／長すぎるケースのガード
  if (typeof text !== 'string' || !text.trim()) {
    return Response.json(
      { error: '読み上げるテキストがありません。' },
      { status: 400 },
    )
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return Response.json(
      { error: `テキストが長すぎます（${MAX_TEXT_LENGTH}文字以内）。` },
      { status: 400 },
    )
  }

  // 音声合成全体をtry/catchで囲む（MicrosoftのサービスへWebSocket接続するため失敗しうる）
  try {
    const tts = new EdgeTTS()
    await tts.synthesize(text, 'ja-JP-NanamiNeural') // 日本語の自然な声
    const base64 = tts.toBase64() // 音声(mp3)をbase64で受け取る

    if (!base64) {
      console.error('TTS: base64が空です')
      return Response.json(
        { error: '音声の生成に失敗しました。もう一度お試しください。' },
        { status: 502 },
      )
    }

    return Response.json({ audio: base64 })
  } catch (error) {
    console.error(error)
    return Response.json(
      { error: '音声合成サービスとの通信に失敗しました。' },
      { status: 502 },
    )
  }
}
