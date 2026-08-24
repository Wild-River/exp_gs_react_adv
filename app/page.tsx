"use client";
// src/app/page.tsx

import { useState } from "react";
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState("やさしめ");
  const [topic, setTopic] = useState("自己紹介を1分で");

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
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-16">🎉 AI練習コーチ 🎉</h1>

      <p className="text-lg mb-4">お題：
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className="outline outline-stone-300 rounded p-2 ml-2">
          <option value="自己紹介を1分で">自己紹介を1分で</option>
          <option value="志望動機">志望動機</option>
          <option value="自分の強み">自分の強み</option>
          <option value="転職理由">転職理由</option>
        </select>
      </p>

      {/* サーバー側の文字数上限とフロント側を一致させる */}
      <textarea
        maxLength={1000}
        className="outline outline-stone-300 rounded p-2 mt-2 w-full max-w-md"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={5}
        placeholder="ここに回答を入力"
      />

      <div className="my-6">
        口調：
        <select value={tone} onChange={(e) => setTone(e.target.value)} className="outline outline-stone-300 rounded p-2 ml-2">
          <option value="やさしめ">やさしめ</option>
          <option value="スパルタ">スパルタ</option>
          <option value="ていねい">ていねい</option>
        </select>
      </div>

      {/* 空回答での送信防止を追加 */}
      <button
        className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 mb-7 rounded disabled:bg-gray-400"
        onClick={handleSubmit} disabled={loading || !answer.trim()} style={{ marginTop: 12 }}>
        {loading ? "生成中…" : "コーチに見てもらう"}
      </button>

      {feedback && (
        <div className="pre-wrap text-lg leading-10 w-3xl pt-10 px-10 border-8 border-teal-600/30 bg-olive-50/50">
          <ReactMarkdown
            components={{
              // 出力のMarkdownの中に<strong>が出てきたら指定した処理を使う
              strong: ({ children }) => (
                <strong className="font-bold text-teal-700 block">
                  {children}
                </strong>
              ),
              p: ({ children }) => (
                <p className="pb-10">
                  {children}
                </p>
              )
            }}
          >
            {feedback}
          </ReactMarkdown>
        </div>
      )}
    </main>
  );
}