import { test, expect } from '@playwright/test';
import { seedStorage, mockSupabase, dismissSplash, clickGridCell, SEED_VEG } from './helpers';

test.describe('区画登録ダイアログ', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
    await seedStorage(page, { admin: true });
    await page.goto('/hatake_v24.html');
    await dismissSplash(page);
  });

  test('空きセルクリックでダイアログが開く', async ({ page }) => {
    await clickGridCell(page, 1, 0);
    await expect(page.locator('#dlg-register')).toBeVisible({ timeout: 3000 });
  });

  test('ダイアログに日付セレクトが表示される', async ({ page }) => {
    await clickGridCell(page, 1, 0);
    await expect(page.locator('#dlg-register')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#dlg-date-y')).toBeVisible();
    await expect(page.locator('#dlg-date-m')).toBeVisible();
    await expect(page.locator('#dlg-date-d')).toBeVisible();
  });

  test('日付セレクトが今日の年月日で初期化される', async ({ page }) => {
    const today = new Date();
    await clickGridCell(page, 1, 0);
    await expect(page.locator('#dlg-register')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#dlg-date-y')).toHaveValue(String(today.getFullYear()));
    await expect(page.locator('#dlg-date-m')).toHaveValue(String(today.getMonth() + 1).padStart(2, '0'));
    await expect(page.locator('#dlg-date-d')).toHaveValue(String(today.getDate()).padStart(2, '0'));
  });

  test('作物未選択時は登録ボタンが無効', async ({ page }) => {
    await clickGridCell(page, 1, 0);
    await expect(page.locator('#dlg-register')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#dlg-save')).toBeDisabled();
  });

  test('作物を選択すると登録ボタンが有効になる', async ({ page }) => {
    await clickGridCell(page, 1, 0);
    await expect(page.locator('#dlg-register')).toBeVisible({ timeout: 3000 });
    await page.locator('#dlg-crop').selectOption({ label: SEED_VEG.name });
    await expect(page.locator('#dlg-save')).toBeEnabled();
  });

  test('キャンセルでダイアログが閉じる', async ({ page }) => {
    await clickGridCell(page, 1, 0);
    await expect(page.locator('#dlg-register')).toBeVisible({ timeout: 3000 });
    await page.locator('#btn-dlg-cancel').click();
    await expect(page.locator('#dlg-register')).toBeHidden();
  });

  test('登録後にグリッドに作物名が表示される', async ({ page }) => {
    await clickGridCell(page, 2, 0);
    await expect(page.locator('#dlg-register')).toBeVisible({ timeout: 3000 });
    await page.locator('#dlg-crop').selectOption({ label: SEED_VEG.name });
    await page.locator('#dlg-save').click();
    await expect(page.locator('#grid-table')).toContainText(SEED_VEG.name);
  });
});
