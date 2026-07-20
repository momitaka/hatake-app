// @ts-check
import { describe, it, expect, beforeEach, vi } from 'vitest';

// segments.jsはstorage.jsをimportしている（setTaskStateがsaveLSを呼ぶため）。
// storage.jsのトップレベルコードはundo-btn等の実DOM要素を前提にしており、
// jsdomの空DOMではimport時に例外になるためモックで無害化する。
vi.mock('../../hatake_files_v24/js/storage.js', () => ({ saveLS: vi.fn() }));

const { segData, gridState, masterData } = await import('../../hatake_files_v24/js/state.js');
const { dispToISO } = await import('../../hatake_files_v24/js/dialogs.js');
const {
  buildSegs,
  getVeg,
  vegFamily,
  famStyle,
  segIsRegistered,
  getTaskState,
  getHarvestSummary,
  harvestTotalStr,
  checkRotation,
  calcProgress,
  calcMajorStatus,
  getNextTask,
  getMilestoneDate,
  getMergedLogsByDate,
  addDays,
} = await import('../../hatake_files_v24/js/segments.js');

/** テスト用の栽培レシピ（2フェーズ・4タスク、うち2つがマイルストーン付き） */
const vegFixture = {
  id: 'testveg',
  name: 'テスト野菜',
  family: 'ナス科',
  phases: [
    {
      id: 'p0',
      majorStatus: 'ready',
      name: '準備期',
      tasks: [
        { id: 't1', name: '土づくり' },
        { id: 't2', name: '定植', milestone: 'planting' },
      ],
    },
    {
      id: 'p1',
      majorStatus: 'growing',
      name: '生育期',
      tasks: [
        { id: 't3', name: '水やり' },
        { id: 't4', name: '発芽確認', milestone: 'germination' },
      ],
    },
  ],
};

function resetState() {
  segData.segs = {};
  segData.tasks = {};
  segData.actionLogs = {};
  segData.harvestLogs = {};
  segData.summaryMemo = {};
  segData.archived = {};
  gridState.cells = {};
  gridState.cols = 8;
  gridState.rows = 6;
  gridState.aisleRows = [];
  gridState.aisleCols = [];
  masterData.vegMaster = { testveg: vegFixture };
  masterData.customIcons = {};
}

beforeEach(resetState);

describe('buildSegs', () => {
  it('cellsからsegIdごとにグループ化しcols一覧を作る', () => {
    gridState.rows = 1;
    gridState.cols = 2;
    gridState.cells = {
      '0,0': { segId: 'A', crop: 'testveg', plantDate: '2026-07-01' },
      '0,1': { segId: 'A', crop: 'testveg' },
    };
    buildSegs();
    expect(segData.segs['A']).toEqual({ id: 'A', row: 0, cols: [0, 1], crop: 'testveg', plantDate: '2026-07-01' });
  });

  it('先頭セルにplantDateが無ければ後続セルの値を引き継ぐ', () => {
    gridState.rows = 1;
    gridState.cols = 2;
    gridState.cells = {
      '0,0': { segId: 'A', crop: 'testveg' },
      '0,1': { segId: 'A', crop: 'testveg', plantDate: '2026-07-03' },
    };
    buildSegs();
    expect(segData.segs['A'].plantDate).toBe('2026-07-03');
  });
});

describe('getVeg / vegFamily', () => {
  it('登録済みIDのレシピを返す', () => {
    expect(getVeg('testveg')).toBe(vegFixture);
  });
  it('未登録IDはnullを返す', () => {
    expect(getVeg('nope')).toBeNull();
  });
  it('vegFamilyは科名を返す', () => {
    expect(vegFamily('testveg')).toBe('ナス科');
  });
  it('未登録IDのvegFamilyはnullを返す', () => {
    expect(vegFamily('nope')).toBeNull();
  });
});

describe('famStyle', () => {
  it('登録済みの科ならスタイルを返す', () => {
    expect(famStyle('ナス科')).toEqual({ border: '#D85A30', bg: '#FAECE7' });
  });
  it('未知の科は「その他」のスタイルにフォールバックする', () => {
    expect(famStyle('謎の科')).toEqual({ border: '#9C9A93', bg: '#F1EFE8' });
  });
  it('nullはnullを返す', () => {
    expect(famStyle(null)).toBeNull();
  });
});

describe('segIsRegistered', () => {
  it('cropがあればtrue', () => {
    segData.segs['A'] = { id: 'A', crop: 'testveg' };
    expect(segIsRegistered('A')).toBe(true);
  });
  it('cropがnullならfalse', () => {
    segData.segs['B'] = { id: 'B', crop: null };
    expect(segIsRegistered('B')).toBe(false);
  });
  it('未登録の区画IDはfalse', () => {
    expect(segIsRegistered('nope')).toBe(false);
  });
});

describe('getTaskState', () => {
  it('未記録なら初期値を返す', () => {
    expect(getTaskState('A', 't1')).toEqual({ done: false, skip: false, doneDates: [] });
  });
  it('記録済みの値を初期値とマージして返す', () => {
    segData.tasks['A'] = { t1: { done: true, doneDates: ['7/1'] } };
    expect(getTaskState('A', 't1')).toEqual({ done: true, skip: false, doneDates: ['7/1'] });
  });
});

