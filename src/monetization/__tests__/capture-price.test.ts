/**
 * The capture-mode price fallback, multi-plan shape.
 *
 * This app lists several plans rather than one, so it exposes `orderedPackages`
 * returning an array instead of `lifetimePackage` returning one package — which
 * is why it was skipped by the fleet-wide rollout of both the fallback and its
 * tests, and why its branches went uncovered until CI caught it on a 0.11%
 * coverage miss.
 *
 * The property that matters is the last one: this fabricates a package, and a
 * fabricated package must never be able to reach a real user.
 */
import { orderedPackages } from '../purchases';

const ORIGINAL_PRICE = process.env.EXPO_PUBLIC_CAPTURE_PRICE;
const ORIGINAL_MODE = process.env.EXPO_PUBLIC_CAPTURE_MODE;

afterEach(() => {
  if (ORIGINAL_PRICE === undefined) delete process.env.EXPO_PUBLIC_CAPTURE_PRICE;
  else process.env.EXPO_PUBLIC_CAPTURE_PRICE = ORIGINAL_PRICE;
  if (ORIGINAL_MODE === undefined) delete process.env.EXPO_PUBLIC_CAPTURE_MODE;
  else process.env.EXPO_PUBLIC_CAPTURE_MODE = ORIGINAL_MODE;
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
});

function captureBuild(price?: string) {
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  process.env.EXPO_PUBLIC_CAPTURE_MODE = '1';
  if (price === undefined) delete process.env.EXPO_PUBLIC_CAPTURE_PRICE;
  else process.env.EXPO_PUBLIC_CAPTURE_PRICE = price;
}

describe('capture-mode price fallback', () => {
  it('supplies one priced package when there is no offering', () => {
    captureBuild('3.99');
    const packages = orderedPackages(null);
    expect(packages).toHaveLength(1);
    expect(packages[0]!.product.priceString).toBe('$3.99');
  });

  it('does not double a currency mark that is already there', () => {
    captureBuild('$5.99');
    expect(orderedPackages(null)[0]!.product.priceString).toBe('$5.99');
  });

  it('also covers an offering that resolves to no usable package', () => {
    // Same empty paywall as a missing offering, so it takes the same path.
    captureBuild('3.99');
    const empty = { availablePackages: [] } as never;
    expect(orderedPackages(empty)).toHaveLength(1);
  });

  it('returns nothing when capture mode is on but no price was given', () => {
    captureBuild(undefined);
    expect(orderedPackages(null)).toEqual([]);
  });

  it('returns nothing in an ordinary debug build', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    delete process.env.EXPO_PUBLIC_CAPTURE_MODE;
    process.env.EXPO_PUBLIC_CAPTURE_PRICE = '3.99';
    expect(orderedPackages(null)).toEqual([]);
  });

  it('returns nothing in a release build even with both set', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    process.env.EXPO_PUBLIC_CAPTURE_MODE = '1';
    process.env.EXPO_PUBLIC_CAPTURE_PRICE = '3.99';
    expect(orderedPackages(null)).toEqual([]);
  });
});
