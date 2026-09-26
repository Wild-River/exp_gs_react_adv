// app/Breadcrumbs.tsx
// パンくずリスト（daisyUI の breadcrumbs）。今いる場所と、戻り先を見出しの上に出す
// 最後の項目が今いるページ（リンクにしない）
import Link from 'next/link'

export type Crumb = { label: string; href?: string }

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs mb-6 text-sm" aria-label="パンくずリスト">
      <ul>
        {items.map((item, i) => {
          const isCurrent = i === items.length - 1
          return (
            <li key={item.label} aria-current={isCurrent ? 'page' : undefined}>
              {item.href && !isCurrent ? (
                <Link href={item.href} className="text-teal-600">
                  {item.label}
                </Link>
              ) : (
                item.label
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
