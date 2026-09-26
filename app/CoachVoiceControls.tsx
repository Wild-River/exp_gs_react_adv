// app/CoachVoiceControls.tsx
// 講評の音声まわりの見た目だけの部品。練習画面と詳細ページで同じ見た目にするために使う
// 音声の状態は親の useCoachVoice が持つ
// 並び：1段目 CoachVoicePlayer（再生）／2段目の先頭 VoiceDownloadButton（その右にメールなど）

// 音声の段。音声は自動で作るので、ボタンは「作れなかったとき」だけ出す
// - 作成中：準備中の表示（押せるものではないので、ボタンにはしない）
// - できた：再生プレーヤー
// - 失敗した／まだ作っていない：「コーチの声で聞く」ボタン（押すともう一度作る）
export function CoachVoicePlayer({
  audioSrc,
  generating,
  disabled = false,
  onSpeak,
}: {
  audioSrc: string | null
  generating: boolean
  disabled?: boolean // 親の都合で出さないとき（練習画面で講評を作り直している途中など）
  onSpeak: () => void
}) {
  if (audioSrc) {
    // 標準メニューのダウンロードは data: URL だとファイル名を指定できず「ダウンロード」になるので消し、
    // ファイル名を付けられる「音声をダウンロード」ボタンに一本化する
    return <audio src={audioSrc} controls controlsList="nodownload" />
  }
  if (generating) {
    return (
      <p role="status" className="flex items-center gap-2 text-gray-500">
        <span className="loading loading-sm loading-spinner" aria-hidden />
        コーチの声を準備中…
      </p>
    )
  }
  if (disabled) return null
  return (
    <button onClick={onSpeak} className="btn btn-primary">
      コーチの声で聞く
    </button>
  )
}

// 「音声をダウンロード」ボタン。音声ができてから出す
export function VoiceDownloadButton({
  audioSrc,
  onDownload,
}: {
  audioSrc: string | null
  onDownload: () => void
}) {
  if (!audioSrc) return null
  return (
    <button onClick={onDownload} className="btn btn-outline btn-primary">
      音声をダウンロード
    </button>
  )
}
