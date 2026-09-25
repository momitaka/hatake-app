// @ts-check
// ===== 区画データ構造・作物ヘルパー =====
import { gridState, segData, masterData } from './state.js';
import { K, daysBetween, todayISO, addDaysISO, junLabel } from './date-utils.js';
import { FAMILIES, MAJOR_STATUS, PHASE_COLORS, stripPhaseSuffix } from './helpers.js';
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
/** @param {number} row @param {number} col @param {number} [limit] 単一マスで過去に栽培した作物を完了日の新しい順に返す（科を問わず。連作障害対策の履歴表示用） @returns {any[]} */
export function getColHistory(row,col,limit=3){
  return Object.values(segData.archived)
    .filter(a=>a.row===row&&a.cols.includes(col))
    .sort((a,b)=>b.completedDate.localeCompare(a.completedDate))
    .slice(0,limit);
}
/**
 * 複数マス選択時、マスごとに履歴が異なりうるため、履歴の並び（segId列）が同じ連続列だけをまとめてグループ化する。
 * 履歴が無いマスはグループを作らず読み飛ばす（グループの境界にもなる＝隣接していても履歴が途切れれば別グループ）。
 * @param {number} row @param {number[]} cols @param {number} [limit]
 * @returns {Array<{colStart:number,colEnd:number,history:any[]}>}
 */
