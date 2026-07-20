// @ts-check
// helpers.jsのトップレベルコードがPRESET_VEGS/ICON_B64（本来はscriptタグ由来のグローバル）を
// 参照するため、どのテストファイルよりも先に空のフォールバックを用意しておく。
// 各テストは必要に応じてbeforeEach等で上書きする。
globalThis.PRESET_VEGS = globalThis.PRESET_VEGS || [];
globalThis.ICON_B64 = globalThis.ICON_B64 || {};
