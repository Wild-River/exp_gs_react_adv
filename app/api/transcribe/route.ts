// src/app/api/transcribe/route.ts
export async function POST(request: Request) {
  // 画面から送られた音声ファイルを受け取る（formDataのparse失敗をガード）
  let audio: FormDataEntryValue | null
  try {
    const inForm = await request.formData()
    audio = inForm.get('audio')
  } catch {
    return Response.json(
      { error: 'リクエストの形式が不正です。音声データを送ってください。' },
      { status: 400 },
    )
  }

  // audioが未添付／ファイルでない／中身が空のケースを弾く
  if (!(audio instanceof File) || audio.size === 0) {
    return Response.json(
      { error: '音声データが空です。もう一度録音してください。' },
      { status: 400 },
    )
  }

  // GROQ_API_KEY未設定時のガード
  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { error: 'サーバー設定エラー：APIキーが未設定です。' },
      { status: 500 },
    )
  }

  // Groqの音声API(Whisper)へ転送する形に詰め替える
  const groqForm = new FormData()
  groqForm.append('file', audio, 'audio.webm')
  groqForm.append('model', 'whisper-large-v3-turbo')
  groqForm.append('language', 'ja')

  // Groq呼び出し全体をtry/catchで囲む
  try {
    const res = await fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        // FormDataのときは、fetchが正しいContent-Typeを自動で付けるので自分で付けない
        body: groqForm,
      },
    )

    const data = await res.json()

    // Groqがエラーを返した時（キー違い・回数制限など）
    if (!res.ok || typeof data.text !== 'string') {
      console.error('Groq(transcribe)エラー:', data)
      return Response.json(
        {
          error:
            '文字起こしに失敗しました。ターミナルの赤い文字（キー違い・回数制限など）を確認してください。',
        },
        { status: 502 },
      )
    }

    return Response.json({ text: data.text })
  } catch (error) {
    console.error(error)
    return Response.json(
      { error: '文字起こしAPIとの通信に失敗しました。' },
      { status: 502 },
    )
  }
}
