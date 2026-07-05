// @ts-check
// ===== 完了機能（区画のアーカイブ化） =====
import { segData, gridState } from './state.js';
import { todayISO } from './date-utils.js';
import { vegIconHtml } from './helpers.js';
import { getVeg, harvestTotalStr, getMilestoneDate } from './segments.js';
import { saveLS, pushUndo } from './storage.js';
import { goBack } from './manage.js';

let pendingCompleteSeg=null;
export function openCompleteConfirm(sid){
  const seg=segData.segs[sid];if(!seg)return;const veg=getVeg(seg.crop);
  pendingCompleteSeg=sid;
  const label=`${veg?vegIconHtml(veg,18)+' '+veg.name:'不明'}（${seg.row+1}行 ${Math.min(...seg.cols)+1}〜${Math.max(...seg.cols)+1}列）`;
  document.getElementById('dlg-complete-target').innerHTML=label;
  document.getElementById('dlg-complete-confirm').style.display='flex';
}
export function showArchiveDone(){document.getElementById('dlg-archive-done').style.display='flex';}
export function closeCompleteConfirm(){pendingCompleteSeg=null;document.getElementById('dlg-complete-confirm').style.display='none';}
export function executeComplete(sid){
  const seg=segData.segs[sid];if(!seg)return;const veg=getVeg(seg.crop);
  pushUndo();
  const taskLogs=segData.actionLogs[sid]||[];
  const allLogDates=taskLogs.map(l=>l.date).sort();
  const lastLogDate=allLogDates[allLogDates.length-1]||null;
  segData.archived[sid]={
    segId:sid,
    cropId:seg.crop,
    cropName:veg?veg.name:'不明',
    family:veg?veg.family:'',
    variety:veg?(veg.variety||''):'',
    plantDate:seg.plantDate||null,
    completedDate:todayISO(),
    lastLogDate,
    workCount:taskLogs.length,
    harvestTotal:harvestTotalStr(sid)||null,
    growMethod:veg?veg.growMethod||'seedling':'seedling',
    sowingDate:getMilestoneDate(sid,seg.crop,'sowing'),
    germinationDate:getMilestoneDate(sid,seg.crop,'germination'),
    plantingDate:getMilestoneDate(sid,seg.crop,'planting'),
    harvestStartDate:getMilestoneDate(sid,seg.crop,'harvest_start'),
    row:seg.row,
    cols:[...seg.cols],
    gridCOLS:gridState.cols,
    gridROWS:gridState.rows,
    gridSnapshot:Object.values(segData.segs).map(s=>{const sv=getVeg(s.crop);return{segId:s.id,row:s.row,cols:[...s.cols],cropId:s.crop,cropName:sv?sv.name:'',family:sv?sv.family:'',isSelf:s.id===sid};}),
  };
  // グリッドから解放（セルをgridState.cellsから削除）。segData.actionLogs/segData.harvestLogs/segData.summaryMemo/segData.tasksはsegIdキーのまま保持し削除しない。
  Object.keys(gridState.cells).forEach(k=>{if(gridState.cells[k]&&gridState.cells[k].segId===sid)delete gridState.cells[k];});
  saveLS();
  closeCompleteConfirm();
  goBack();
  showArchiveDone();
}
document.getElementById('btn-complete-cancel').addEventListener('click',closeCompleteConfirm);
document.getElementById('dlg-complete-confirm').addEventListener('mousedown',e=>{if(e.target===e.currentTarget)closeCompleteConfirm();});
document.getElementById('btn-complete-execute').addEventListener('click',()=>{if(pendingCompleteSeg)executeComplete(pendingCompleteSeg);});
