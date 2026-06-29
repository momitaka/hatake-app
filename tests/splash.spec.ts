import { test, expect } from '@playwright/test';
import { mockSupabase, dismissSplash } from './helpers';

test.describe('スプラッシュ画面', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/hatake_v24.html');
  });

  test('起動時にスプラッシュが表示される', async ({ page }) => {
    await expect(page.locator('#splash-screen')).toBeVisible();
  });

  test('タップ/クリックでスプラッシュが消える', async ({ page }) => {
    await page.locator('#splash-screen').click();
    await expect(page.locator('#splash-screen')).toBeHidden({ timeout: 2000 });
  });

  test('スプラッシュ消去後にグリッドが表示される', async ({ page }) => {
    await dismissSplash(page);
    await expect(page.locator('#grid-table')).toBeVisible();
  });
});
