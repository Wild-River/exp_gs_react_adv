// app/history/[id]/page.tsx
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export default async function HistoryDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, Number(id)))
  const row = rows[0]

  if (!row) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-lg text-gray-500">見つかりませんでした。</p>
        <Link
          href="/history"
          className="mt-6 inline-block font-bold text-teal-700 hover:text-teal-800 hover:underline"
        >
          ← 練習の記録にもどる
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="mt-4 border-b border-gray-200 pb-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        {row.topic}
      </h1>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* ── 自分の回答 ── */}
        <section className="lg:col-span-5">
          <div className="mb-10 flex items-center text-lg font-semibold">
            <span className="mr-2 text-5xl">
              {(row.smileScore ?? 0) > 70
                ? '😃'
                : (row.smileScore ?? 0) > 30
                  ? '😊'
                  : '😐'}
            </span>
            笑顔スコア {row.smileScore ?? 0}%
          </div>
          <h2 className="mb-4 text-lg font-bold text-gray-900">あなたの回答</h2>
          <p className="mb-10 rounded border border-gray-200 px-6 py-6 leading-8 whitespace-pre-wrap">
            {row.answerText}
          </p>
          {row.memo && (
            <h2 className="mb-4 text-lg font-bold text-gray-900">メモ</h2>
          )}
          <p className="rounded border border-gray-200 px-6 py-6 leading-8 whitespace-pre-wrap">
            {row.memo}
          </p>
        </section>

        {/* ── コーチのフィードバック ── */}
        <section className="lg:col-span-7">
          <div className="border-8 border-teal-600/30 px-10 py-10 text-lg leading-10">
            <ReactMarkdown
              components={{
                // 出力のMarkdownの中に出てきたtagに指定した処理を使う
                strong: ({ children }) => (
                  <strong className="block font-bold text-teal-700">
                    {children}
                  </strong>
                ),
                p: ({ children }) => (
                  <p className="even:pb-10">
                    <span className="border-b-2 border-dotted border-slate-400 pb-2 nth-[2]:border">
                      {children}
                    </span>
                  </p>
                ),
              }}
            >
              {row.feedback}
            </ReactMarkdown>
          </div>
        </section>
      </div>

      <Link
        href="/history"
        className="font-bold text-teal-600 hover:text-teal-700 hover:opacity-70"
      >
        ← 練習の記録にもどる
      </Link>
    </main>
  )
}
