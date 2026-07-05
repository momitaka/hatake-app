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
export function famStyle(fam){if(!fam)return null;return FAMILIES[fam]||FAMILIES['その他'];}
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
export function getTaskState(sid,tid){return Object.assign({done:false,skip:false,doneDates:[]},(segData.tasks[sid]||{})[tid]||{})}
export function setTaskState(sid,tid,patch){if(!segData.tasks[sid])segData.tasks[sid]={};segData.tasks[sid][tid]=Object.assign(getTaskState(sid,tid),patch);saveLS()}
export function getMilestoneDate(sid,cropId,ms){const v=getVeg(cropId);if(!v)return null;const tasks=v.phases.flatMap(p=>p.tasks).filter(t=>t.milestone===ms);for(const t of tasks){const state=getTaskState(sid,t.id);if(state.doneDates&&state.doneDates.length){const iso=dispToISO(state.doneDates[0]);if(iso)return iso;}}return null}
export function getHarvestSummary(sid){const logs=segData.harvestLogs[sid]||[];const tot={};logs.forEach(h=>{if(!tot[h.unit])tot[h.unit]=0;tot[h.unit]+=Number(h.amount);});return tot}
export function harvestTotalStr(sid){const t=getHarvestSummary(sid);const e=Object.entries(t);if(!e.length)return null;return e.map(([u,a])=>`${a}${u}`).join(' / ')}
export function getMergedLogsByDate(sid){
  const byDate={};
  function add(date,item){if(!date)return;if(!byDate[date])byDate[date]=[];byDate[date].push(item);}
  // segData.tasks の doneDates からタスクログを生成
  const seg=segData.segs[sid];if(seg){const veg=getVeg(seg.crop);if(veg&&veg.phases){veg.phases.forEach(ph=>{ph.tasks.forEach(t=>{const state=getTaskState(sid,t.id);(state.doneDates||[]).forEach(d=>{const iso=dispToISO(d);add(iso,{_type:'task',date:iso,task:t.name});});});});}}
  // segData.harvestLogs
  (segData.harvestLogs[sid]||[]).forEach(h=>add(h.date,{...h,_type:'harvest'}));
  Object.keys(byDate).forEach(date=>{byDate[date].sort((a,b)=>a._type===b._type?0:a._type==='task'?-1:1);});
  return byDate;
}
export function getNextTask(sid,cropId){const v=getVeg(cropId);if(!v||!v.phases.length)return null;const all=v.phases.flatMap(p=>p.tasks);let lastCheckedIdx=-1;all.forEach((t,i)=>{if(getTaskState(sid,t.id).done)lastCheckedIdx=i;});const nextIdx=lastCheckedIdx+1;return nextIdx<all.length?all[nextIdx]:null;}
export function calcProgress(sid,cropId){const v=getVeg(cropId);if(!v)return{pct:0,phaseIdx:0};const all=v.phases.flatMap(p=>p.tasks);let lastCheckedIdx=-1;all.forEach((t,i)=>{if(getTaskState(sid,t.id).done)lastCheckedIdx=i;});const pct=all.length?Math.round((lastCheckedIdx+1)/all.length*100):0;let phaseIdx=0;if(lastCheckedIdx>=0){let count=0;for(let i=0;i<v.phases.length;i++){count+=v.phases[i].tasks.length;if(lastCheckedIdx<count){phaseIdx=i;break;}phaseIdx=i;}}return{pct,phaseIdx}}
export function calcMajorStatus(sid,cropId){const v=getVeg(cropId);if(!v||!v.phases.length)return MAJOR_STATUS[0];const{phaseIdx}=calcProgress(sid,cropId);return MAJOR_STATUS.find(m=>m.id===v.phases[phaseIdx].majorStatus)||MAJOR_STATUS[0]}
export function addDays(dateStr,days){if(!dateStr)return null;const d=new Date(dateStr);d.setDate(d.getDate()+days);return `${d.getMonth()+1}/${d.getDate()}`}
