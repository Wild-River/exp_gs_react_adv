// app/share/[token]/page.tsx
// 共有リンク専用の公開ページ。ログインなしで見られるので、トークンが一致した記録だけを表示する
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import type { Metadata } from 'next'
import SpokenTime from '@/app/SpokenTime'

// トークンで1件だけ取得する。共有をやめた記録は shareId が null なので見つからない
async function getSession(token: string) {
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.shareId, token))
  return rows[0]
}

// SNSやチャットに貼ったときの表示
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const row = await getSession(token)
  if (!row) return { title: '見つかりませんでした' }

  return {
    title: `${row.topic}｜練習の記録`,
    description: `笑顔スコア ${row.smileScore ?? 0}% ／ AIコーチのフィードバック付き`,
  }
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const row = await getSession(token)
  // notFound() なら HTTP のステータスも 404 になる
  if (!row) notFound()

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="mt-2 border-b border-gray-200 pb-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        {row.topic}
      </h1>

      <div className="mt-10 flex items-center text-lg font-semibold">
        <span className="mr-2 text-5xl">
          {(row.smileScore ?? 0) > 70
            ? '😃'
            : (row.smileScore ?? 0) > 30
              ? '😊'
              : '😐'}
        </span>
        笑顔スコア {row.smileScore ?? 0}%
      </div>
      <SpokenTime
        durationSec={row.durationSec}
        limitSec={row.limitSec}
        className="mt-6"
      />

      <div className="mt-10 border-8 border-teal-600/30 px-10 py-10 text-lg leading-10">
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
    </main>
  )
}
