// @ts-check
import { describe, it, expect } from 'vitest';
import { K, isoFull, isoShort, daysBetween } from '../../hatake_files_v24/js/date-utils.js';

describe('K', () => {
  it('行列番号から "行,列" 形式のセルキーを作る', () => {
    expect(K(2, 3)).toBe('2,3');
  });
  it('0行0列も正しく扱う', () => {
    expect(K(0, 0)).toBe('0,0');
  });
});

describe('isoFull', () => {
  it('YYYY-MM-DDを「Y年M月D日」に変換する', () => {
    expect(isoFull('2026-07-05')).toBe('2026年7月5日');
  });
  it('月日の先頭0を除去する', () => {
    expect(isoFull('2026-01-09')).toBe('2026年1月9日');
  });
  it('空文字は空文字を返す', () => {
    expect(isoFull('')).toBe('');
  });
});

describe('isoShort', () => {
  it('YYYY-MM-DDを「Y/M/D」に変換する', () => {
    expect(isoShort('2026-07-05')).toBe('2026/7/5');
  });
  it('月日の先頭0を除去する', () => {
    expect(isoShort('2026-01-09')).toBe('2026/1/9');
  });
  it('空文字は空文字を返す', () => {
    expect(isoShort('')).toBe('');
  });
});

describe('daysBetween', () => {
  it('後の日付が未来なら正の日数を返す', () => {
    expect(daysBetween('2026-07-01', '2026-07-10')).toBe(9);
  });
  it('後の日付が過去なら負の日数を返す', () => {
    expect(daysBetween('2026-07-10', '2026-07-01')).toBe(-9);
  });
  it('同日は0を返す', () => {
    expect(daysBetween('2026-07-01', '2026-07-01')).toBe(0);
  });
  it('年をまたぐ日数も正しく計算する', () => {
    expect(daysBetween('2025-12-30', '2026-01-02')).toBe(3);
  });
});
