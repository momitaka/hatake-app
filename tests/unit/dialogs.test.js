// @ts-check
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dispToISO } from '../../hatake_files_v24/js/dialogs.js';

describe('dispToISO', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('"M/D"を今年のYYYY-MM-DDに変換する', () => {
    vi.setSystemTime(new Date(2026, 6, 20));
    expect(dispToISO('7/5')).toBe('2026-07-05');
  });

  it('月日の1桁を0埋めする', () => {
    vi.setSystemTime(new Date(2026, 0, 1));
    expect(dispToISO('3/9')).toBe('2026-03-09');
  });

  it('年をまたいでも実行時点の年を使う', () => {
    vi.setSystemTime(new Date(2027, 3, 1));
    expect(dispToISO('12/31')).toBe('2027-12-31');
  });

  it('空文字はnullを返す', () => {
    expect(dispToISO('')).toBeNull();
  });

  it('"/"区切りでない文字列はnullを返す', () => {
    expect(dispToISO('2026-07-05')).toBeNull();
  });
});
