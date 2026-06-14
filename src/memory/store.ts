import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";

// ── Database location 
// Stored in ~/.octopus/memory.db so it persists across sessions

const OCTOPUS_DIR = path.join(os.homedir(), ".octopus");
const DB_PATH = path.join(OCTOPUS_DIR, "memory.db");

// Ensure ~/.octopus directory exists
if (!fs.existsSync(OCTOPUS_DIR)) {
  fs.mkdirSync(OCTOPUS_DIR, { recursive: true });
}

// ── Init database 
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    role      TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content   TEXT NOT NULL,
    action    TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS preferences (
    key       TEXT PRIMARY KEY,
    value     TEXT NOT NULL,
    updated   DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── Types
export interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  action?: string;
  timestamp?: string;
}

// ── Message operations 
export function addMessage(
  role: "user" | "assistant",
  content: string,
  action?: string,
): void {
  const stmt = db.prepare(
    "INSERT INTO messages (role, content, action) VALUES (?, ?, ?)",
  );
  stmt.run(role, content, action ?? null);
}

export function getRecentMessages(limit: number = 10): Message[] {
  const stmt = db.prepare(`
    SELECT role, content, action, timestamp
    FROM messages
    ORDER BY id DESC
    LIMIT ?
  `);

  const rows = stmt.all(limit) as Message[];

  // Return in chronological order (oldest first)
  return rows.reverse();
}

export function clearMemory(): void {
  db.prepare("DELETE FROM messages").run();
}

export function getMessageCount(): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM messages").get() as {
    count: number;
  };
  return row.count;
}

// ── Preference operations 
export function setPreference(key: string, value: string): void {
  db.prepare(
    `
    INSERT INTO preferences (key, value, updated)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated = CURRENT_TIMESTAMP
  `,
  ).run(key, value);
}

export function getPreference(key: string): string | null {
  const row = db
    .prepare("SELECT value FROM preferences WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

// ── Session summary 
export function getSessionStats(): {
  totalMessages: number;
  dbPath: string;
} {
  return {
    totalMessages: getMessageCount(),
    dbPath: DB_PATH,
  };
}
