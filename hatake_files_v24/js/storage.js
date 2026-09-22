// @ts-check
// ===== ローカルストレージ管理 =====
// v25: ストレージ抽象化
// freeDataStrategy='session' → sessionStorage（バックグラウンドで破棄）
// freeDataStrategy='localStorage' → localStorage（個人版・従来通り）
// APP_SUBSCRIBED=true → Supabase永続保存も行う
import { LS_KEY, masterData, segData, gridState, farmMeta } from './state.js';
import { TOMATO_SAMPLE, vegIconHtml } from './helpers.js';
import { saveToDB } from './db.js';
import { buildSegs } from './segments.js';
import { renderFarmIconPicker } from './grid-settings.js';

export const _dataStrategy=(window.APP_CONFIG&&window.APP_CONFIG.freeDataStrategy)||'localStorage';
const _storage={
  getItem(k){return _dataStrategy==='session'?sessionStorage.getItem(k):localStorage.getItem(k);},
  setItem(k,v){if(_dataStrategy==='session'){sessionStorage.setItem(k,v);}else{localStorage.setItem(k,v);}}
};
// 管理画面で区画ごとに最後に開いていたタブ。Supabaseには同期せず端末内のみで記憶する。
const LAST_TAB_KEY=LS_KEY+'_lastTab';
/** @param {string} segId */
export function getLastTab(segId){
  try{const m=JSON.parse(_storage.getItem(LAST_TAB_KEY)||'{}');return m[segId]||null;}catch(e){return null;}
}
/** @param {string} segId @param {string} tabId */
export function setLastTab(segId,tabId){
  try{const m=JSON.parse(_storage.getItem(LAST_TAB_KEY)||'{}');m[segId]=tabId;_storage.setItem(LAST_TAB_KEY,JSON.stringify(m));}catch(e){}
}
export function saveLS(){
  try{
    const d={cells:gridState.cells,COLS:gridState.cols,ROWS:gridState.rows,segTasks:segData.tasks,actionLogs:segData.actionLogs,harvestLogs:segData.harvestLogs,segSummaryMemo:segData.summaryMemo,vegMaster:masterData.vegMaster,archivedSegs:segData.archived,segLinkGroups:segData.linkGroups,farmName:farmMeta.name,aisleRows:gridState.aisleRows,aisleCols:gridState.aisleCols,farmNameFont:farmMeta.font,farmIcon:farmMeta.icon,farmLat:farmMeta.lat,farmLng:farmMeta.lng,farmRegion:farmMeta.region};
    _storage.setItem(LS_KEY,JSON.stringify(d));
    _storage.setItem(LS_KEY+'_icons',JSON.stringify(masterData.customIcons));
    // Supabase保存：個人版は常に / コラボ版はサブスク加入後のみ
    if(_dataStrategy==='localStorage'||window.APP_SUBSCRIBED){saveToDB(d);}
    // セッション版未サブスク：保存バナーを表示
    if(_dataStrategy==='session'&&!window.APP_SUBSCRIBED){showSaveBanner();}
  }catch(e){}
}
export function updateFarmNameDisplay(){const el=document.getElementById('farm-name-display');const sc=document.getElementById('farm-seg-count');const splashEl=document.getElementById('splash-farm-name');const iconEl=document.getElementById('farm-icon-display');const fontFamily=`'${farmMeta.font}',serif`;if(el)el.style.fontFamily=fontFamily;if(splashEl)splashEl.style.fontFamily=fontFamily;if(iconEl){const iconId=farmMeta.icon||'tomato';if(iconId&&masterData.vegMaster[iconId]){iconEl.innerHTML=vegIconHtml(masterData.vegMaster[iconId],28);iconEl.style.display='inline-flex';}else{iconEl.innerHTML='🍅';iconEl.style.display='inline-flex';}}if(el){el.textContent=farmMeta.name||((window.APP_CONFIG&&window.APP_CONFIG.appName)||'私の畑');el.style.display='block';}if(sc){buildSegs();const cnt=Object.keys(segData.segs).length;sc.textContent=cnt+'栽培区画 管理中';sc.style.display='block';}}
export function loadLS(){
  try{const d=JSON.parse(_storage.getItem(LS_KEY)||'null');if(d&&d.cells){gridState.cells=d.cells;gridState.cols=d.COLS||8;gridState.rows=d.ROWS||6;segData.tasks=d.segTasks||{};segData.actionLogs=d.actionLogs||{};segData.harvestLogs=d.harvestLogs||{};segData.summaryMemo=d.segSummaryMemo||{};masterData.vegMaster=d.vegMaster||{};segData.archived=d.archivedSegs||{};segData.linkGroups=d.segLinkGroups||{};farmMeta.name=d.farmName||'';gridState.aisleRows=d.aisleRows||[];gridState.aisleCols=d.aisleCols||[];farmMeta.font=d.farmNameFont||'Kaisei Opti';farmMeta.icon=d.farmIcon||'';farmMeta.lat=(typeof d.farmLat==='number')?d.farmLat:null;farmMeta.lng=(typeof d.farmLng==='number')?d.farmLng:null;farmMeta.region=d.farmRegion||'';}}catch(e){}
  try{const ic=JSON.parse(_storage.getItem(LS_KEY+'_icons')||'null');if(ic)masterData.customIcons=ic;}catch(e){}
  if(!masterData.vegMaster['tomato'])masterData.vegMaster['tomato']=JSON.parse(JSON.stringify(TOMATO_SAMPLE));
  /** @type {HTMLInputElement} */ (document.getElementById('s-cols')).value=String(gridState.cols);/** @type {HTMLInputElement} */ (document.getElementById('s-rows')).value=String(gridState.rows);
  /** @type {HTMLInputElement} */ (document.getElementById('s-farm-name')).value=farmMeta.name;
  /** @type {NodeListOf<HTMLInputElement>} */ (document.querySelectorAll('input[name="farm-font"]')).forEach(r=>{r.checked=(r.value===farmMeta.font);});
  /** @type {HTMLInputElement} */ (document.getElementById('s-weather-lat')).value=farmMeta.lat!=null?String(farmMeta.lat):'';
  /** @type {HTMLInputElement} */ (document.getElementById('s-weather-lng')).value=farmMeta.lng!=null?String(farmMeta.lng):'';
  /** @type {HTMLSelectElement} */ (document.getElementById('s-farm-region')).value=farmMeta.region||'';
  renderFarmIconPicker();
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

// openArchiveはstorage.js→archive.js→segments.js→storage.jsの3者循環を避けるため
// window経由で参照する（恒久的。segments.js⇄storage.js間の循環importは実際は問題なく
// 動作しているが、これ以上輪を広げないための予防的判断）
document.getElementById('btn-open-archive').addEventListener('click',()=>{window.openArchive();});
