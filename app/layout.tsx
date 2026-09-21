// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
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
          <header
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: 12,
            }}
          >
            <SignedOut>
              <SignInButton />
              <SignUpButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