describe('getHarvestSummary / harvestTotalStr', () => {
  it('単位ごとに合計する', () => {
    segData.harvestLogs['A'] = [
      { unit: '個', amount: 3 },
      { unit: '個', amount: 2 },
      { unit: 'kg', amount: 1.5 },
    ];
    expect(getHarvestSummary('A')).toEqual({ 個: 5, kg: 1.5 });
    expect(harvestTotalStr('A')).toBe('5個 / 1.5kg');
  });
  it('記録が無ければharvestTotalStrはnullを返す', () => {
    expect(harvestTotalStr('empty')).toBeNull();
  });
});

describe('checkRotation', () => {
  it('対象科のみ・行と列が重なるものだけを新しい順で返す', () => {
    segData.archived = {
      x1: { family: 'ナス科', row: 0, cols: [0, 1], completedDate: '2026-05-01' },
      x2: { family: 'ウリ科', row: 0, cols: [0], completedDate: '2026-04-01' },
      x3: { family: 'ナス科', row: 1, cols: [0], completedDate: '2026-06-01' }, // 行が違う
      x4: { family: 'その他', row: 0, cols: [0], completedDate: '2026-06-15' }, // 対象科外
    };
    const result = checkRotation(0, [0]);
    expect(result).toEqual([
      { family: 'ナス科', row: 0, cols: [0, 1], completedDate: '2026-05-01' },
      { family: 'ウリ科', row: 0, cols: [0], completedDate: '2026-04-01' },
    ]);
  });
});

describe('calcProgress / calcMajorStatus / getNextTask', () => {
  it('未着手なら進捗0%・フェーズ0・次タスクは先頭タスク', () => {
    expect(calcProgress('A', 'testveg')).toEqual({ pct: 0, phaseIdx: 0 });
    expect(calcMajorStatus('A', 'testveg').id).toBe('ready');
    expect(getNextTask('A', 'testveg').id).toBe('t1');
  });

  it('1件完了で進捗25%・次タスクはt2', () => {
    segData.tasks['A'] = { t1: { done: true } };
    expect(calcProgress('A', 'testveg').pct).toBe(25);
    expect(getNextTask('A', 'testveg').id).toBe('t2');
  });

  it('フェーズ0を全完了するとフェーズ1・growingになる', () => {
    segData.tasks['A'] = { t1: { done: true }, t2: { done: true }, t3: { done: true } };
    expect(calcProgress('A', 'testveg').phaseIdx).toBe(1);
    expect(calcMajorStatus('A', 'testveg').id).toBe('growing');
  });

  it('全タスク完了で進捗100%・次タスクはnull', () => {
    segData.tasks['A'] = { t1: { done: true }, t2: { done: true }, t3: { done: true }, t4: { done: true } };
    expect(calcProgress('A', 'testveg').pct).toBe(100);
    expect(getNextTask('A', 'testveg')).toBeNull();
  });

  it('未登録レシピは進捗0%・ready扱い', () => {
    expect(calcProgress('A', 'nope')).toEqual({ pct: 0, phaseIdx: 0 });
    expect(calcMajorStatus('A', 'nope').id).toBe('ready');
  });
});

describe('getMilestoneDate', () => {
  it('該当マイルストーンの最初の完了日をISOで返す', () => {
    segData.tasks['A'] = { t2: { doneDates: ['7/14'] } };
    expect(getMilestoneDate('A', 'testveg', 'planting')).toBe(dispToISO('7/14'));
  });
  it('未完了ならnullを返す', () => {
    expect(getMilestoneDate('A', 'testveg', 'germination')).toBeNull();
  });
  it('未登録レシピはnullを返す', () => {
    expect(getMilestoneDate('A', 'nope', 'planting')).toBeNull();
  });
});

describe('getMergedLogsByDate', () => {
  it('同日ならタスクログを先・収穫ログを後にして日付ごとにまとめる', () => {
    const sameDate = dispToISO('7/14');
    segData.segs['A'] = { id: 'A', crop: 'testveg' };
    segData.tasks['A'] = { t2: { doneDates: ['7/14'] } };
    segData.harvestLogs['A'] = [{ date: sameDate, unit: '個', amount: 2 }];

    const byDate = getMergedLogsByDate('A');
    expect(Object.keys(byDate)).toEqual([sameDate]);
    expect(byDate[sameDate]).toEqual([
      { _type: 'task', date: sameDate, task: '定植' },
      { _type: 'harvest', date: sameDate, unit: '個', amount: 2 },
    ]);
  });
});

describe('addDays', () => {
  it('日数を加算してM/D形式で返す', () => {
    expect(addDays('2026-07-01', 5)).toBe('7/6');
  });
  it('月をまたぐ加算も正しく計算する', () => {
    expect(addDays('2026-07-28', 5)).toBe('8/2');
  });
  it('日付が空ならnullを返す', () => {
    expect(addDays('', 5)).toBeNull();
  });
});
