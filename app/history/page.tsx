// app/history/page.tsx
import DeleteBtn from '@/app/DeleteBtn'
import Breadcrumbs from '@/app/Breadcrumbs'
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { desc, eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { formatSeconds } from '@/app/practice'

// このページは毎回サーバーで作り直す（DBの最新を必ず出すため）
export const dynamic = 'force-dynamic'

// グラフと一覧に出す件数（グラフの棒が並びきる数に合わせ、一覧も同じ記録を出す）
const SHOW_LIMIT = 12

// グラフの日付ラベル用。サーバーはUTCで動くことがあるので、日本時間の月と日を出す
function formatMonth(date: Date) {
  return date
    .toLocaleDateString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: 'numeric',
    })
    .replace('月', '')
}
function formatDay(date: Date) {
  return date
    .toLocaleDateString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      day: 'numeric',
    })
    .replace('日', '')
}

// CSSの出し分け（並び替えは daisyUI の join で1つにつながったボタンにする）
const selected = 'join-item btn btn-primary'
const unselected = 'join-item btn btn-outline btn-primary'

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // ① まず未ログインを弾く（他のAPIと同じ思想＝ログインしていない人は入れない）
  const { userId } = await auth()
  if (!userId) {
    return (
      <main className="p-8">
        <p>履歴を見るにはログインしてください。</p>
      </main>
    )
  }
  const { sort } = await searchParams
  const isScore = sort === 'score'
  // スコア順：高い順。Postgres は大きい順（desc）だと null を先頭に置くので、
  // 笑顔を測れなかった記録（null）は nulls last で最後に回す。同じスコアどうしは新しい順
  // 日付順：新しい順（created_at は notNull なので null の心配はない）
  const orderRules = isScore
    ? [sql`${sessions.smileScore} desc nulls last`, desc(sessions.createdAt)]
    : [desc(sessions.createdAt)]

  // ② 一覧は"自分のだけ"（userId 一致）。並び替えた順に上位12件だけ取る（グラフと一覧で同じ記録を使う）
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(...orderRules)
    .limit(SHOW_LIMIT)

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* パンくず：詳細ページとそろえて、今いる場所と戻り先を上に出す */}
      <Breadcrumbs
        items={[{ label: 'ホーム', href: '/' }, { label: '練習の記録' }]}
      />
      {/* 見出しの行：並び替えと、次にやること（練習する）をまとめる。ページ間の移動はヘッダーのナビに任せる */}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          練習の記録
        </h1>
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="join">
              <Link
                href="/history?sort=score"
                className={isScore ? selected : unselected}
                aria-current={isScore ? 'page' : undefined}
              >
                スコア順
              </Link>
              <Link
                href="/history?sort=date"
                className={!isScore ? selected : unselected}
                aria-current={!isScore ? 'page' : undefined}
              >
                日付順
              </Link>
            </div>
            <Link href="/" className="btn btn-outline btn-primary">
              ＋ 練習する
            </Link>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-lg text-gray-500">
            まだ記録がありません。ログインした状態で練習すると、講評と一緒に自動で記録されます。
          </p>
          <Link href="/" className="btn btn-primary">
            練習をはじめる
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* ── 成長グラフ ── */}
          <aside className="lg:sticky lg:top-8 lg:col-span-7 lg:self-start">
            {/* 12本の列が幅を等分して縮む（flex-1 min-w-0）。列の間の余白も画面幅に合わせて小さくする
                （列が日付の文字幅より縮めず、余白も固定だと、狭い画面でグラフが枠の外にはみ出すため） */}
            <div className="flex h-140 items-end gap-1 border-8 border-teal-600/30 px-3 py-6 sm:gap-2 sm:px-6 xl:gap-4">
              {/* 取ってくる時点で12件なので、ここでは左から古い（低い）順に並べ替えるだけ */}
              {rows.toReversed().map((row) => (
                <div
                  key={row.id}
                  className="flex h-full min-w-0 flex-1 flex-col items-center gap-1"
                >
                  {/* 棒は列の中央に、太さは最大16px（w-4）のまま */}
                  <div className="group relative flex w-full max-w-4 flex-1 items-end">
                    <div
                      style={{ height: `${row.smileScore ?? 0}%` }}
                      className="relative w-full rounded-t bg-teal-500 hover:bg-teal-600"
                    >
                      {/* ホバーで出るツールチップ */}
                      <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded bg-teal-600 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {row.smileScore ?? 0}%
                      </span>
                    </div>
                  </div>
                  {/* 日付：狭い画面では「9/」「26」の2段にして列の幅に収める。sm 以上は1行 */}
                  <div className="flex flex-col items-center text-[10px] leading-tight font-bold text-gray-900 sm:flex-row sm:text-sm">
                    <span>{formatMonth(row.createdAt)}/</span>
                    <span>{formatDay(row.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* ── 一覧 ── */}
          <section className="lg:col-span-5">
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="flex justify-between">
                  <div className="flex gap-2 font-bold text-gray-900">
                    <div className="w-8">
                      {/* グラフと同じく日本時間で出す（サーバーのUTCで1日ずれないように） */}
                      {formatMonth(row.createdAt)}/{formatDay(row.createdAt)}
                    </div>
                    <div className="">▶︎{row.topic}</div>
                    {/* 話した時間（計っていない記録は出さない） */}
                    {row.durationSec !== null && (
                      <div className="font-normal text-gray-500 tabular-nums">
                        {formatSeconds(row.durationSec)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <DeleteBtn id={row.id} topic={row.topic} />
                    <Link
                      href={`/history/${row.id}`}
                      className="btn btn-primary"
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
