// src/app/api/coach/route.ts
export async function POST(request: Request) {
  // ① 入力を受け取る（画面から送られてくる お題 と 回答）
  //   Body が空/JSONでない時に備えて、try で受け止める
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ feedback: "リクエストの形式が不正です（BrunoのBodyがJSONか確認してください）" }, { status: 400 });
  }
  const { topic, answer, tone } = body;

  // ② AIへの"お願い文"を組み立てる
const prompt = `あなたはプレゼン/面接の練習コーチです。
「${tone}」な口調で、次の「お題」に対する「回答」を読んで、
良かった点と改善点を、具体的に、200文字くらいで日本語でフィードバックしてください。
お題: ${topic}
回答: ${answer}`;

  // ③ Groq を叩く（キーはサーバー側の環境変数から。ブラウザには出ない）
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  // ④ 返事を取り出す
  const data = await res.json();

  // Groqがエラーを返した時（キー違い・回数制限など）はここで気づける
  if (!res.ok || !data.choices) {
    console.error("Groqエラー:", data);
    return Response.json(
      { feedback: "AIとの通信に失敗しました。ターミナルの赤い文字（キー違い・回数制限など）を確認してください。" },
      { status: 502 },
    );
  }

  const feedback = data.choices[0].message.content;

  // ⑤ 画面に返す
  return Response.json({ feedback });
}