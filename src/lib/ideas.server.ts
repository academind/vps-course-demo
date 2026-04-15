import { mkdirSync } from 'node:fs'
import Database from 'better-sqlite3'

mkdirSync('data', { recursive: true })

const db = new Database('data/ideas.db')
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idea TEXT NOT NULL
  )
`)

const insertStmt = db.prepare('INSERT INTO ideas (idea) VALUES (?)')

export function insertIdea(idea: string): void {
  insertStmt.run(idea)
}
