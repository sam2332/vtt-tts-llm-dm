import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')

  // Ensure directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = join(dbDir, 'ai-dm-listener.db')
  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')

  // Create tables
  createTables()

  console.log(`Database initialized at: ${dbPath}`)
}

function createTables(): void {
  if (!db) return

  // Speakers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS speakers (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      voice_embedding BLOB,
      color_code TEXT NOT NULL,
      enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      accuracy REAL DEFAULT 0.0
    )
  `)

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      campaign_name TEXT NOT NULL,
      current_scene TEXT,
      scene_mode TEXT DEFAULT 'exploration',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_saved DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Transcripts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      speaker_id TEXT,
      text TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      confidence REAL DEFAULT 1.0,
      edited INTEGER DEFAULT 0,
      embedding BLOB,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (speaker_id) REFERENCES speakers(id)
    )
  `)

  // Characters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      player_id TEXT,
      name TEXT NOT NULL,
      class TEXT,
      level INTEGER DEFAULT 1,
      stats_str INTEGER DEFAULT 10,
      stats_dex INTEGER DEFAULT 10,
      stats_con INTEGER DEFAULT 10,
      stats_int INTEGER DEFAULT 10,
      stats_wis INTEGER DEFAULT 10,
      stats_cha INTEGER DEFAULT 10,
      skills TEXT,
      abilities TEXT,
      inventory TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES speakers(id)
    )
  `)

  // Knowledge entries table (for RAG)
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      embedding BLOB,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      source TEXT DEFAULT 'user_input',
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `)

  // Checkpoints table
  db.exec(`
    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      state_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `)

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transcripts_session ON transcripts(session_id);
    CREATE INDEX IF NOT EXISTS idx_transcripts_timestamp ON transcripts(timestamp);
    CREATE INDEX IF NOT EXISTS idx_knowledge_session ON knowledge(session_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category);
  `)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
