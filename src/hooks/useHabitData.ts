import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import { asDriver } from '@/db/database';
import type { SqlDriver } from '@/db/driver';

/** The repository driver for the open database. */
export function useDb(): SqlDriver {
  const db = useSQLiteContext();
  return useMemo(() => asDriver(db), [db]);
}
