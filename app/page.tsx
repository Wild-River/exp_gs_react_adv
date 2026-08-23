"use client";
// src/app/page.tsx

import { useState } from "react";

export default function Home() {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState("やさしめ");

  const topic = "自己紹介を1分で";

  async function handleSubmit() {
    setLoading(true);
    setFeedback("");

    // 自分のAPI(/api/coach)を呼ぶ（Groqのキーはこの先＝サーバー側にある）
    // 通信やAPI側の失敗で画面が無反応にならないよう try/catch/finally で守る
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, answer, tone }),
      });
      const data = await res.json();
      setFeedback(data.feedback ?? "エラーが起きました。もう一度お試しください。");
    } catch {
      setFeedback("通信に失敗しました。ネットワークを確認してください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h1>AI練習コーチ</h1>
      <p>お題：{topic}</p>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={5}
        style={{ width: "100%" }}
        placeholder="ここに回答を入力"
      />

      <div style={{ marginTop: 8 }}>
        口調：
        <select value={tone} onChange={(e) => setTone(e.target.value)}>
          <option value="やさしめ">やさしめ</option>
          <option value="スパルタ">スパルタ</option>
          <option value="ていねい">ていねい</option>
        </select>
      </div>

      <button 
      className="bg-blue-500 text-white px-4 py-2 rounded"
      onClick={handleSubmit} disabled={loading} style={{ marginTop: 12 }}>
        {loading ? "生成中…" : "コーチに見てもらう"}
      </button>

      {feedback && (
        <p style={{ whiteSpace: "pre-wrap", marginTop: 16 }}>{feedback}</p>
      )}
    </main>
  );
}