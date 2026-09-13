/**
 * The minimal SQL surface the repository layer depends on.
 *
 * `expo-sqlite`'s `SQLiteDatabase` already satisfies this shape, so the app
 * passes its real database straight through; tests pass a `node:sqlite`-backed
 * adapter with the same interface. Nothing in `repository.ts` imports a native
 * module, which is what keeps the data layer unit-testable.
 */
export type SqlParam = string | number | null;

export interface SqlDriver {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: readonly SqlParam[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: readonly SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: readonly SqlParam[]): Promise<T | null>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}
