import { test, expect } from '@playwright/test';
import { seedStorage, mockSupabase, dismissSplash, loginAsAdmin, openManageScreen } from './helpers';

test.describe('収穫記録 - 閲覧モード', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
    await seedStorage(page, { admin: false });
    await page.goto('/hatake_v26.html');
    await dismissSplash(page);
    await openManageScreen(page);
    await page.locator('.tab-btn').filter({ hasText: '収穫' }).click();
  });

  test('閲覧モードでも収穫を追加できる', async ({ page }) => {
    await page.locator('.harvest-input-group input[type=number]').fill('3');
    await page.locator('.harvest-add-btn').click();
    await expect(page.locator('.harvest-row')).toHaveCount(1);
  });

  test('収穫記録が一覧に表示される', async ({ page }) => {
    await page.locator('.harvest-input-group input[type=number]').fill('5');
    await page.locator('.harvest-add-btn').click();
    await expect(page.locator('.harvest-row-amount').first()).toContainText('5');
  });

  test('閲覧モードでは削除ボタンが非表示', async ({ page }) => {
    await page.locator('.harvest-input-group input[type=number]').fill('2');
    await page.locator('.harvest-add-btn').click();
    // 複数要素ある場合があるので first() で確認
    await expect(page.locator('.harvest-del-btn').first()).toBeHidden();
  });
});

test.describe('収穫記録 - 管理者モード', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
    // 管理者として開始（manage画面からは設定ボタンにアクセスできないため）
    await seedStorage(page, { admin: true });
    await page.goto('/hatake_v26.html');
    await dismissSplash(page);
    await openManageScreen(page);
    await page.locator('.tab-btn').filter({ hasText: '収穫' }).click();
  });

  test('管理者モードでは削除ボタンが表示される', async ({ page }) => {
    await page.locator('.harvest-input-group input[type=number]').fill('2');
    await page.locator('.harvest-add-btn').click();
    await expect(page.locator('.harvest-del-btn').first()).toBeVisible();
  });

  test('管理者は収穫記録を削除できる', async ({ page }) => {
    await page.locator('.harvest-input-group input[type=number]').fill('2');
    await page.locator('.harvest-add-btn').click();
    await page.locator('.harvest-del-btn').first().click();
    // v26で削除確認ダイアログが追加された
    await page.locator('#dlg-custom-confirm-ok').click();
    await expect(page.locator('.harvest-row')).toHaveCount(0);
  });
});
