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
  title: 'プレゼン&就活面接 AIコーチ',
  description: 'あなたのプレゼンをAIがコーチング',
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
                  プレゼン&就活面接 AIコーチ
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
