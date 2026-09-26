// app/practice.ts
// 練習の設定（お題・制限時間・文字数の上限）。画面（page.tsx）とAPIの両方から使う

export type Topic = {
  label: string // DBの topic 列にこの文字列がそのまま保存される。表記を変えると履歴で別のお題に見えるので注意
  limitSec: number | null // 制限時間（秒）。null は制限なし＝カウントアップだけ
}

export const TOPICS: Topic[] = [
  { label: '自己紹介を1分で', limitSec: 60 },
  { label: '志望動機', limitSec: 60 },
  { label: '自分の強み', limitSec: 60 },
  { label: '転職理由', limitSec: 60 },
  { label: '5分スピーチ', limitSec: 300 },
]

// 回答の文字数上限。話す速さは1分≈300字なので、約10分ぶん
export const MAX_ANSWER_LENGTH = 3000

// 話した秒数として受け付ける上限（1時間）。これを超える値は計測なし扱いにする
export const MAX_DURATION_SEC = 60 * 60

// DBの text 型は無制限なので、サーバー側で必ず上限を設ける
export const MAX_TOPIC_LENGTH = 100
export const MAX_MEMO_LENGTH = 500

// 任意テキスト項目の検証（未入力は null として保存する）
// 戻り値は「検証OKなら値、NGなら false」— 値が null になりうるので false で失敗を表す
export function parseOptionalText(
  value: unknown,
  max: number,
): string | null | false {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length > max) return false
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

// お題の名前から制限時間を取り出す（一覧にないお題は制限なし）
export function findLimitSec(label: string): number | null {
  return TOPICS.find((t) => t.label === label)?.limitSec ?? null
}

// 秒を「m:ss」の形にする（例: 65 → "1:05"）
export function formatSeconds(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

// 講評の音声を保存するときのファイル名（例: coach_自己紹介を1分で_9-26.mp3）
// 日付は日本時間で出し（サーバーはUTCで動くことがある）、ファイル名に使えない文字は _ にする
export function coachAudioFileName(topic: string, date: Date): string {
  const day = date
    .toLocaleDateString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: 'numeric',
      day: 'numeric',
    })
    .replaceAll('/', '-')
  return `coach_${topic}_${day}.mp3`.replace(/[\\/:*?"<>|\s]/g, '_')
}
