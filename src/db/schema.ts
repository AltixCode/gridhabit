import type { SqlDriver } from './driver';

/**
 * Forward-only schema migrations, keyed by the SQLite `user_version` they
 * produce. Each entry runs exactly once, in order, inside a transaction.
 * Never edit a shipped migration — add a new one.
 */
export const MIGRATIONS: readonly string[][] = [
  // v1 — initial schema.
  [
    `CREATE TABLE IF NOT EXISTS habits (
       id               TEXT PRIMARY KEY NOT NULL,
       name             TEXT NOT NULL,
       color            TEXT NOT NULL,
       icon             TEXT,
       frequency        TEXT NOT NULL,
       created_at       TEXT NOT NULL,
       archived         INTEGER NOT NULL DEFAULT 0,
       sort_order       INTEGER NOT NULL DEFAULT 0,
       reminder_enabled INTEGER NOT NULL DEFAULT 0,
       reminder_time    TEXT,
       notification_id  TEXT
     )`,
    `CREATE TABLE IF NOT EXISTS completions (
       id           TEXT PRIMARY KEY NOT NULL,
       habit_id     TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
       date         TEXT NOT NULL,
       completed_at TEXT NOT NULL,
       UNIQUE(habit_id, date)
     )`,
    // The grid and streak queries are always "this habit, this date range",
    // so the composite index carries both predicates and keeps them index-only.
    `CREATE INDEX IF NOT EXISTS idx_completions_habit_date
       ON completions(habit_id, date)`,
    `CREATE INDEX IF NOT EXISTS idx_completions_date
       ON completions(date)`,
    `CREATE INDEX IF NOT EXISTS idx_habits_archived_order
       ON habits(archived, sort_order)`,
  ],
];

export const CURRENT_SCHEMA_VERSION = MIGRATIONS.length;

/** Applies every migration the database has not seen yet. Safe to re-run. */
export async function migrate(db: SqlDriver): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= CURRENT_SCHEMA_VERSION) return;

  for (let version = current; version < CURRENT_SCHEMA_VERSION; version += 1) {
    const statements = MIGRATIONS[version];
    if (!statements) continue;
    for (const statement of statements) {
      await db.execAsync(statement);
    }
    // PRAGMA does not accept bound parameters; the value is a loop counter.
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}
