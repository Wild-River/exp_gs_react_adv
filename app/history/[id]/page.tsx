// app/history/[id]/page.tsx
import { db } from '@/db'
import { judgeTurns, sessions } from '@/db/schema'
import { and, asc, eq } from 'drizzle-orm'
import Link from 'next/link'
import CoachFeedbackText from '@/app/CoachFeedbackText'
import { auth } from '@clerk/nextjs/server'
import ShareBtn from '@/app/ShareBtn'
import SpokenTime from '@/app/SpokenTime'
import FeedbackActions from '@/app/FeedbackActions'
import Breadcrumbs from '@/app/Breadcrumbs'
import JudgeChat from '@/app/JudgeChat'
import { coachAudioFileName } from '@/app/practice'

export default async function HistoryDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // ① まず未ログインを弾く
  const { userId } = await auth()
  if (!userId) {
    return (
      <main className="p-8">
        <p>履歴を見るにはログインしてください。</p>
      </main>
    )
  }

  // ② 自分の記録だけを取得（他人のidを直接指定されても見せない）
  // idが数字でないときにDBへ問い合わせると500になるので、先に確認する
  const { id } = await params
  const sessionId = Number(id)
  const rows = Number.isInteger(sessionId)
    ? await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    : []
  const row = rows[0]

  if (!row) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-lg text-gray-500">見つかりませんでした。</p>
        <Link
          href="/history"
          className="mt-6 inline-block font-bold text-teal-600 hover:text-teal-700 hover:opacity-70"
        >
          ← 練習の記録にもどる
        </Link>
      </main>
    )
  }

  // AIコーチとのやりとり（この記録が本人のものだと確かめたあとに読む）
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

  // 音声を保存するときのファイル名（練習画面と同じ付け方）
  const downloadName = coachAudioFileName(row.topic, row.createdAt)
  const summaryDownloadName = coachAudioFileName(
    row.topic,
    row.createdAt,
    '総評',
  )

  // パンくずに出す日付（サーバーはUTCで動くことがあるので日本時間で出す）
  const date = row.createdAt.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
  })

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* パンくず：今いる場所と、戻り先（ホーム・練習の記録）を上に出す */}
      <Breadcrumbs
        items={[
          { label: 'ホーム', href: '/' },
          { label: '練習の記録', href: '/history' },
          { label: `${row.topic}（${date}）` },
        ]}
      />
      <h1 className="mt-2 border-b border-gray-200 pb-4 text-3xl font-bold tracking-tight text-gray-900">
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
          <SpokenTime
            durationSec={row.durationSec}
            limitSec={row.limitSec}
            className="mb-10"
          />
          <h2 className="mb-4 text-lg font-bold text-gray-900">あなたの回答</h2>
          <p className="mb-10 rounded border border-gray-200 px-6 py-6 leading-8 whitespace-pre-wrap">
            {row.answerText}
          </p>
          {row.memo && (
            <>
              <h2 className="mb-4 text-lg font-bold text-gray-900">メモ</h2>
              <p className="rounded border border-gray-200 px-6 py-6 leading-8 whitespace-pre-wrap">
                {row.memo}
              </p>
            </>
          )}

          {/* 次にやること：同じお題で練習し直す（ホームはURLの ?topic= でお題を選んだ状態で開く） */}
          <div className="mt-12 flex justify-start">
            <Link
              href={{ pathname: '/', query: { topic: row.topic } }}
              className="btn btn-lg btn-primary"
            >
              このお題でもう一度練習する
            </Link>
          </div>
        </section>

        {/* ── コーチのフィードバック ── */}
        <section className="lg:col-span-7">
          <div className="border-8 border-teal-600/30 px-10 py-10 text-lg leading-10">
            <CoachFeedbackText>{row.feedback ?? ''}</CoachFeedbackText>
            {/* 1段目：読み上げ・音声の保存（講評がある記録だけ）／2段目：メール送信・共有
                質疑応答を終えた記録では、これらは総評の下に置くので、ここには出さない */}
            {!row.judgeSummary && (
              <FeedbackActions
                id={row.id}
                feedback={row.feedback}
                downloadName={downloadName}
              >
                {/* 共有リンクの発行・コピー・停止 */}
                <ShareBtn id={row.id} shareId={row.shareId} />
              </FeedbackActions>
            )}

            {/* AIコーチとのやりとり（質疑応答をした記録だけ。見返すだけで、続きはできない）
                コーチの講評と同じカードの中に、区切り線を挟んで続ける
                カードの広い行間（leading-10）が吹き出しに効かないよう、ここだけ標準の行間に戻す */}
            {judgeTurnRows.length > 0 && (
              <div className="mt-10 border-t border-gray-200 pt-8 leading-normal">
                <h2 className="mb-6 text-xl font-bold text-teal-700">
                  AIコーチとの質疑応答
                </h2>
                <JudgeChat turns={judgeTurnRows} summary={row.judgeSummary} />
                {/* 総評の読み上げ・音声の保存・メール送信（質疑応答と総評も送る）・共有 */}
                {row.judgeSummary && (
                  <FeedbackActions
                    id={row.id}
                    feedback={row.judgeSummary}
                    downloadName={summaryDownloadName}
                  >
                    <ShareBtn id={row.id} shareId={row.shareId} />
                  </FeedbackActions>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
