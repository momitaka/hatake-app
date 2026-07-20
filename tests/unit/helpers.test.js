// @ts-check
import { describe, it, expect, beforeEach } from 'vitest';
import { vegIconHtml } from '../../hatake_files_v24/js/helpers.js';
import { masterData } from '../../hatake_files_v24/js/state.js';

beforeEach(() => {
  // @ts-expect-error テスト用グローバル（実際はscriptタグで読み込まれるプリセットデータ）
  globalThis.PRESET_VEGS = [{ id: 'tomato', emoji: '🍅', iconFile: 'tomato.png' }];
  // @ts-expect-error 同上
  globalThis.ICON_B64 = { 'tomato.png': 'data:image/png;base64,TOMATO' };
  masterData.customIcons = {};
});

describe('vegIconHtml', () => {
  it('vegがnullなら空文字を返す', () => {
    expect(vegIconHtml(/** @type {any} */ (null))).toBe('');
  });

  it('iconFileがICON_B64にあればimgタグを返す', () => {
    const html = vegIconHtml({ id: 'x', iconFile: 'tomato.png' });
    expect(html).toContain('<img');
    expect(html).toContain('data:image/png;base64,TOMATO');
    expect(html).toContain('width="18"');
    expect(html).toContain('height="18"');
  });

  it('iconFile未指定でもPRESET_VEGSのidが一致すればプリセットのiconFileを使う', () => {
    const html = vegIconHtml({ id: 'tomato' });
    expect(html).toContain('data:image/png;base64,TOMATO');
  });

  it('sizeを指定するとimgのwidth/heightに反映される', () => {
    const html = vegIconHtml({ id: 'x', iconFile: 'tomato.png' }, 40);
    expect(html).toContain('width="40"');
    expect(html).toContain('height="40"');
  });

  it('iconFileもプリセット一致もなければ絵文字spanにフォールバックする', () => {
    const html = vegIconHtml({ id: 'unknown', emoji: '🥕' });
    expect(html).not.toContain('<img');
    expect(html).toContain('🥕');
    expect(html).toContain('font-size:16px');
  });

  it('masterData.customIconsに登録されたアイコンも参照できる', () => {
    masterData.customIcons['custom.png'] = 'data:image/png;base64,CUSTOM';
    const html = vegIconHtml({ id: 'x', iconFile: 'custom.png' });
    expect(html).toContain('data:image/png;base64,CUSTOM');
  });
});
