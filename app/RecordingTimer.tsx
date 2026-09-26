// app/RecordingTimer.tsx
// 話している時間の表示。制限時間があれば残り時間（カウントダウン）、なければ経過時間（カウントアップ）
import { formatSeconds } from './practice'

export default function RecordingTimer({
  elapsedSec,
  limitSec,
  phase,
}: {
  elapsedSec: number
  limitSec: number | null
  phase: 'idle' | 'recording' | 'done' // 録音前／録音中／録音後
}) {
  // 録音前は目安だけを出す
  if (phase === 'idle') {
    return (
      <div className="text-lg text-gray-500">
        {limitSec !== null
          ? `目安 ${formatSeconds(limitSec)}`
          : '制限なし（話した時間を計ります）'}
      </div>
    )
  }

  const label = phase === 'recording' ? '経過' : '話した時間'

  // 制限なし：経過時間をそのまま出す
  if (limitSec === null) {
    return (
      <div role="timer" className="flex items-baseline gap-3">
        <span className="text-lg font-semibold">{label}</span>
        <span className="text-4xl font-bold text-teal-700 tabular-nums">
          {formatSeconds(elapsedSec)}
        </span>
      </div>
    )
  }

  // 残り時間は state にせず、経過時間から毎回計算する
  const remainingSec = limitSec - elapsedSec
  const isOver = remainingSec < 0
  const isNearEnd = !isOver && remainingSec <= limitSec * 0.2 // 残り2割を切ったら注意

  // Tailwind はソースに書かれたクラス名をそのまま探すので、組み立てずに完成した名前で切り替える
  const textClass = isOver
    ? 'text-error'
    : isNearEnd
      ? 'text-amber-600'
      : 'text-teal-700'
  const progressClass = isOver
    ? 'progress progress-error w-full'
    : isNearEnd
      ? 'progress progress-warning w-full'
      : 'progress progress-primary w-full'

  return (
    <div role="timer" className="space-y-2">
      <div className="flex items-baseline gap-3">
        <span className="text-lg font-semibold">
          {isOver ? 'オーバー' : phase === 'recording' ? '残り' : '残り時間'}
        </span>
        <span className={`text-4xl font-bold tabular-nums ${textClass}`}>
          {isOver
            ? `+${formatSeconds(-remainingSec)}`
            : formatSeconds(remainingSec)}
        </span>
        <span className="text-sm text-gray-500 tabular-nums">
          {label} {formatSeconds(elapsedSec)} ／ 目安 {formatSeconds(limitSec)}
        </span>
      </div>
      <progress
        className={progressClass}
        value={Math.min(elapsedSec, limitSec)}
        max={limitSec}
      />
    </div>
  )
}
