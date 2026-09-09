import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'プレゼン&就活面接 AIコーチ',
  description: 'あなたのプレゼンをAIがコーチング',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
