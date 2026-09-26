// src/db/schema.ts
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'

// pnpm exec drizzle-kit pushで実行する
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(), // 通し番号（主キー・自動）
  userId: text('user_id').notNull(), // 誰のデータか
  topic: text('topic').notNull(), // お題
  answerText: text('answer_text'), // 回答
  smileScore: integer('smile_score'), // 笑顔スコア
  feedback: text('feedback'), // AIのフィードバック
  createdAt: timestamp('created_at').defaultNow().notNull(), // 作成日時
  memo: text('memo'),
  // 共有用のトークン。null なら非公開＝/share では見られない
  // 連番のidと違って推測できないので、リンクを知っている人だけが開ける
  shareId: text('share_id').unique(),
  durationSec: integer('duration_sec'), // 話した時間（秒）。null は計測なし
  // 保存した時点の目安時間（秒）。null は制限なし
  // practice.ts の秒数をあとで変えても、過去の記録は当時の目安で判定できるように残しておく
  limitSec: integer('limit_sec'),
  judgeSummary: text('judge_summary'), // AIコーチとの質疑応答のまとめの講評（まだ終わっていなければ null）
})

// AIコーチとのやりとり1問ぶん。1つの練習（sessions）に最大3行つく「1対多」
export const judgeTurns = pgTable(
  'judge_turns',
  {
    id: serial('id').primaryKey(),
    // どの練習の質疑応答か。練習の記録を消したら、やりとりも一緒に消す（cascade）
    // （cascade がないと、やりとりがある記録を削除しようとしたときにDBのエラーで消せなくなる）
    sessionId: integer('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    turnNo: integer('turn_no').notNull(), // 何問目か（1〜3）
    question: text('question').notNull(), // コーチの質問
    answerText: text('answer_text'), // ユーザーの回答（答えるまでは null）
    review: text('review'), // 回答への短い講評（講評するまでは null）
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  // 同じ練習に同じ問題番号を二重に作らない（ボタンの連打などで重なったときもDBが止める）
  (t) => [unique().on(t.sessionId, t.turnNo)],
)
