// app/CoachFeedbackText.tsx
// コーチの講評の文章の見た目（見出しは太字のteal、本文は点線の下線）。見た目だけの部品
// 講評（良かった点・改善点）と、質疑応答の総評で同じ見た目にするために使う
// 文字の大きさと行間は、置く場所（講評カード）の text-lg ／ leading-* を引き継ぐ
import ReactMarkdown from 'react-markdown'

export default function CoachFeedbackText({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        // 出力のMarkdownの中に出てきたtagに指定した処理を使う
        strong: ({ children }) => (
          <strong className="mb-4 block font-bold text-teal-700">
            {children}
          </strong>
        ),
        p: ({ children }) => (
          <p className="even:pb-10">
            <span className="border-b-2 border-dotted border-slate-400 pb-2 nth-[2]:border">
              {children}
            </span>
          </p>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
