'use client'
// app/NavLinks.tsx
// 今いるページを知るには usePathname（クライアント専用）が必要なので、ナビのリンク部分だけ Client Component に分ける

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'ホーム' },
  { href: '/history', label: '練習の記録' },
]

// ナビのリンク：hover で下線（border-bottom）を出す
const base =
  'mx-2 border-b-2 py-1 font-semibold transition-colors hover:border-teal-600 hover:text-teal-600'
// 今いるページは下線を出し続ける
const active = 'border-teal-600 text-teal-600'
const inactive = 'border-transparent'

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <>
      {links.map(({ href, label }) => {
        // ホームは完全一致、それ以外は配下のページ（/history/1 など）も含める
        const isActive =
          href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`${base} ${isActive ? active : inactive}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}
