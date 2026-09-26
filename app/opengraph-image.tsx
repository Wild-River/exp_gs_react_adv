// app/opengraph-image.tsx
// SNSやチャットにURLを貼ったときに出る画像（OGP）。全ページ共通で使われる
// ビルド時に1回だけ作られ、以降は同じ画像が返る（リクエストごとの情報を使っていないため）
import { ImageResponse } from 'next/og'

export const alt =
  'AI練習コーチ — 声と表情をAIが見て、何度でも講評してくれる練習アプリ'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// 画像に出す文字（フォントはこの文字の分だけ取得する）
const LABEL = '面接・スピーチの練習アプリ'
const TITLE = 'AI練習コーチ'
const SUBTITLE = '声と表情をAIが見て、何度でも講評してくれる'

// ImageResponse は woff2 を読めず、日本語フォントを丸ごと同梱すると上限（500KB）を超える
// → Google Fonts から、使う文字だけを含んだ ttf を取ってくる（text= を付けると ttf が返る）
async function loadGoogleFont(family: string, weight: number, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${family.replaceAll(' ', '+')}:wght@${weight}&text=${encodeURIComponent(text)}`
  const css = await (await fetch(url)).text()
  const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)
  if (!src) throw new Error(`フォントの取得に失敗しました: ${family}`)
  const res = await fetch(src[1])
  if (!res.ok) throw new Error(`フォントの取得に失敗しました: ${family}`)
  return res.arrayBuffer()
}

export default async function Image() {
  const [titleFont, bodyFont] = await Promise.all([
    loadGoogleFont('Zen Kaku Gothic Antique', 700, TITLE),
    loadGoogleFont('Zen Kaku Gothic New', 700, LABEL + SUBTITLE),
  ])

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 96px 0 112px',
        background: '#E7F1EE',
        color: '#16302E',
        fontFamily: 'Zen Kaku Gothic New',
      }}
    >
      {/* 左端の緑の帯（発表スライドと同じ見た目） */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 16,
          height: '100%',
          background: '#2BA394',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            padding: '8px 24px',
            borderRadius: 999,
            background: '#F4D29C',
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          {LABEL}
        </div>
        <div
          style={{
            fontFamily: 'Zen Kaku Gothic Antique',
            fontSize: 112,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {TITLE}
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#4A5B59' }}>
          {SUBTITLE}
        </div>
      </div>

      {/* 右側のマイク（lucide の mic アイコン） */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 240,
          height: 240,
          borderRadius: 999,
          background: '#FDFDFB',
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0F766E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Zen Kaku Gothic Antique', data: titleFont, weight: 700 },
        { name: 'Zen Kaku Gothic New', data: bodyFont, weight: 700 },
      ],
    },
  )
}
