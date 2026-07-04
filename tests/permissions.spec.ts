import { test, expect } from '@playwright/test';
import { seedStorage, mockSupabase, dismissSplash, loginAsAdmin, openManageScreen, clickGridCell } from './helpers';

test.describe('権限管理', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
    await seedStorage(page, { admin: false });
    await page.goto('/hatake_v26.html');
    await dismissSplash(page);
  });

  test.describe('閲覧モード', () => {
    test('野菜を追加ボタンが非表示', async ({ page }) => {
      await page.locator('#btn-open-master').click();
      await expect(page.locator('#btn-add-veg')).toBeHidden();
    });

    test('空きセルをクリックしても区画登録ダイアログが開かない', async ({ page }) => {
      await clickGridCell(page, 1, 0);
      await page.waitForTimeout(500);
      await expect(page.locator('#dlg-register')).toBeHidden();
    });

    test('設定パネルにグリッドサイズ・農園名の入力欄が非表示', async ({ page }) => {
      await page.locator('#btn-settings').click();
      await expect(page.locator('#s-farm-name')).toBeHidden();
    });

    test('管理の完了ボタンが非表示', async ({ page }) => {
      await openManageScreen(page);
      await expect(page.locator('#btn-complete-manage')).toBeHidden();
    });
  });

  test.describe('管理者モード', () => {
    test('管理者ログイン後に野菜を追加ボタンが表示', async ({ page }) => {
      await loginAsAdmin(page);
      await page.locator('#btn-open-master').click();
      await expect(page.locator('#btn-add-veg')).toBeVisible();
    });

    test('管理者は空きセルクリックで区画登録ダイアログが開く', async ({ page }) => {
      await loginAsAdmin(page);
      await clickGridCell(page, 1, 0);
      await expect(page.locator('#dlg-register')).toBeVisible({ timeout: 3000 });
    });

    test('管理者ログイン後に管理の完了ボタンが表示', async ({ page }) => {
      await loginAsAdmin(page);
      await openManageScreen(page);
      await expect(page.locator('#btn-complete-manage')).toBeVisible();
    });
  });
});
