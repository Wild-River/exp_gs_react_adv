// app/JudgeChat.tsx
// AIコーチとのやりとりの吹き出し（コーチは左、自分は右）とまとめの講評。見た目だけの部品
// 練習画面（JudgePanel）と詳細ページで同じ見た目にするために使う
import { JUDGE_QUESTION_COUNT } from './practice'
import CoachFeedbackText from './CoachFeedbackText'

export type JudgeTurn = {
  turnNo: number
  question: string
  answerText: string | null
  review: string | null
}

// 吹き出し1つ。左はコーチ、右はあなた（形と色は globals.css の .speech-bubble）
function Bubble({
  side,
  label,
  text,
}: {
  side: 'left' | 'right'
  label: string
  text: string
}) {
  return (
    <div
      className={
        side === 'left'
          ? 'flex flex-col items-start'
          : 'flex flex-col items-end'
      }
    >
      <span
        className={
          side === 'left'
            ? 'mb-1 ml-4 text-xs text-gray-500'
            : 'mr-4 mb-1 text-xs text-gray-500'
        }
      >
        {label}
      </span>
      <div
        className={
          side === 'left' ? 'speech-bubble speech-bubble-left' : 'speech-bubble'
        }
      >
        {text}
      </div>
    </div>
  )
}

export default function JudgeChat({
  turns,
  summary,
  summaryClassName = 'leading-10',
}: {
  turns: JudgeTurn[]
  summary: string | null
  summaryClassName?: string // 総評の行間。同じページのコーチの講評とそろえる（練習画面は leading-12）
}) {
  return (
    <>
      <div className="space-y-5">
        {turns.map((t) => (
          <div key={t.turnNo} className="space-y-5">
            <Bubble
              side="left"
              label={`コーチ・質問${t.turnNo}/${JUDGE_QUESTION_COUNT}`}
              text={t.question}
            />
            {t.answerText && (
              <Bubble side="right" label="あなた" text={t.answerText} />
            )}
            {/* 以前の、1問ごとに講評していた記録だけに出る */}
            {t.review && (
              <Bubble side="left" label="コーチ・講評" text={t.review} />
            )}
          </div>
        ))}
      </div>

      {/* 総評は、コーチの講評（良かった点・改善点）と同じ見た目にする
          見出しを **〜** で書いて同じ部品に渡すと、見出しは太字のteal、本文は点線の下線になる */}
      {summary && (
        <div
          className={`mt-6 rounded-lg bg-teal-50 px-12 pt-8 pb-5 ${summaryClassName}`}
        >
          <CoachFeedbackText>{`**コーチからの総評**\n\n${summary}`}</CoachFeedbackText>
        </div>
      )}
    </>
  )
}
