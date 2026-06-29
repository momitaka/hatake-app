import { Page } from '@playwright/test';

export const SEED_VEG_ID = 'veg_tomato_test';
export const SEED_SEG_ID = 's_0_0_test';
export const ADMIN_PASSWORD = 'hatake2026';

export const SEED_VEG = {
  id: SEED_VEG_ID,
  name: 'トマト',
  emoji: '🍅',
  family: 'ナス科',
  variety: '標準',
  growMethod: 'seedling',
  referenceUrl: '',
  phases: [
    {
      id: 'p1', majorStatus: 'ready', name: '定植準備期', period: '〜14日',
      tasks: [
        { id: 't1', name: '苗の選定と準備', desc: '良い苗を選ぶ', day: 0, memo: '', url: '', milestone: 'planting' },
        { id: 't2', name: '土づくり', desc: '堆肥を混ぜる', day: 3, memo: '', url: '', milestone: '' },
      ],
    },
    {
      id: 'p2', majorStatus: 'growing', name: '初期成長期', period: '15〜45日',
      tasks: [
        { id: 't3', name: '活着確認と灌水', desc: '根付き確認', day: 10, memo: '', url: '', milestone: '' },
        { id: 't4', name: '第一花確認', desc: '花の確認', day: 30, memo: '', url: '', milestone: 'germination' },
      ],
    },
    {
      id: 'p3', majorStatus: 'harvesting', name: '収穫期', period: '46〜90日',
      tasks: [
        { id: 't5', name: '初収穫', desc: '赤くなったら収穫', day: 60, memo: '', url: '', milestone: 'firstHarvest' },
      ],
    },
  ],
};

// K(r,c) = `${r},${c}` — matches app's const K=(r,c)=>`${r},${c}`
export const SEED_CELLS: Record<string, object> = {
  '0,0': { segId: SEED_SEG_ID, crop: SEED_VEG_ID, plantDate: '2026-06-01' },
  '0,1': { segId: SEED_SEG_ID, crop: SEED_VEG_ID, plantDate: '2026-06-01' },
};

export const SEED_DATA = {
  cells: SEED_CELLS,
  COLS: 8,
  ROWS: 6,
  segTasks: {},
  actionLogs: {},
  harvestLogs: {},
  segSummaryMemo: {},
  vegMaster: { [SEED_VEG_ID]: SEED_VEG },
  archivedSegs: {},
  farmName: 'テストファーム',
};

export async function seedStorage(page: Page, opts: { admin?: boolean } = {}) {
  await page.addInitScript(({ data, admin }) => {
    localStorage.setItem('hatake_v21', JSON.stringify(data));
    localStorage.setItem('hatake_v21_icons', '{}');
    if (admin) localStorage.setItem('hatake_admin', '1');
    else localStorage.removeItem('hatake_admin');
  }, { data: SEED_DATA, admin: opts.admin ?? false });
}

export async function mockSupabase(page: Page) {
  // **/supabase.co/** doesn't match https://xxx.supabase.co/... (dot before supabase.co, not slash)
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (url.includes('supabase.co') || url.includes('functions/v1')) {
      return route.fulfill({ status: 200, body: '[]' });
    }
    return route.continue();
  });
}

export async function dismissSplash(page: Page) {
  const splash = page.locator('#splash-screen');
  if (await splash.isVisible()) {
    await splash.click();
    await splash.waitFor({ state: 'hidden', timeout: 2000 });
  }
}

/**
 * 設定パネルを経由して管理者ログイン。
 * #btn-settings は screen-register 内にあるため、グリッド画面のときのみ使用可能。
 */
export async function loginAsAdmin(page: Page) {
  await page.locator('#btn-settings').click();
  await page.locator('#dlg-settings').waitFor({ state: 'visible' });
  await page.locator('#s-admin-pw').fill(ADMIN_PASSWORD);
  page.once('dialog', d => d.accept());
  await page.locator('#btn-admin-login').click();
  await page.waitForTimeout(300);
  await page.locator('#btn-close-settings').click();
  await page.waitForTimeout(200);
}

/**
 * 区画リスト（.seg-item）の最初の項目をクリックして管理画面を開く。
 * グリッド画面（screen-register）がアクティブな状態で呼ぶこと。
 */
export async function openManageScreen(page: Page) {
  await page.locator('.seg-item').first().click();
  await page.locator('#screen-manage').waitFor({ state: 'visible' });
}

/**
 * グリッドのTDセルをmousedown→mouseupで操作する。
 * onDown/onUpが mousedown/mouseup ベースなので click() より信頼性が高い。
 */
export async function clickGridCell(page: Page, row: number, col: number) {
  const td = page.locator(`#grid-table td[data-r="${row}"][data-c="${col}"]`);
  const box = await td.boundingBox();
  if (!box) throw new Error(`TD[${row},${col}] not found`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
}
