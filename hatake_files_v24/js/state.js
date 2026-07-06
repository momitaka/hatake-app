// @ts-check
// ===== グローバル状態・定数 =====
// hatake_v26.htmlの巨大スクリプトから抽出したカーネル部分。
// ほぼ全セクションがここに依存するため、モジュール分割の中で最初に抽出する。

export const SUPABASE_URL='https://rkubnugczjlsxskomknm.supabase.co';
export const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrdWJudWdjempsc3hza29ta25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NjEzODgsImV4cCI6MjA5NzUzNzM4OH0.JaLpL82VNtoBMXXjJXIdv0k8ZJH2yOIeKGg4s8vU310';
// v25: 設定ファイルから読み込む値（APP_CONFIG が確定するまでデフォルト値で動作）
export const ADMIN_PASSWORD=(window.APP_CONFIG&&window.APP_CONFIG.adminPassword)||'hatake2026';
export const IS_DEV=new URLSearchParams(location.search).get('dev')==='1';
const _cfgLsKey=(window.APP_CONFIG&&window.APP_CONFIG.lsKey)||'hatake_v21';
export const LS_KEY=IS_DEV?_cfgLsKey+'_dev':_cfgLsKey;
const _cfgDbId=(window.APP_CONFIG&&window.APP_CONFIG.dbId)||'main';
export const DB_ID=IS_DEV?_cfgDbId+'_dev':_cfgDbId;
export const SUPABASE_TABLE=(window.APP_CONFIG&&window.APP_CONFIG.supabaseTable)||'app_data';
if(IS_DEV)document.addEventListener('DOMContentLoaded',()=>{
  const b=document.getElementById('dev-banner');
  b.style.display='block';
  const h=b.offsetHeight;
  /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.toolbar')).forEach(t=>{if(getComputedStyle(t).position==='sticky')t.style.top=h+'px';});
});
// 権限状態をまとめたオブジェクト。grep "permState" で権限に関する
// 読み書き箇所を一望できるようにする（バラバラなグローバル変数の代替）。
/** @type {{isAdmin: boolean, isSupervisor: boolean}} */
export const permState={
  isAdmin:false,
  isSupervisor:false, // youtuber_supervisor以上（supervisor + admin 両方）
};
export const MAX_UNDO=30;
/** @type {string[]} 各要素はスナップショットのJSON文字列。配列全体の差し替えはできないため空にする際は undoStack.length=0 を使う */
export let undoStack=[];
// 栽培レシピ・カスタムアイコンのマスタデータ。vegMasterは保存データ内の
// キー名として互換性のため維持。customIconsは別ストレージキーで丸ごと
// 保存されるため外部キー名の制約はない。
/** @type {{vegMaster: Object<string, any>, customIcons: Object<string, string>}} */
export const masterData={vegMaster:{},customIcons:{}};
// 区画データ（segIdキーで管理）。保存キー名（segTasks/actionLogs/harvestLogs/
// segSummaryMemo/archivedSegs）はデータ互換のため変更しない。segsはcellsから
// buildSegs()で毎回再構築される派生データで永続化されない。
/** @type {{segs: Object<string, any>, tasks: Object<string, any>, actionLogs: Object<string, any>, harvestLogs: Object<string, any>, summaryMemo: Object<string, any>, archived: Object<string, any>}} */
export const segData={segs:{},tasks:{},actionLogs:{},harvestLogs:{},summaryMemo:{},archived:{}};
// グリッドの物理構造。保存キー名（cells/COLS/ROWS/aisleRows/aisleCols）は
// データ互換のため変更しない。COLS/ROWSはcols/rowsに短縮する。
/** @type {{cells: Object<string, any>, cols: number, rows: number, aisleRows: number[], aisleCols: number[]}} */
export const gridState={cells:{},cols:8,rows:6,aisleRows:[],aisleCols:[]};
// グリッドのドラッグ範囲選択に関する一時状態。保存も他画面参照もされない。
/** @type {{dragging: boolean, row: number, startCol: number, endCol: number, pendingRow: number, pendingStart: number, pendingEnd: number, touchStartX: number, touchStartY: number}} */
export const dragState={
  dragging:false,row:-1,startCol:-1,endCol:-1,
  pendingRow:-1,pendingStart:-1,pendingEnd:-1,
  touchStartX:0,touchStartY:0,
};
// 農園設定。保存キー名（farmName/farmNameFont/farmIcon）はデータ互換のため
// 変更しない。プロパティ名はname/font/iconに短縮する。
/** @type {{name: string, font: string, icon: string}} */
export const farmMeta={name:'',font:'Kaisei Opti',icon:''};
// 画面遷移状態：今どの区画/タブ/レシピを表示しているか
/** @type {{seg: string|null, tab: string, masterVeg: string|null, masterTab: string}} */
export const navState={seg:null,tab:'roadmap',masterVeg:null,masterTab:'roadmap'};
// 「野菜を追加」ダイアログの一時入力状態。保存時にmasterData.vegMasterへ書き込まれる前の下書き。
/** @type {{emoji: string, iconFile: string|null, fromReg: boolean}} */
export const addVegState={emoji:'🌱',iconFile:null,fromReg:false};

// インラインonclick属性（例: onclick="navState.tab='log';..."）から直接参照されるため、
// モジュール化で自動グローバル化されなくなった分をここで明示的に橋渡しする。
window.navState=navState;

