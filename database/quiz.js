import { DatabaseSync } from 'node:sqlite'
import settings from '../config/settings.js'

const db = new DatabaseSync(settings.dbPath)

// إنشاء جدول الفوازير لو مش موجود
db.exec(`
  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT UNIQUE NOT NULL,
    options TEXT NOT NULL,
    answer INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )
`)

// هل الفزورة موجودة قبل كده؟
export function quizExists(question) {
  const stmt = db.prepare(`
    SELECT id
    FROM quizzes
    WHERE question = ?
    LIMIT 1
  `)

  return !!stmt.get(question)
}

// حفظ فزورة جديدة
export function saveQuiz(quiz) {
  const stmt = db.prepare(`
    INSERT INTO quizzes
      (question, options, answer, created_at)
    VALUES
      (?, ?, ?, ?)
  `)

  stmt.run(
    quiz.question,
    JSON.stringify(quiz.options),
    quiz.answer,
    Date.now()
  )
}

// جلب فزورة عشوائية محفوظة
export function getRandomQuiz() {
  const stmt = db.prepare(`
    SELECT question, options, answer
    FROM quizzes
    ORDER BY RANDOM()
    LIMIT 1
  `)

  const row = stmt.get()

  if (!row) return null

  return {
    question: row.question,
    options: JSON.parse(row.options),
    answer: row.answer
  }
}
