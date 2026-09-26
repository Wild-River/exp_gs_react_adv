// app/share/[token]/page.tsx
// 共有リンク専用の公開ページ。ログインなしで見られるので、トークンが一致した記録だけを表示する
import { db } from '@/db'
import { judgeTurns, sessions } from '@/db/schema'
import { asc, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import CoachFeedbackText from '@/app/CoachFeedbackText'
import type { Metadata } from 'next'
import SpokenTime from '@/app/SpokenTime'
import JudgeChat from '@/app/JudgeChat'

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

  // AIコーチとのやりとり（トークンが一致した記録のものだけ読む）
  const judgeTurnRows = await db
    .select({
      turnNo: judgeTurns.turnNo,
      question: judgeTurns.question,
      answerText: judgeTurns.answerText,
      review: judgeTurns.review,
    })
    .from(judgeTurns)
    .where(eq(judgeTurns.sessionId, row.id))
    .orderBy(asc(judgeTurns.turnNo))

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
        <CoachFeedbackText>{row.feedback ?? ''}</CoachFeedbackText>

        {/* 質疑応答を終えた記録では、やりとりと総評も見せる（詳細ページと同じ見た目） */}
        {row.judgeSummary && judgeTurnRows.length > 0 && (
          <div className="mt-10 border-t border-gray-200 pt-8 leading-normal">
            <h2 className="mb-6 text-xl font-bold text-teal-700">
              AIコーチとの質疑応答
            </h2>
            <JudgeChat turns={judgeTurnRows} summary={row.judgeSummary} />
          </div>
        )}
      </div>
    </main>
  )
}
