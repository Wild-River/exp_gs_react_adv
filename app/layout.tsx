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
  title: 'AI練習コーチ',
  description: '表情・音声・AIで練習するコーチ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="ja">
        <body>
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
