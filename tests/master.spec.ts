import { test, expect } from '@playwright/test';
import { seedStorage, mockSupabase, dismissSplash, loginAsAdmin, SEED_VEG } from './helpers';

test.describe('野菜マスタ', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
    await seedStorage(page, { admin: false });
    await page.goto('/hatake_v26.html');
    await dismissSplash(page);
  });

  test('閲覧モードでマスタ画面を開ける', async ({ page }) => {
    await page.locator('#btn-open-master').click();
    await expect(page.locator('#screen-master')).toBeVisible();
  });

  test('閲覧モードでは野菜を追加ボタンが非表示', async ({ page }) => {
    await page.locator('#btn-open-master').click();
    await expect(page.locator('#btn-add-veg')).toBeHidden();
  });

  test('閲覧モードでは野菜選択後も編集フォームが非表示', async ({ page }) => {
    await page.locator('#btn-open-master').click();
    await page.locator('.master-list-item').first().click();
    // growBlock が admin-only クラスにより非表示
    await expect(page.locator('#master-detail-col .admin-only').first()).toBeHidden();
  });

  test('管理者モードでは野菜を追加ボタンが表示', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#btn-open-master').click();
    await expect(page.locator('#btn-add-veg')).toBeVisible();
  });

  test('野菜リストにシードデータの野菜が表示される', async ({ page }) => {
    await page.locator('#btn-open-master').click();
    await expect(page.locator('#master-list-items')).toContainText(SEED_VEG.name);
  });

  test('野菜を選択するとフェーズ・タスクが表示される', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#btn-open-master').click();
    await page.locator('.master-list-item').first().click();
    await expect(page.locator('.master-phase-block').first()).toBeVisible();
    await expect(page.locator('.master-task-row').first()).toBeVisible();
  });

  test('管理者は野菜追加ダイアログを開ける', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#btn-open-master').click();
    await page.locator('#btn-add-veg').click();
    await expect(page.locator('#dlg-add-veg')).toBeVisible();
  });
});
