// drizzle.config.ts
import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' }) // .env.local の DATABASE_URL を読む

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
