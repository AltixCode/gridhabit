import { Directory, File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

import type { SqlDriver } from '@/db/driver';
import { listAllCompletionDates, listHabits } from '@/db/repository';
import type { DateKey } from '@/logic/dates';

import {
  exportFileName,
  mimeTypeFor,
  toCsv,
  toJson,
  type ExportFormat,
} from './serialize';

/**
 * Writes an export to a temporary file and hands it to the system share sheet.
 *
 * The file goes in the CACHE directory, not documents: it is a transient
 * artefact the user is about to send somewhere, and leaving copies of a
 * person's full habit history lying around in app storage is exactly the kind
 * of quiet data accumulation this app promises not to do. Any previous export
 * is removed first for the same reason.
 */

export type ShareResult =
  | { status: 'shared' }
  | { status: 'unavailable' }
  | { status: 'empty' }
  | { status: 'error'; message: string };

const EXPORT_DIR = 'exports';

function exportDirectory(): Directory {
  const dir = new Directory(Paths.cache, EXPORT_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Deletes any previously written export files. */
export function clearExports(): void {
  try {
    const dir = new Directory(Paths.cache, EXPORT_DIR);
    if (dir.exists) dir.delete();
  } catch {
    // A cache directory we cannot clear is not worth failing the export over;
    // the OS reclaims it anyway.
  }
}

export async function shareExport(
  db: SqlDriver,
  format: ExportFormat,
  today: DateKey,
  now: Date = new Date(),
): Promise<ShareResult> {
  try {
    const [habits, completionMap] = await Promise.all([
      listHabits(db, { includeArchived: true }),
      listAllCompletionDates(db),
    ]);

    if (habits.length === 0) return { status: 'empty' };

    const input = {
      habits,
      completions: Object.fromEntries(completionMap),
      exportedAt: now.toISOString(),
    };
    const contents = format === 'csv' ? toCsv(input) : toJson(input);

    if (!(await isAvailableAsync())) return { status: 'unavailable' };

    clearExports();
    const file = new File(exportDirectory(), exportFileName(format, today));
    file.create({ overwrite: true });
    file.write(contents);

    await shareAsync(file.uri, {
      mimeType: mimeTypeFor(format),
      dialogTitle: 'Export GridHabit data',
      UTI: format === 'csv' ? 'public.comma-separated-values-text' : 'public.json',
    });

    return { status: 'shared' };
  } catch (error) {
    return { status: 'error', message: (error as Error).message };
  }
}
