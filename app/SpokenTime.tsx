// app/SpokenTime.tsx
// 保存した記録の「話した時間」と、目安に収まったかの表示。詳細ページと共有ページで使う
import { formatSeconds } from './practice'

export default function SpokenTime({
  durationSec,
  limitSec,
  className = '',
}: {
  durationSec: number | null
  limitSec: number | null
  className?: string // 置く場所ごとの余白（何も出さないときに余白だけ残らないよう、外側のdivに付ける）
}) {
  // 時間を計っていない記録（手入力・この機能より前の記録）は何も出さない
  if (durationSec === null) return null

  const overSec = limitSec === null ? null : durationSec - limitSec

  return (
    <div
      className={`flex flex-wrap items-center gap-3 text-lg font-semibold ${className}`}
    >
      {/* lucide の timer アイコン。横に文字があるので、読み上げでは飛ばす（aria-hidden） */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-9 text-teal-700"
        aria-hidden="true"
      >
        <line x1="10" x2="14" y1="2" y2="2" />
        <line x1="12" x2="15" y1="14" y2="11" />
        <circle cx="12" cy="14" r="8" />
      </svg>
      <span className="tabular-nums">
        話した時間 {formatSeconds(durationSec)}
      </span>
      {limitSec !== null && overSec !== null && (
        // 色だけで伝えないよう、オーバーかどうかは文字でも書く
        <span
          className={
            overSec > 0
              ? 'badge tabular-nums badge-error'
              : 'badge tabular-nums badge-success'
          }
        >
          {overSec > 0
            ? `目安 ${formatSeconds(limitSec)} を ${formatSeconds(overSec)} オーバー`
            : `目安 ${formatSeconds(limitSec)} 以内`}
        </span>
      )}
    </div>
  )
}
