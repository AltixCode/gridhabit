/**
 * A `SqlDriver` backed by Node's built-in SQLite, so the repository layer can
 * be exercised against a real SQL engine in unit tests rather than a fake.
 */
import { DatabaseSync } from 'node:sqlite';

import type { SqlDriver, SqlParam } from '../driver';

export function createTestDriver(): SqlDriver & { close(): void } {
  const db = new DatabaseSync(':memory:');
  const toArgs = (params: readonly SqlParam[] = []) =>
    params.map((p) => (p === undefined ? null : p)) as never[];

  return {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, params: readonly SqlParam[] = []) {
      const result = db.prepare(sql).run(...toArgs(params));
      return { changes: Number(result.changes) };
    },
    async getAllAsync<T>(sql: string, params: readonly SqlParam[] = []) {
      return db.prepare(sql).all(...toArgs(params)) as T[];
    },
    async getFirstAsync<T>(sql: string, params: readonly SqlParam[] = []) {
      const row = db.prepare(sql).get(...toArgs(params));
      return (row ?? null) as T | null;
    },
    async withTransactionAsync(fn: () => Promise<void>) {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close() {
      db.close();
    },
  };
}
