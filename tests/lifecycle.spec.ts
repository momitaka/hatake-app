/**
 * 管理ライフサイクル統合テスト
 *
 * 対象フロー:
 *   区画登録 → タスク記録 → 管理の完了 → アーカイブ確認
 *
 * テスト区分:
 *   - 管理者モード: ライフサイクル全体が操作可能
 *   - 閲覧モード: タスク記録のみ可能、登録/完了操作はブロック
 */

import { test, expect } from '@playwright/test';
import {
  seedStorage, mockSupabase, dismissSplash,
  loginAsAdmin, openManageScreen, clickGridCell,
  SEED_VEG, SEED_SEG_ID,
} from './helpers';

// ─────────────────────────────────────────────────────────
// 管理者モード: フルライフサイクル
// ─────────────────────────────────────────────────────────
test.describe('管理者ライフサイクル', () => {

  // step1 と step2 はシードデータ（既登録区画）を使う
  test.describe('既存区画の操作', () => {
    test.beforeEach(async ({ page }) => {
      await mockSupabase(page);
      await seedStorage(page, { admin: true });
      await page.goto('/hatake_v26.html');
      await dismissSplash(page);
    });

    test('step1: タスクを記録できる', async ({ page }) => {
      await openManageScreen(page);
      await page.locator('.tab-btn').filter({ hasText: '工程表' }).click();
      await page.locator('.task-cb').first().check();
      await expect(page.locator('#dlg-task-date')).toBeVisible({ timeout: 3000 });
      await page.locator('#dlg-task-date .btn-primary').click();
      // 日付チップが追加されタスクがチェック済みになる
      await expect(page.locator('.task-date-chip').first()).toBeVisible();
    });

    test('step2: 管理の完了ボタンで作業ログタブに移動し完了通知が表示される', async ({ page }) => {
      await openManageScreen(page);
      await page.locator('#btn-complete-manage').click();
      // 作業ログタブがアクティブになる
      await expect(page.locator('.tab-btn.active')).toContainText('作業ログ');
      // 完了案内バナーが表示・ハイライトされる
      await expect(page.locator('#complete-notice')).toBeVisible();
    });

    test('step3: 作業ログタブの「この野菜の管理を完了」ボタンで確認ダイアログが開く', async ({ page }) => {
      await openManageScreen(page);
      // 作業ログタブへ移動
      await page.locator('.tab-btn').filter({ hasText: '作業ログ' }).click();
      await page.locator('.btn-complete-final').click();
      await expect(page.locator('#dlg-complete-confirm')).toBeVisible({ timeout: 2000 });
      await expect(page.locator('#dlg-complete-target')).toContainText(SEED_VEG.name);
    });

    test('step4: 確認ダイアログでキャンセルするとダイアログが閉じ区画は残る', async ({ page }) => {
      await openManageScreen(page);
      await page.locator('.tab-btn').filter({ hasText: '作業ログ' }).click();
      await page.locator('.btn-complete-final').click();
      await page.locator('#btn-complete-cancel').click();
      await expect(page.locator('#dlg-complete-confirm')).toBeHidden();
      // 管理画面はまだ表示中
      await expect(page.locator('#screen-manage')).toBeVisible();
    });

    test('step5: 実行するとアーカイブ完了ダイアログが表示されグリッドに戻る', async ({ page }) => {
      await openManageScreen(page);
      await page.locator('.tab-btn').filter({ hasText: '作業ログ' }).click();
      await page.locator('.btn-complete-final').click();
      await expect(page.locator('#dlg-complete-confirm')).toBeVisible({ timeout: 2000 });
      await page.locator('#btn-complete-execute').click();
      // アーカイブ完了ダイアログが表示される
      await expect(page.locator('#dlg-archive-done')).toBeVisible({ timeout: 3000 });
      // グリッド画面に戻っている
      await expect(page.locator('#screen-register')).toBeVisible();
    });

    test('step6: 完了後、グリッドの区画リストから消える', async ({ page }) => {
      // 完了前の区画数
      const before = await page.locator('.seg-item').count();
      await openManageScreen(page);
      await page.locator('.tab-btn').filter({ hasText: '作業ログ' }).click();
      await page.locator('.btn-complete-final').click();
      await page.locator('#btn-complete-execute').click();
      await page.locator('#dlg-archive-done').waitFor({ state: 'visible' });
      await page.evaluate(() => { (document.getElementById('dlg-archive-done') as HTMLElement).style.display = 'none'; });
      // 区画が減少している
      const after = await page.locator('.seg-item').count();
      expect(after).toBeLessThan(before);
    });

    test('step7: 完了後、アーカイブ画面に記録が表示される', async ({ page }) => {
      await openManageScreen(page);
      await page.locator('.tab-btn').filter({ hasText: '作業ログ' }).click();
      await page.locator('.btn-complete-final').click();
      await page.locator('#btn-complete-execute').click();
      await page.locator('#dlg-archive-done').waitFor({ state: 'visible' });
      await page.evaluate(() => { (document.getElementById('dlg-archive-done') as HTMLElement).style.display = 'none'; });
      // 過去データを開く
      await page.locator('#btn-open-archive').click();
      await expect(page.locator('#screen-archive')).toBeVisible();
      // アーカイブカードに野菜名が表示される
      await expect(page.locator('.archive-card').first()).toContainText(SEED_VEG.name);
    });
  });

  // ─── 区画登録からのフルライフサイクル ───
  test.describe('区画登録から完了まで（エンドツーエンド）', () => {
    test.beforeEach(async ({ page }) => {
      await mockSupabase(page);
      // 空グリッドからスタート（cells なし）
      await page.addInitScript(({ veg }) => {
        localStorage.setItem('hatake_v21', JSON.stringify({
          cells: {}, COLS: 8, ROWS: 6,
          vegMaster: { [veg.id]: veg },
          segTasks: {}, actionLogs: {}, harvestLogs: {},
          segSummaryMemo: {}, archivedSegs: {},
        }));
        localStorage.setItem('hatake_admin', '1');
      }, { veg: { ...SEED_VEG } });
      await page.goto('/hatake_v26.html');
      await dismissSplash(page);
    });

    test('区画登録 → タスク記録 → 管理の完了 → アーカイブ確認', async ({ page }) => {
      // 1. 区画登録
      await clickGridCell(page, 0, 0);
      await expect(page.locator('#dlg-register')).toBeVisible({ timeout: 3000 });
      await page.locator('#dlg-crop').selectOption({ label: SEED_VEG.name });
      await page.locator('#dlg-save').click();
      await expect(page.locator('#grid-table')).toContainText(SEED_VEG.name);

      // 2. 区画を開く
      await page.locator('.seg-item').first().click();
      await expect(page.locator('#screen-manage')).toBeVisible();

      // 3. タスク記録
      await page.locator('.tab-btn').filter({ hasText: '工程表' }).click();
      await page.locator('.task-cb').first().check();
      await expect(page.locator('#dlg-task-date')).toBeVisible({ timeout: 3000 });
      await page.locator('#dlg-task-date .btn-primary').click();
      await expect(page.locator('.task-date-chip').first()).toBeVisible();

      // 4. 管理の完了フロー
      await page.locator('#btn-complete-manage').click();
      await expect(page.locator('#complete-notice')).toBeVisible();
      await page.locator('.btn-complete-final').click();
      await expect(page.locator('#dlg-complete-confirm')).toBeVisible({ timeout: 2000 });
      await page.locator('#btn-complete-execute').click();

      // 5. 完了ダイアログとグリッドへの帰還
      await expect(page.locator('#dlg-archive-done')).toBeVisible({ timeout: 3000 });
      await page.evaluate(() => { (document.getElementById('dlg-archive-done') as HTMLElement).style.display = 'none'; });
      await expect(page.locator('#screen-register')).toBeVisible();

      // 6. グリッドに区画が消えている
      await expect(page.locator('.seg-item')).toHaveCount(0);

      // 7. アーカイブに記録されている
      await page.locator('#btn-open-archive').click();
      await expect(page.locator('.archive-card').first()).toContainText(SEED_VEG.name);
    });
  });
});

