// app/history/page.tsx
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { desc } from 'drizzle-orm'
import Link from 'next/link'

// このページは毎回サーバーで作り直す（DBの最新を必ず出すため）
export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const rows = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.createdAt))

  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h1>練習の記録（{rows.length}件）</h1>
      {rows.length === 0 ? (
        <p>まだありません。練習して「保存」しましょう。</p>
      ) : (
        <>
          {/* 成長グラフ（古い→新しい の順に並べ替えて棒で表示） */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              alignItems: 'flex-end',
              height: 100,
            }}
          >
            {[...rows].reverse().map((row) => (
              <div
                key={row.id}
                title={`${row.smileScore}%`}
                style={{
                  width: 16,
                  height: `${row.smileScore ?? 0}%`,
                  background: '#2563eb',
                }}
              />
            ))}
          </div>
          <ul>
            {rows.map((row) => (
              <li key={row.id}>
                <Link href={`/history/${row.id}`}>
                  {row.topic} ／ 笑顔 {row.smileScore ?? 0}%
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
