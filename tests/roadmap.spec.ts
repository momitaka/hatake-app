import { test, expect } from '@playwright/test';
import { seedStorage, mockSupabase, dismissSplash, openManageScreen } from './helpers';

test.describe('ロードマップ・タスク記録', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
    await seedStorage(page, { admin: false }); // タスク記録は閲覧モードでも可
    await page.goto('/hatake_v24.html');
    await dismissSplash(page);
    await openManageScreen(page);
    // ロードマップタブはデフォルトで開く（currentTab='roadmap'）
  });

  test('ロードマップタブにタスクが表示される', async ({ page }) => {
    await expect(page.locator('.task-name').first()).toBeVisible();
  });

  test('タスクチェックで日付選択ダイアログが開く', async ({ page }) => {
    await page.locator('.task-cb').first().check();
    await expect(page.locator('#dlg-task-date')).toBeVisible({ timeout: 3000 });
  });

  test('日付ダイアログに年月日セレクトが表示される', async ({ page }) => {
    await page.locator('.task-cb').first().check();
    await expect(page.locator('#dlg-task-date')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#dlg-task-date-y')).toBeVisible();
    await expect(page.locator('#dlg-task-date-m')).toBeVisible();
    await expect(page.locator('#dlg-task-date-d')).toBeVisible();
  });

  test('記録するを押すとタスクに日付チップが表示される', async ({ page }) => {
    await page.locator('.task-cb').first().check();
    await expect(page.locator('#dlg-task-date')).toBeVisible({ timeout: 3000 });
    await page.locator('#dlg-task-date .btn-primary').click();
    await expect(page.locator('.task-date-chip').first()).toBeVisible();
  });

  test('記録するを押すとロードマップの進捗パーセントが上がる', async ({ page }) => {
    const pctBefore = await page.locator('.progress-pct, .roadmap-pct').first().textContent();
    await page.locator('.task-cb').first().check();
    await page.locator('#dlg-task-date .btn-primary').click();
    await page.waitForTimeout(300);
    const pctAfter = await page.locator('.progress-pct, .roadmap-pct').first().textContent();
    expect(pctAfter).not.toEqual(pctBefore);
  });

  test('キャンセルではタスクがチェックされない', async ({ page }) => {
    const cb = page.locator('.task-cb').first();
    await cb.check();
    await expect(page.locator('#dlg-task-date')).toBeVisible({ timeout: 3000 });
    await page.locator('#dlg-task-date .btn').click(); // キャンセルボタン
    await expect(cb).not.toBeChecked();
  });

  test('＋追加チップをクリックで日付ダイアログが開く', async ({ page }) => {
    // 1回チェックして追加チップを出す
    await page.locator('.task-cb').first().check();
    await page.locator('#dlg-task-date .btn-primary').click();
    // ＋追加チップをクリック
    await page.locator('.task-date-chip').filter({ hasText: '＋追加' }).first().click();
    await expect(page.locator('#dlg-task-date')).toBeVisible();
  });
});
