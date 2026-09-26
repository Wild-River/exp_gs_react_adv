// src/app/api/transcribe/route.ts

// Whisper は無音でも「ご視聴ありがとうございました」などの文をでっち上げることがある（ハルシネーション）
// verbose_json で区間ごとの「話していない確率（no_speech_prob）」を受け取り、高い区間は捨てる
// 0.6 は Whisper 本体の標準の判定と同じ値。実際の録音で試して、必要なら調整する
const NO_SPEECH_THRESHOLD = 0.6

type Segment = { text: string; no_speech_prob: number; avg_logprob: number }

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
  groqForm.append('response_format', 'verbose_json') // 区間ごとの no_speech_prob を受け取るため

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

    // 区間の情報が無いときは、これまでどおり全文を返す
    if (!Array.isArray(data.segments)) {
      return Response.json({ text: data.text.trim() })
    }

    const segments: Segment[] = data.segments
    // しきい値を調整できるよう、開発中は区間ごとの値をターミナルに出す
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '文字起こしの区間:',
        segments.map((s) => ({
          text: s.text,
          no_speech_prob: s.no_speech_prob,
          avg_logprob: s.avg_logprob,
        })),
      )
    }

    // 話していない確率が高い区間（無音からのでっち上げ）を捨てて、残りをつなげる
    // 全部捨てたときは空文字を返す（画面側で「声が聞き取れませんでした」と知らせる）
    const text = segments
      .filter((s) => !(s.no_speech_prob > NO_SPEECH_THRESHOLD))
      .map((s) => s.text)
      .join('')
      .trim()

    return Response.json({ text })
  } catch (error) {
    console.error(error)
    return Response.json(
      { error: '文字起こしAPIとの通信に失敗しました。' },
      { status: 502 },
    )
  }
}