export function getPlotHistoryGroups(row,cols,limit=3){
  const groups=/** @type {Array<{key:string,colStart:number,colEnd:number,history:any[]}>} */([]);
  cols.forEach(c=>{
    const history=getColHistory(row,c,limit);
    if(!history.length)return;
    const key=history.map(h=>h.segId).join(',');
    const last=groups[groups.length-1];
    if(last&&last.key===key&&last.colEnd===c-1)last.colEnd=c;
    else groups.push({key,colStart:c,colEnd:c,history});
  });
  return groups.map(({colStart,colEnd,history})=>({colStart,colEnd,history}));
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
/** @param {string|{date:string,memo?:string}} raw 実施日1件を{date,memo}形式に正規化する（旧データはdateのみの文字列で保存されているため、そちらにも対応） @returns {{date:string,memo:string}} */
function normDoneDate(raw){return typeof raw==='string'?{date:raw,memo:''}:{date:(raw&&raw.date)||'',memo:(raw&&raw.memo)||''}}
function mergeTaskMaps(a,b){
  const out=Object.assign({},a);
  Object.keys(b||{}).forEach(tid=>{
    if(!out[tid]){out[tid]=b[tid];return;}
    const x=out[tid],y=b[tid];
    const byDate=/** @type {Object<string,{date:string,memo:string}>} */({});
    [...(x.doneDates||[]).map(normDoneDate),...(y.doneDates||[]).map(normDoneDate)].forEach(d=>{if(!byDate[d.date])byDate[d.date]=d;else if(d.memo&&!byDate[d.date].memo)byDate[d.date].memo=d.memo;});
    const doneDates=Object.values(byDate).sort((p,q)=>p.date.localeCompare(q.date));
    const photos=Array.from(new Set([...(x.photos||[]),...(y.photos||[])])).slice(0,2);
    out[tid]={done:!!(x.done||y.done),skip:!!(x.skip&&y.skip),doneDates,photos};
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
export function getTaskState(sid,tid){const k=recordKey(sid);const raw=Object.assign({done:false,skip:false,doneDates:[],photos:[]},(segData.tasks[k]||{})[tid]||{});return Object.assign(raw,{doneDates:(raw.doneDates||[]).map(normDoneDate),photos:raw.photos||[]})}
export function setTaskState(sid,tid,patch){const k=recordKey(sid);if(!segData.tasks[k])segData.tasks[k]={};segData.tasks[k][tid]=Object.assign(getTaskState(sid,tid),patch);saveLS()}
export function getHarvestLogs(sid){return segData.harvestLogs[recordKey(sid)]||[]}
export function addHarvestLog(sid,entry){const k=recordKey(sid);if(!segData.harvestLogs[k])segData.harvestLogs[k]=[];segData.harvestLogs[k].push(entry);segData.harvestLogs[k].sort((a,b)=>a.date.localeCompare(b.date));saveLS()}
/** @param {string} sid @param {string} id @returns {any} 削除した収穫記録（Storage上の写真クリーンアップに使うためphotoPathを呼び出し元に返す）。無ければundefined */
export function removeHarvestLog(sid,id){const k=recordKey(sid);const list=segData.harvestLogs[k]||[];const removed=list.find(x=>x.id===id);segData.harvestLogs[k]=list.filter(x=>x.id!==id);saveLS();return removed;}
/** @param {string} sid @param {string} id @param {string|null} photoPath 収穫記録に紐づく写真のStorageパスを更新する（nullで削除） */
export function setHarvestLogPhoto(sid,id,photoPath){const k=recordKey(sid);const entry=(segData.harvestLogs[k]||[]).find(x=>x.id===id);if(!entry)return;if(photoPath)entry.photoPath=photoPath;else delete entry.photoPath;saveLS()}
/** @param {string} sid @param {string} id @param {string} memo 収穫記録にメモを設定する（空文字なら削除） */
export function setHarvestLogMemo(sid,id,memo){const k=recordKey(sid);const entry=(segData.harvestLogs[k]||[]).find(x=>x.id===id);if(!entry)return;if(memo)entry.memo=memo;else delete entry.memo;saveLS()}
export function getActionLogs(sid){return segData.actionLogs[recordKey(sid)]||[]}
export function getSummaryMemo(sid){return segData.summaryMemo[recordKey(sid)]||''}
export function setSummaryMemo(sid,text){segData.summaryMemo[recordKey(sid)]=text;saveLS()}
export function getMilestoneDate(sid,cropId,ms){const v=getVeg(cropId);if(!v)return null;const tasks=v.phases.flatMap(p=>p.tasks).filter(t=>t.milestone===ms);for(const t of tasks){const state=getTaskState(sid,t.id);if(state.doneDates&&state.doneDates.length){const iso=dispToISO(state.doneDates[0].date);if(iso)return iso;}}return null}
export function getHarvestSummary(sid){const logs=getHarvestLogs(sid);const tot={};logs.forEach(h=>{if(!tot[h.unit])tot[h.unit]=0;tot[h.unit]+=Number(h.amount);});return tot}
export function harvestTotalStr(sid){const t=getHarvestSummary(sid);const e=Object.entries(t);if(!e.length)return null;return e.map(([u,a])=>`${a}${u}`).join(' / ')}
export function getMergedLogsByDate(sid){
  const byDate={};
  function add(date,item){if(!date)return;if(!byDate[date])byDate[date]=[];byDate[date].push(item);}
  // segData.tasks の doneDates からタスクログを生成。写真はタスク単位（doneDates単位ではない）なので、
  // 同じ写真が複数の実施日に重複表示されないよう最新の実施日にのみ添付する
  const seg=segData.segs[sid];if(seg){const veg=getVeg(seg.crop);if(veg&&veg.phases){veg.phases.forEach(ph=>{ph.tasks.forEach(t=>{const state=getTaskState(sid,t.id);const dates=state.doneDates||[];dates.forEach((d,di)=>{const iso=dispToISO(d.date);const photos=di===dates.length-1?(state.photos||[]).filter(Boolean):[];add(iso,{_type:'task',date:iso,task:t.name,memo:d.memo||'',photos});});});});}}
  // segData.harvestLogs
  getHarvestLogs(sid).forEach(h=>add(h.date,{...h,_type:'harvest',photos:h.photoPath?[h.photoPath]:[]}));
  Object.keys(byDate).forEach(date=>{byDate[date].sort((a,b)=>a._type===b._type?0:a._type==='task'?-1:1);});
  return byDate;
}
export function getNextTask(sid,cropId){const v=getVeg(cropId);if(!v||!v.phases.length)return null;const all=v.phases.flatMap(p=>p.tasks);let lastCheckedIdx=-1;all.forEach((t,i)=>{if(getTaskState(sid,t.id).done)lastCheckedIdx=i;});const nextIdx=lastCheckedIdx+1;return nextIdx<all.length?all[nextIdx]:null;}
export function calcProgress(sid,cropId){const v=getVeg(cropId);if(!v)return{pct:0,phaseIdx:0};const all=v.phases.flatMap(p=>p.tasks);let lastCheckedIdx=-1;all.forEach((t,i)=>{if(getTaskState(sid,t.id).done)lastCheckedIdx=i;});const pct=all.length?Math.round((lastCheckedIdx+1)/all.length*100):0;let phaseIdx=0;if(lastCheckedIdx>=0){let count=0;for(let i=0;i<v.phases.length;i++){count+=v.phases[i].tasks.length;if(lastCheckedIdx<count){phaseIdx=i;break;}phaseIdx=i;}}return{pct,phaseIdx}}
export function calcMajorStatus(sid,cropId){const v=getVeg(cropId);if(!v||!v.phases.length)return MAJOR_STATUS[0];const{phaseIdx}=calcProgress(sid,cropId);return MAJOR_STATUS.find(m=>m.id===v.phases[phaseIdx].majorStatus)||MAJOR_STATUS[0]}
/** @param {string} sid @param {string} cropId @returns {{pivotDay:number,baseDate:string|null}} 基準タスク（milestone==='sowing'|'planting'）のday値と、実日付換算に使う基準日（記録された実施日、無ければ定植日） */
export function getPivotInfo(sid,cropId){
  const v=getVeg(cropId);if(!v)return{pivotDay:0,baseDate:null};
  const all=v.phases.flatMap(p=>p.tasks);
  const pivotTask=all.find(t=>t.milestone==='sowing')||all.find(t=>t.milestone==='planting');
  const pivotDay=pivotTask?pivotTask.day:0;
  const pivotDate=pivotTask?getMilestoneDate(sid,cropId,pivotTask.milestone):null;
  const seg=segData.segs[sid];
  const baseDate=pivotDate||(seg&&seg.plantDate)||null;
  return{pivotDay,baseDate};
}
/** @param {string} cropId @returns {string} 週別収穫比較の「同じ野菜」判定に使うグループキー。
 * レシピに`compareGroup`が明示設定されていればそれを使い、無ければ自身のcropIdをそのまま暗黙のグループとする（既存動作を維持） */
function compareGroupOf(cropId){
  const v=getVeg(cropId);
  return (v&&v.compareGroup)||cropId;
}
/**
 * @param {string} sid @param {number} [limit]
 * @returns {any} 収穫グラフ用データ。今回の栽培区画で最も量の多い単位を基準に、同じ比較グループ（レシピの
 * compareGroup。未設定ならcropId自身）に属する過去の栽培（アクティブな他区画＋アーカイブ済み。連携グループは
 * 代表区画のみ）のうち同じ単位で記録があるものを、直近（最新の収穫日または開始日）順にlimit件集計する。
 * 定植日のズレは正規化せず、暦月内の週（1〜7日=1週、8〜14日=2週…）でそのまま揃えることで
 * 「去年の7月1週目と今の7月1週目」のように実際のカレンダー上の同じ時期を比較できるようにする
 */
export function getWeeklyYieldComparisonData(sid,limit=3){
  const seg=segData.segs[sid];if(!seg)return null;
  const cropId=seg.crop;
  const myGroup=compareGroupOf(cropId);
  const summary=getHarvestSummary(sid);
  const units=Object.entries(summary).sort((a,b)=>b[1]-a[1]);
  if(!units.length)return null;
  const unit=units[0][0];
  /** @param {string} dateStr @returns {{key:string,month:number,week:number,label:string}} */
  const toWeek=dateStr=>{const[,m,d]=dateStr.split('-').map(Number);const w=Math.ceil(d/7);return{key:`${m}-${w}`,month:m,week:w,label:`${m}月${w}週`};};
  /** @param {any[]} logs @returns {Object<string,number>} */
  const weeklyTotals=logs=>{
    /** @type {Object<string,number>} */
    const totals={};
    logs.filter(h=>h.unit===unit).forEach(h=>{const k=toWeek(h.date).key;totals[k]=(totals[k]||0)+Number(h.amount);});
    return totals;
  };
  const yearOf=/** @param {string} [d] */d=>d?Number(d.slice(0,4)):null;
  const currentTotals=weeklyTotals(getHarvestLogs(sid));
  const seen=new Set([recordKey(sid)]);
  const candidates=[];
  Object.values(segData.segs).forEach(s=>{
    const key=recordKey(s.id);
    if(compareGroupOf(s.crop)!==myGroup||seen.has(key))return;seen.add(key);
    const logs=getHarvestLogs(s.id);
    const lastDate=[...logs].sort((a,b)=>b.date.localeCompare(a.date))[0]?.date||s.plantDate;
    if(!lastDate)return;
    candidates.push({sortDate:lastDate,label:`${yearOf(lastDate)}年（栽培中）`,totals:weeklyTotals(logs)});
  });
  Object.values(segData.archived).forEach(a=>{
    const key=recordKey(a.segId);
    if(compareGroupOf(a.cropId)!==myGroup||seen.has(key))return;seen.add(key);
    const logs=getHarvestLogs(a.segId);
    const sortDate=a.completedDate||a.plantDate;
    if(!sortDate)return;
    candidates.push({sortDate,label:`${yearOf(a.plantDate||a.completedDate)}年`,totals:weeklyTotals(logs)});
  });
  const past=candidates
    .filter(c=>Object.keys(c.totals).length)
    .sort((a,b)=>b.sortDate.localeCompare(a.sortDate))
    .slice(0,limit);
  if(!Object.keys(currentTotals).length&&!past.length)return null;
  const series=[{label:`今回（${yearOf(todayISO())}年）`,current:true,totals:currentTotals},...past.map(c=>({label:c.label,current:false,totals:c.totals}))];
  const weekMap=new Map();
  series.forEach(s=>Object.keys(s.totals).forEach(k=>{if(!weekMap.has(k)){const[m,w]=k.split('-').map(Number);weekMap.set(k,{key:k,month:m,week:w,label:`${m}月${w}週`});}}));
  const weeks=[...weekMap.values()].sort((a,b)=>(a.month-b.month)||(a.week-b.week));
  return{unit,weeks,series:series.map(s=>({label:s.label,current:s.current,values:weeks.map(w=>s.totals[w.key]||0)}))};
}
/** @param {string} [period] @returns {number|null} 「15〜30日」「〜14日」「101日〜」等の表記から末尾側の数値を抽出する。数値が無ければnull */
function parsePeriodEnd(period){
  if(!period)return null;
  const nums=(String(period).match(/\d+/g)||[]).map(Number);
  return nums.length?nums[nums.length-1]:null;
}
// periodが読み取れない、または前フェーズ以下で累積値として不整合なフェーズに割り当てる暫定の所要日数
const DEFAULT_PHASE_SPAN=14;
/**
 * 工程表のフェーズ帯タイムライン（色分け・現在地マーカー・旬メモリ）を算出する。
 * フェーズの区間はphase.period（例:「15〜30日」）の末尾の数値を累積終了日として算出する。
 * tasks[].dayはフェーズをまたいで比較できる値ではない（AI生成レシピではフェーズごとにリセットされることがある）ため
 * 区間の根拠には使わず、各タスクの位置づけはフェーズ内でのtask.dayの相対位置をフェーズ区間へ比例配分して求める。
 * 最終フェーズ（撤収など）が短すぎて帯が潰れないよう、全体の8%以上の幅は確保する。
 * オクラ・バジル等、実際の収穫がレシピの想定期間を超えて長引くこともあるため、経過日数が
 * 最終フェーズの想定終了日を超えている場合は、最終フェーズの帯を今日まで伸ばす（伸ばさないと
 * 「今日」マーカーが範囲外の右端に張り付き、あたかも栽培が終了したかのように見えてしまうため）。
 * @param {string} sid @param {string} cropId
 * @returns {{segments:Array<{phaseIdx:number,name:string,color:string,start:number,end:number,widthPct:number}>,markerPct:number|null,ticks:Array<{pct:number,label:string}>,taskRelDay:Object<string,number>,baseDate:string|null}|null}
 */
export function getPhaseTimeline(sid,cropId){
  const v=getVeg(cropId);if(!v||!v.phases.length)return null;
  const{baseDate}=getPivotInfo(sid,cropId);
  let prevEnd=0;
  const raw=v.phases.map((p,i)=>{
    const n=parsePeriodEnd(p.period);
    let end;
    if(n==null)end=prevEnd+DEFAULT_PHASE_SPAN;
    else if(n>prevEnd)end=n; // 累積終了日として妥当
    else end=prevEnd+n; // 累積として不整合（このフェーズ単体の所要日数として書かれている等）とみなす
    if(end<=prevEnd)end=prevEnd+DEFAULT_PHASE_SPAN;
    const start=prevEnd;
    prevEnd=end;
    return{phaseIdx:i,name:stripPhaseSuffix(p.name),color:PHASE_COLORS[i%PHASE_COLORS.length],start,end};
  });
  const firstStart=raw[0].start;
  const last=raw[raw.length-1];
  let total=last.end-firstStart;
  const minLastSpan=total*0.08;
  if(last.end-last.start<minLastSpan){last.end=last.start+minLastSpan;total=last.end-firstStart;}

  // 各タスクの累積日：フェーズ内でのtask.dayの相対位置を、そのフェーズの区間（start〜end）へ比例配分して求める
  const taskCumulativeDay=/** @type {Object<string,number>} */({});
  v.phases.forEach((p,i)=>{
    const{start,end}=raw[i];
    const days=p.tasks.map(t=>t.day);
    const lo=Math.min(...days),hi=Math.max(...days);
    p.tasks.forEach(t=>{
      const ratio=hi>lo?(t.day-lo)/(hi-lo):0;
      taskCumulativeDay[t.id]=start+ratio*(end-start);
    });
  });
  const all=v.phases.flatMap(p=>p.tasks);
  const pivotTask=all.find(t=>t.milestone==='sowing')||all.find(t=>t.milestone==='planting');
  const pivotCumDay=pivotTask?taskCumulativeDay[pivotTask.id]:0;
  const taskRelDay=/** @type {Object<string,number>} */({});
  all.forEach(t=>{taskRelDay[t.id]=Math.round(taskCumulativeDay[t.id]-pivotCumDay);});

  let todayDay=null;
  if(baseDate){
    todayDay=pivotCumDay+daysBetween(baseDate,todayISO());
    if(todayDay>=last.end){last.end=todayDay+Math.max(7,(todayDay-firstStart)*0.08);total=last.end-firstStart;}
  }
  const segments=raw.map(r=>({...r,widthPct:total>0?(r.end-r.start)/total*100:100/raw.length}));

  let markerPct=null;
  const ticks=/** @type {Array<{pct:number,label:string}>} */([]);
  if(baseDate&&total>0&&todayDay!=null){
    markerPct=Math.max(0,Math.min(100,(todayDay-firstStart)/total*100));
    let lastPct=-100;
    for(let i=1;i<segments.length;i++){
      const pct=(segments[i].start-firstStart)/total*100;
      if(pct-lastPct<8)continue; // 目盛り同士が近すぎて重なる場合は間引く
      const label=junLabel(addDaysISO(baseDate,segments[i].start-pivotCumDay));
      if(label){ticks.push({pct,label});lastPct=pct;}
    }
  }
  return{segments,markerPct,ticks,taskRelDay,baseDate};
}
