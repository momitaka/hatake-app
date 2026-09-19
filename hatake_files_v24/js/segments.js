// @ts-check
// ===== 区画データ構造・作物ヘルパー =====
import { gridState, segData, masterData } from './state.js';
import { K } from './date-utils.js';
import { FAMILIES, MAJOR_STATUS } from './helpers.js';
import { dispToISO } from './dialogs.js';
import { saveLS } from './storage.js';

export function buildSegs(){segData.segs={};for(let r=0;r<gridState.rows;r++)for(let c=0;c<gridState.cols;c++){const k=K(r,c),cell=gridState.cells[k];if(!cell)continue;const sid=cell.segId;if(!segData.segs[sid])segData.segs[sid]={id:sid,row:r,cols:[],crop:cell.crop||null,plantDate:cell.plantDate||null};else if(!segData.segs[sid].plantDate&&cell.plantDate)segData.segs[sid].plantDate=cell.plantDate;segData.segs[sid].cols.push(c);}}
/** @param {string} id @returns {any} */
export function getVeg(id){return masterData.vegMaster[id]||null}
export function vegFamily(id){const v=getVeg(id);return v?v.family:null}
export function famStyle(fam){if(fam==null)return null;return FAMILIES[fam]||FAMILIES['その他'];}
// 連作障害の警告対象科。「その他」はここに含めない＝連作しても警告しない
// （病害虫が出にくい科という前提。品種追加時に科を増やす場合はここも見直す）。
// 経過期間による足切りはなく、何年前の記録でも同じ科なら常に警告する。
export const ROTATION_FAMILIES=new Set(['ナス科','ウリ科','マメ科','アブラナ科','ヒガンバナ科','セリ科','キク科','シソ科','アオイ科']);
export function checkRotation(row,cols){
  return Object.values(segData.archived)
    .filter(a=>ROTATION_FAMILIES.has(a.family)&&a.row===row&&cols.some(c=>a.cols.includes(c)))
    .sort((a,b)=>b.completedDate.localeCompare(a.completedDate));
}
export function segIsRegistered(sid){return !!(segData.segs[sid]&&segData.segs[sid].crop)}
// ===== 区画連携（非隣接区画を「同じ野菜」として管理） =====
// segData.linkGroupsはエイリアスsid→代表sidのマップ。tasks/harvestLogs/actionLogs/
// summaryMemoの実データは常に代表sidのキーに集約する。代表sid自身はlinkGroupsのキーにならない。
/** @param {string} sid @returns {string} 実データが格納されているキー（代表sid。未連携ならsid自身）*/
export function recordKey(sid){return (segData.linkGroups&&segData.linkGroups[sid])||sid}
/** @param {string} sid @returns {string[]} 同じグループに属する全sid（未連携ならsid自身のみ） */
export function getLinkedSids(sid){
  const rep=recordKey(sid);
  const aliases=Object.keys(segData.linkGroups||{}).filter(k=>segData.linkGroups[k]===rep);
  return Array.from(new Set([rep,...aliases]));
}
function cloneVal(v){return v!=null?JSON.parse(JSON.stringify(v)):v}
/** @typedef {{id:string,date:string,photos:string[]}} DoneEntry 工程実施の1回分の記録（旧データは日付文字列のみの配列だったため、読み出し時に都度この形へ正規化する） */
/** @param {string|{id?:string,date:string,photos?:string[]}} raw @param {number} idx @returns {DoneEntry} */
function normDoneEntry(raw,idx){
  if(typeof raw==='string')return{id:`d_legacy_${idx}`,date:raw,photos:[]};
  return{id:raw.id||`d_legacy_${idx}`,date:raw.date,photos:raw.photos||[]};
}
/** @param {any[]|undefined} arr @returns {DoneEntry[]} */
function normDoneDates(arr){return (arr||[]).map((d,i)=>normDoneEntry(d,i))}
function mergeTaskMaps(a,b){
  const out=Object.assign({},a);
  Object.keys(b||{}).forEach(tid=>{
    if(!out[tid]){out[tid]=b[tid];return;}
    const x=out[tid],y=b[tid];
    /** @type {Map<string,DoneEntry>} */
    const merged=new Map();
    [...normDoneDates(x.doneDates),...normDoneDates(y.doneDates)].forEach(e=>{
      const existing=merged.get(e.date);
      if(existing)existing.photos=Array.from(new Set([...(existing.photos||[]),...(e.photos||[])])).slice(0,2);
      else merged.set(e.date,{...e});
    });
    const doneDates=Array.from(merged.values()).sort((p,q)=>p.date.localeCompare(q.date));
    out[tid]={done:!!(x.done||y.done),skip:!!(x.skip&&y.skip),doneDates};
  });
  return out;
}
/** @param {string} sid @returns {boolean} 工程表の実施記録・収穫記録・全体メモのいずれかに実績があるか（連携時の確認アラート表示判定に使用） */
export function hasAnyRecord(sid){
  const k=recordKey(sid);
  const tasks=segData.tasks[k];
  const hasTask=!!tasks&&Object.values(tasks).some(t=>t.done||t.skip||(t.doneDates&&t.doneDates.length));
  const hasHarvest=(segData.harvestLogs[k]||[]).length>0;
  const hasMemo=!!(segData.summaryMemo[k]||'').trim();
  return hasTask||hasHarvest||hasMemo;
}
/** repSidを代表として、otherSids（既に連携済みのグループごと）を統合する */
export function linkSegs(repSid,otherSids){
  if(!segData.linkGroups)segData.linkGroups={};
  otherSids.forEach(rawSid=>{
    if(rawSid===repSid)return;
    const otherKey=recordKey(rawSid);
    if(otherKey===repSid)return;
    segData.tasks[repSid]=mergeTaskMaps(segData.tasks[repSid],segData.tasks[otherKey]);
    segData.harvestLogs[repSid]=[...(segData.harvestLogs[repSid]||[]),...(segData.harvestLogs[otherKey]||[])].sort((a,b)=>a.date.localeCompare(b.date));
    segData.actionLogs[repSid]=[...(segData.actionLogs[repSid]||[]),...(segData.actionLogs[otherKey]||[])];
    const memoA=segData.summaryMemo[repSid]||'',memoB=segData.summaryMemo[otherKey]||'';
    segData.summaryMemo[repSid]=memoA&&memoB?`${memoA}\n---\n${memoB}`:(memoA||memoB||'');
    delete segData.tasks[otherKey];delete segData.harvestLogs[otherKey];delete segData.actionLogs[otherKey];delete segData.summaryMemo[otherKey];
    Object.keys(segData.linkGroups).forEach(k=>{if(segData.linkGroups[k]===otherKey)segData.linkGroups[k]=repSid;});
    segData.linkGroups[otherKey]=repSid;
  });
  saveLS();
}
/** sidをグループから切り離す。sidは現時点までの共有記録を自分専用に複製して引き継ぐ */
export function unlinkOne(sid){
  if(!segData.linkGroups)segData.linkGroups={};
  const key=recordKey(sid);
  if(key===sid){
    const aliases=Object.keys(segData.linkGroups).filter(k=>segData.linkGroups[k]===sid);
    if(!aliases.length)return;
    const newRep=aliases[0];
    segData.tasks[newRep]=cloneVal(segData.tasks[sid]);
    segData.harvestLogs[newRep]=cloneVal(segData.harvestLogs[sid]);
    segData.actionLogs[newRep]=cloneVal(segData.actionLogs[sid]);
    segData.summaryMemo[newRep]=segData.summaryMemo[sid];
    aliases.forEach(a=>{if(a===newRep)delete segData.linkGroups[a];else segData.linkGroups[a]=newRep;});
  }else{
    segData.tasks[sid]=cloneVal(segData.tasks[key]);
    segData.harvestLogs[sid]=cloneVal(segData.harvestLogs[key]);
    segData.actionLogs[sid]=cloneVal(segData.actionLogs[key]);
    segData.summaryMemo[sid]=segData.summaryMemo[key];
    delete segData.linkGroups[sid];
  }
  saveLS();
}
/** 区画の登録を完全に削除する前に呼ぶ。sid自身のデータは複製せず、残りのグループの代表を立て直すだけ行う */
export function detachSegFromGroup(sid){
  if(!segData.linkGroups)segData.linkGroups={};
  const key=recordKey(sid);
  if(key!==sid){delete segData.linkGroups[sid];return;}
  const aliases=Object.keys(segData.linkGroups).filter(k=>segData.linkGroups[k]===sid);
  if(!aliases.length)return;
  const newRep=aliases[0];
  segData.tasks[newRep]=segData.tasks[sid];
  segData.harvestLogs[newRep]=segData.harvestLogs[sid];
  segData.actionLogs[newRep]=segData.actionLogs[sid];
  segData.summaryMemo[newRep]=segData.summaryMemo[sid];
  aliases.forEach(a=>{if(a===newRep)delete segData.linkGroups[a];else segData.linkGroups[a]=newRep;});
}
export function getTaskState(sid,tid){const k=recordKey(sid);const raw=Object.assign({done:false,skip:false,doneDates:[]},(segData.tasks[k]||{})[tid]||{});return Object.assign(raw,{doneDates:normDoneDates(raw.doneDates)})}
export function setTaskState(sid,tid,patch){const k=recordKey(sid);if(!segData.tasks[k])segData.tasks[k]={};segData.tasks[k][tid]=Object.assign(getTaskState(sid,tid),patch);saveLS()}
/** @returns {string} 工程実施記録の新規idを生成する（写真のStorageパス命名にも使う） */
export function genDoneEntryId(){return `d_${Date.now()}_${Math.random().toString(36).slice(2,7)}`}
export function getHarvestLogs(sid){return segData.harvestLogs[recordKey(sid)]||[]}
export function addHarvestLog(sid,entry){const k=recordKey(sid);if(!segData.harvestLogs[k])segData.harvestLogs[k]=[];segData.harvestLogs[k].push(entry);segData.harvestLogs[k].sort((a,b)=>a.date.localeCompare(b.date));saveLS()}
/** @param {string} sid @param {string} id @returns {any} 削除した収穫記録（Storage上の写真クリーンアップに使うためphotoPathを呼び出し元に返す）。無ければundefined */
export function removeHarvestLog(sid,id){const k=recordKey(sid);const list=segData.harvestLogs[k]||[];const removed=list.find(x=>x.id===id);segData.harvestLogs[k]=list.filter(x=>x.id!==id);saveLS();return removed;}
/** @param {string} sid @param {string} id @param {string|null} photoPath 収穫記録に紐づく写真のStorageパスを更新する（nullで削除） */
export function setHarvestLogPhoto(sid,id,photoPath){const k=recordKey(sid);const entry=(segData.harvestLogs[k]||[]).find(x=>x.id===id);if(!entry)return;if(photoPath)entry.photoPath=photoPath;else delete entry.photoPath;saveLS()}
export function getActionLogs(sid){return segData.actionLogs[recordKey(sid)]||[]}
export function getSummaryMemo(sid){return segData.summaryMemo[recordKey(sid)]||''}
export function setSummaryMemo(sid,text){segData.summaryMemo[recordKey(sid)]=text;saveLS()}
export function getMilestoneDate(sid,cropId,ms){const v=getVeg(cropId);if(!v)return null;const tasks=v.phases.flatMap(p=>p.tasks).filter(t=>t.milestone===ms);for(const t of tasks){const state=getTaskState(sid,t.id);if(state.doneDates&&state.doneDates.length){const iso=dispToISO(state.doneDates[0].date);if(iso)return iso;}}return null}
export function getHarvestSummary(sid){const logs=getHarvestLogs(sid);const tot={};logs.forEach(h=>{if(!tot[h.unit])tot[h.unit]=0;tot[h.unit]+=Number(h.amount);});return tot}
export function harvestTotalStr(sid){const t=getHarvestSummary(sid);const e=Object.entries(t);if(!e.length)return null;return e.map(([u,a])=>`${a}${u}`).join(' / ')}
export function getMergedLogsByDate(sid){
  const byDate={};
  function add(date,item){if(!date)return;if(!byDate[date])byDate[date]=[];byDate[date].push(item);}
  // segData.tasks の doneDates からタスクログを生成
  const seg=segData.segs[sid];if(seg){const veg=getVeg(seg.crop);if(veg&&veg.phases){veg.phases.forEach(ph=>{ph.tasks.forEach(t=>{const state=getTaskState(sid,t.id);(state.doneDates||[]).forEach(d=>{const iso=dispToISO(d.date);add(iso,{_type:'task',date:iso,task:t.name});});});});}}
  // segData.harvestLogs
  getHarvestLogs(sid).forEach(h=>add(h.date,{...h,_type:'harvest'}));
  Object.keys(byDate).forEach(date=>{byDate[date].sort((a,b)=>a._type===b._type?0:a._type==='task'?-1:1);});
  return byDate;
}
export function getNextTask(sid,cropId){const v=getVeg(cropId);if(!v||!v.phases.length)return null;const all=v.phases.flatMap(p=>p.tasks);let lastCheckedIdx=-1;all.forEach((t,i)=>{if(getTaskState(sid,t.id).done)lastCheckedIdx=i;});const nextIdx=lastCheckedIdx+1;return nextIdx<all.length?all[nextIdx]:null;}
export function calcProgress(sid,cropId){const v=getVeg(cropId);if(!v)return{pct:0,phaseIdx:0};const all=v.phases.flatMap(p=>p.tasks);let lastCheckedIdx=-1;all.forEach((t,i)=>{if(getTaskState(sid,t.id).done)lastCheckedIdx=i;});const pct=all.length?Math.round((lastCheckedIdx+1)/all.length*100):0;let phaseIdx=0;if(lastCheckedIdx>=0){let count=0;for(let i=0;i<v.phases.length;i++){count+=v.phases[i].tasks.length;if(lastCheckedIdx<count){phaseIdx=i;break;}phaseIdx=i;}}return{pct,phaseIdx}}
export function calcMajorStatus(sid,cropId){const v=getVeg(cropId);if(!v||!v.phases.length)return MAJOR_STATUS[0];const{phaseIdx}=calcProgress(sid,cropId);return MAJOR_STATUS.find(m=>m.id===v.phases[phaseIdx].majorStatus)||MAJOR_STATUS[0]}
export function addDays(dateStr,days){if(!dateStr)return null;const d=new Date(dateStr);d.setDate(d.getDate()+days);return `${d.getMonth()+1}/${d.getDate()}`}
