import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useToday } from '../useToday';

describe('useToday', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the current local date key', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 13, 10, 0, 0));
    const { result } = await renderHook(() => useToday());
    expect(result.current).toBe('2026-09-13');
  });

  it('uses the local day, not the UTC one, late at night', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 13, 23, 59, 30));
    const { result } = await renderHook(() => useToday());
    expect(result.current).toBe('2026-09-13');
  });

  it('rolls over when the local midnight timer fires', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 13, 23, 59, 0));
    const { result } = await renderHook(() => useToday());
    expect(result.current).toBe('2026-09-13');

    await act(async () => {
      jest.advanceTimersByTime(2 * 60 * 1000); // Past midnight.
    });
    expect(result.current).toBe('2026-09-14');
  });

  it('re-reads the date when the app returns to the foreground', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 13, 12, 0, 0));
    const spy = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never);
    const { result } = await renderHook(() => useToday());
    expect(result.current).toBe('2026-09-13');

    const handler = spy.mock.calls.at(-1)?.[1] as (s: string) => void;
    // The device was asleep across midnight — or flew into a new timezone.
    jest.setSystemTime(new Date(2026, 8, 15, 8, 0, 0));
    await act(async () => {
      handler('active');
    });
    expect(result.current).toBe('2026-09-15');
    spy.mockRestore();
  });

  it('ignores a background transition', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 13, 12, 0, 0));
    const spy = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never);
    const { result } = await renderHook(() => useToday());

    const handler = spy.mock.calls.at(-1)?.[1] as (s: string) => void;
    jest.setSystemTime(new Date(2026, 8, 15, 8, 0, 0));
    await act(async () => {
      handler('background');
    });
    expect(result.current).toBe('2026-09-13');
    spy.mockRestore();
  });

  it('removes its app-state listener on unmount', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 13, 12, 0, 0));
    const remove = jest.fn();
    const spy = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove } as never);

    const { unmount } = await renderHook(() => useToday());
    await act(async () => {
      unmount();
    });

    expect(remove).toHaveBeenCalled();
    spy.mockRestore();
  });
});
