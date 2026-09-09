// src/db/schema.ts
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core'

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(), // 通し番号（主キー・自動）
  userId: text('user_id').notNull(), // 誰のデータか
  topic: text('topic').notNull(), // お題
  answerText: text('answer_text'), // 回答
  smileScore: integer('smile_score'), // 笑顔スコア
  feedback: text('feedback'), // AIのフィードバック
  createdAt: timestamp('created_at').defaultNow().notNull(), // 作成日時
})
