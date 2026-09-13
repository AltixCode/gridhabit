/**
 * Collision-resistant, lexicographically sortable ids.
 *
 * Deliberately dependency-free: the repository layer must be unit-testable in
 * a plain Node process, so it cannot reach for a native crypto module.
 */
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function randomChunk(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** A 20-character id: a millisecond timestamp prefix plus 12 random chars. */
export function createId(): string {
  return `${Date.now().toString(36).padStart(8, '0')}${randomChunk(12)}`;
}