// ─────────────────────────────────────────────────────────
// 閲覧モード: ライフサイクル権限チェック
// ─────────────────────────────────────────────────────────
test.describe('閲覧モード: ライフサイクル権限', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
    await seedStorage(page, { admin: false });
    await page.goto('/hatake_v26.html');
    await dismissSplash(page);
  });

  test('空きセルクリックで区画登録できない', async ({ page }) => {
    await clickGridCell(page, 1, 0);
    await page.waitForTimeout(500);
    await expect(page.locator('#dlg-register')).toBeHidden();
  });

  test('タスク記録は閲覧モードでも可能', async ({ page }) => {
    await openManageScreen(page);
    await page.locator('.tab-btn').filter({ hasText: '工程表' }).click();
    await page.locator('.task-cb').first().check();
    await expect(page.locator('#dlg-task-date')).toBeVisible({ timeout: 3000 });
    await page.locator('#dlg-task-date .btn-primary').click();
    await expect(page.locator('.task-date-chip').first()).toBeVisible();
  });

  test('管理の完了ボタン（ツールバー）が非表示', async ({ page }) => {
    await openManageScreen(page);
    await expect(page.locator('#btn-complete-manage')).toBeHidden();
  });

  test('作業ログタブは閲覧可能（作業記録が見える）', async ({ page }) => {
    await openManageScreen(page);
    await page.locator('.tab-btn').filter({ hasText: '作業ログ' }).click();
    // タブは開ける（エラーが出ない）
    await expect(page.locator('.tab-btn.active')).toContainText('作業ログ');
  });

  test('過去データ（アーカイブ）は閲覧モードでも閲覧可能', async ({ page }) => {
    await page.locator('#btn-open-archive').click();
    await expect(page.locator('#screen-archive')).toBeVisible();
  });
});
