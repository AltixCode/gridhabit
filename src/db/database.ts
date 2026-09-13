import type { SQLiteDatabase } from 'expo-sqlite';

import type { SqlDriver } from './driver';
import { migrate } from './schema';

export const DATABASE_NAME = 'gridhabit.db';

/**
 * `expo-sqlite`'s `SQLiteDatabase` already implements every method in
 * `SqlDriver`, so this is a type-level adapter rather than a runtime one — the
 * repository never sees a wrapper object it would have to allocate per call.
 */
export function asDriver(db: SQLiteDatabase): SqlDriver {
  return db as unknown as SqlDriver;
}

/** Passed to `<SQLiteProvider onInit>` — runs migrations before first render. */
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await migrate(asDriver(db));
}
