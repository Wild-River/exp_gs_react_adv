// app/layout.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import NavLinks from './NavLinks'
import { ToastProvider } from './Toast'
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'

export const metadata: Metadata = {
  // 各ページで title を決めると「〇〇｜AI練習コーチ」になる（決めていないページは default）
  title: { default: 'AI練習コーチ', template: '%s｜AI練習コーチ' },
  description:
    '声と表情をAIが見て、何度でも講評してくれる面接・スピーチの練習アプリ',
  // SNSに貼ったときの表示。画像は app/opengraph-image.tsx で作る
  // 画像のURLは metadataBase から作られる（未設定でも Vercel ではデプロイ先のURLになる）
  openGraph: {
    title: 'AI練習コーチ',
    description: '声と表情をAIが見て、何度でも講評してくれる練習アプリ',
    siteName: 'AI練習コーチ',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="ja" className="h-full antialiased">
        <body className="flex min-h-full flex-col">
          <ToastProvider>
            <header className="navbar bg-base-100 px-4 shadow-sm sm:px-6 lg:px-8">
              {/* 左：アプリ名（トップへ戻るリンク） */}
              <div className="flex-1">
                <Link
                  href="/"
                  className="text-lg font-bold text-teal-600 transition-opacity hover:opacity-70"
                >
                  AI練習コーチ
                </Link>
              </div>
              {/* 右：ナビとログイン状態 */}
              <div className="flex flex-none items-center gap-2">
                <NavLinks />
                <SignedOut>
                  <SignInButton>
                    <button className="btn btn-primary">ログイン</button>
                  </SignInButton>
                  <SignUpButton>
                    <button className="btn btn-outline btn-primary">
                      新規登録
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </div>
            </header>
            {children}
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
