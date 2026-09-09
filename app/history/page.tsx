// app/history/page.tsx
import DeleteBtn from '@/app/DeleteBtn'
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { desc } from 'drizzle-orm'
import Link from 'next/link'

// このページは毎回サーバーで作り直す（DBの最新を必ず出すため）
export const dynamic = 'force-dynamic'
const selected =
  'rounded border border-teal-500 bg-teal-500 px-4 py-2 font-bold text-white hover:bg-teal-600'
const unselected =
  'hover:bg-teal-500 rounded border border-teal-500 bg-white px-4 py-2 font-bold text-teal-500 hover:bg-teal-500 hover:text-white'

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { sort } = await searchParams
  const isScore = sort === 'score'
  const sortRule = isScore ? sessions.smileScore : sessions.createdAt

  const rows = await db.select().from(sessions).orderBy(desc(sortRule))

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="border-b border-gray-200 pb-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        練習の記録（{rows.length}件）
      </h1>

      {rows.length === 0 ? (
        <p className="mt-10 text-lg text-gray-500">
          まだありません。練習して「保存」しましょう。
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* ── 成長グラフ ── */}
          <aside className="lg:sticky lg:top-8 lg:col-span-7 lg:self-start">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              笑顔スコアの記録
            </h2>
            <div className="flex h-140 items-end gap-1 border-8 border-teal-600/30 px-6 py-6">
              {[...rows].reverse().map((row) => (
                <div
                  key={row.id}
                  title={`${row.smileScore ?? 0}%`}
                  style={{ height: `${row.smileScore ?? 0}%` }}
                  className="w-4 rounded-t bg-teal-500 transition-colors hover:bg-teal-600"
                />
              ))}
            </div>
            <div className="mt-10 flex justify-between">
              <Link
                href="/history"
                className="font-bold text-teal-600 hover:text-teal-700 hover:opacity-70"
              >
                ← ダッシュボードにもどる
              </Link>
              <Link
                href="/history?sort=score"
                className={isScore ? selected : unselected}
              >
                スコア順に並び替える
              </Link>
              <Link
                href="/history?sort=date"
                className={!isScore ? selected : unselected}
              >
                日付順に並び替える
              </Link>
            </div>
          </aside>

          {/* ── 一覧 ── */}
          <section className="lg:col-span-5">
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="flex justify-between">
                  <div className="font-bold text-gray-900">▶︎{row.topic}</div>
                  <div className="flex gap-2">
                    <DeleteBtn id={row.id} topic={row.topic} />
                    <Link
                      href={`/history/${row.id}`}
                      className="rounded bg-teal-500 px-4 py-2 leading-normal font-bold text-white hover:bg-teal-600 disabled:bg-gray-400"
                    >
                      詳細を見る
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
