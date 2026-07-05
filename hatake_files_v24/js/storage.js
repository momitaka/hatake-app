// @ts-check
// ===== ローカルストレージ・Undo管理 =====
// v25: ストレージ抽象化
// freeDataStrategy='session' → sessionStorage（バックグラウンドで破棄）
// freeDataStrategy='localStorage' → localStorage（個人版・従来通り）
// APP_SUBSCRIBED=true → Supabase永続保存も行う
import { LS_KEY, MAX_UNDO, undoStack, masterData, segData, gridState, farmMeta, navState } from './state.js';
import { TOMATO_SAMPLE, vegIconHtml } from './helpers.js';
import { saveToDB } from './db.js';
import { buildSegs } from './segments.js';

export const _dataStrategy=(window.APP_CONFIG&&window.APP_CONFIG.freeDataStrategy)||'localStorage';
const _storage={
  getItem(k){return _dataStrategy==='session'?sessionStorage.getItem(k):localStorage.getItem(k);},
  setItem(k,v){if(_dataStrategy==='session'){sessionStorage.setItem(k,v);}else{localStorage.setItem(k,v);}}
};
export function saveLS(){
  try{
    const d={cells:gridState.cells,COLS:gridState.cols,ROWS:gridState.rows,segTasks:segData.tasks,actionLogs:segData.actionLogs,harvestLogs:segData.harvestLogs,segSummaryMemo:segData.summaryMemo,vegMaster:masterData.vegMaster,archivedSegs:segData.archived,farmName:farmMeta.name,aisleRows:gridState.aisleRows,aisleCols:gridState.aisleCols,farmNameFont:farmMeta.font,farmIcon:farmMeta.icon};
    _storage.setItem(LS_KEY,JSON.stringify(d));
    _storage.setItem(LS_KEY+'_icons',JSON.stringify(masterData.customIcons));
    // Supabase保存：個人版は常に / コラボ版はサブスク加入後のみ
    if(_dataStrategy==='localStorage'||window.APP_SUBSCRIBED){saveToDB(d);}
    // セッション版未サブスク：保存バナーを表示
    if(_dataStrategy==='session'&&!window.APP_SUBSCRIBED){showSaveBanner();}
  }catch(e){}
}
export function updateFarmNameDisplay(){const el=document.getElementById('farm-name-display');const sc=document.getElementById('farm-seg-count');const splashEl=document.getElementById('splash-farm-name');const iconEl=document.getElementById('farm-icon-display');const fontFamily=`'${farmMeta.font}',serif`;if(el)el.style.fontFamily=fontFamily;if(splashEl)splashEl.style.fontFamily=fontFamily;if(iconEl){const iconId=farmMeta.icon||'tomato';if(iconId&&masterData.vegMaster[iconId]){iconEl.innerHTML=vegIconHtml(masterData.vegMaster[iconId],28);iconEl.style.display='inline-flex';}else{iconEl.innerHTML='🍅';iconEl.style.display='inline-flex';}}if(el){el.textContent=farmMeta.name||((window.APP_CONFIG&&window.APP_CONFIG.appName)||'私の畑');el.style.display='block';}if(sc){buildSegs();const cnt=Object.keys(segData.segs).length;sc.textContent=cnt+'区画 管理中';sc.style.display='block';}}
export function loadLS(){
  try{const d=JSON.parse(_storage.getItem(LS_KEY)||'null');if(d&&d.cells){gridState.cells=d.cells;gridState.cols=d.COLS||8;gridState.rows=d.ROWS||6;segData.tasks=d.segTasks||{};segData.actionLogs=d.actionLogs||{};segData.harvestLogs=d.harvestLogs||{};segData.summaryMemo=d.segSummaryMemo||{};masterData.vegMaster=d.vegMaster||{};segData.archived=d.archivedSegs||{};farmMeta.name=d.farmName||'';gridState.aisleRows=d.aisleRows||[];gridState.aisleCols=d.aisleCols||[];farmMeta.font=d.farmNameFont||'Kaisei Opti';farmMeta.icon=d.farmIcon||'';}}catch(e){}
  try{const ic=JSON.parse(_storage.getItem(LS_KEY+'_icons')||'null');if(ic)masterData.customIcons=ic;}catch(e){}
  if(!masterData.vegMaster['tomato'])masterData.vegMaster['tomato']=JSON.parse(JSON.stringify(TOMATO_SAMPLE));
  document.getElementById('s-cols').value=gridState.cols;document.getElementById('s-rows').value=gridState.rows;
  document.getElementById('s-farm-name').value=farmMeta.name;
  document.querySelectorAll('input[name="farm-font"]').forEach(r=>{r.checked=(r.value===farmMeta.font);});
  // renderFarmIconPickerはjs/grid-settings.js抽出までのwindow経由の一時ブリッジ
  window.renderFarmIconPicker();
  updateFarmNameDisplay();
}
// 保存バナー（セッション版未サブスクユーザー向け）
let _saveBannerTimer=null;
export function showSaveBanner(){
  const b=document.getElementById('save-banner');
  if(!b)return;
  b.style.display='flex';
  clearTimeout(_saveBannerTimer);
  _saveBannerTimer=setTimeout(()=>{b.style.display='none';},6000);
}
export function pushUndo(){undoStack.push(JSON.stringify({cells:gridState.cells,COLS:gridState.cols,ROWS:gridState.rows,segTasks:segData.tasks,actionLogs:segData.actionLogs,harvestLogs:segData.harvestLogs,segSummaryMemo:segData.summaryMemo,vegMaster:masterData.vegMaster,archivedSegs:segData.archived,aisleRows:gridState.aisleRows,aisleCols:gridState.aisleCols}));if(undoStack.length>MAX_UNDO)undoStack.shift();updUndoBtn()}
export function doUndo(){
  if(!undoStack.length)return;const s=JSON.parse(undoStack.pop());gridState.cells=s.cells;gridState.cols=s.COLS;gridState.rows=s.ROWS;segData.tasks=s.segTasks||{};segData.actionLogs=s.actionLogs||{};segData.harvestLogs=s.harvestLogs||{};segData.summaryMemo=s.segSummaryMemo||{};masterData.vegMaster=s.vegMaster||{};segData.archived=s.archivedSegs||{};gridState.aisleRows=s.aisleRows||[];gridState.aisleCols=s.aisleCols||[];
  // renderGridはgrid.js⇄storage.jsの相互依存（grid.jsがupdateFarmNameDisplayを使う）、
  // renderManageはmanage.js⇄storage.jsの相互依存（manage.jsがpushUndo/saveLSを使う）のため、
  // どちらも循環import回避の恒久的なwindow経由参照とする
  buildSegs();window.renderGrid();if(navState.seg&&document.getElementById('screen-manage').classList.contains('active'))window.renderManage();saveLS();updUndoBtn();
}
export function updUndoBtn(){const b=document.getElementById('undo-btn'),c=document.getElementById('undo-count');b.disabled=!undoStack.length;c.textContent=undoStack.length?`(${undoStack.length})`:''}
document.getElementById('undo-btn').addEventListener('click',()=>{if(!undoStack.length)return;document.getElementById('dlg-undo-confirm').style.display='flex';});
document.getElementById('btn-undo-cancel').addEventListener('click',()=>{document.getElementById('dlg-undo-confirm').style.display='none';});
document.getElementById('btn-undo-ok').addEventListener('click',()=>{document.getElementById('dlg-undo-confirm').style.display='none';doUndo();});
document.getElementById('dlg-undo-confirm').addEventListener('mousedown',e=>{if(e.target===e.currentTarget)document.getElementById('dlg-undo-confirm').style.display='none';});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();if(!undoStack.length)return;document.getElementById('dlg-undo-confirm').style.display='flex';}});

// openArchiveはstorage.js→archive.js→segments.js→storage.jsの3者循環を避けるため
// window経由で参照する（恒久的。segments.js⇄storage.js間の循環importは実際は問題なく
// 動作しているが、これ以上輪を広げないための予防的判断）
document.getElementById('btn-open-archive').addEventListener('click',()=>{window.openArchive();});
