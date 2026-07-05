// @ts-check
// ===== 区画登録ダイアログ =====
import { dragState, masterData, gridState, addVegState } from './state.js';
import { K, todayISO, daysBetween } from './date-utils.js';
import { getVeg, ROTATION_FAMILIES, checkRotation, buildSegs } from './segments.js';
import { saveLS, pushUndo } from './storage.js';

export function showRegDlg(){
  // populateCropSelectはjs/grid.js抽出までのwindow経由の一時ブリッジ
  window.populateCropSelect();
  document.getElementById('dlg-preview').textContent=`${dragState.pendingRow+1}行 / ${dragState.pendingStart+1}〜${dragState.pendingEnd+1}列（${dragState.pendingEnd-dragState.pendingStart+1}マス）`;
  document.getElementById('dlg-crop').value='';
  document.getElementById('dlg-date-input').value=todayISO();
  document.getElementById('dlg-save').disabled=true;
  const rw=document.getElementById('dlg-rotation-warn');rw.style.display='none';rw.innerHTML='';
  const noVeg=!Object.keys(masterData.vegMaster).length;
  document.getElementById('dlg-crop-field').style.display=noVeg?'none':'';
  document.getElementById('dlg-date-field').style.display=noVeg?'none':'';
  document.getElementById('dlg-save').style.display=noVeg?'none':'';
  document.getElementById('dlg-no-veg').style.display=noVeg?'block':'none';
  document.getElementById('dlg-register').style.display='flex';
  window._regDlgOpenTime=Date.now();
}
document.getElementById('dlg-crop').addEventListener('change',()=>{
  const cropId=document.getElementById('dlg-crop').value;
  document.getElementById('dlg-save').disabled=!cropId;
  const warn=document.getElementById('dlg-rotation-warn');
  warn.style.display='none';warn.innerHTML='';
  if(!cropId||dragState.pendingRow<0)return;
  const veg=getVeg(cropId);if(!veg||!ROTATION_FAMILIES.has(veg.family))return;
  const cols=Array.from({length:dragState.pendingEnd-dragState.pendingStart+1},(_,i)=>dragState.pendingStart+i);
  const hits=checkRotation(dragState.pendingRow,cols).filter(a=>a.family===veg.family);
  if(!hits.length)return;
  const h=hits[0];const months=Math.round(daysBetween(h.completedDate,todayISO())/30);
  warn.innerHTML=`<i class="ti ti-alert-triangle" style="font-size:var(--fs-xs);margin-right:3px"></i>このエリアでは<strong>${months}ヶ月前</strong>に${h.family}（${h.cropName}）を栽培していました。連作障害に注意してください。`;
  warn.style.display='block';
});
// renderGrid/openMasterはjs/grid.js・js/master-recipes.js抽出までのwindow経由の一時ブリッジ
document.getElementById('btn-dlg-cancel').addEventListener('click',()=>{document.getElementById('dlg-register').style.display='none';dragState.pendingRow=-1;dragState.pendingStart=-1;dragState.pendingEnd=-1;window.renderGrid();});
document.getElementById('dlg-go-master').addEventListener('click',()=>{document.getElementById('dlg-register').style.display='none';dragState.pendingRow=-1;dragState.pendingStart=-1;dragState.pendingEnd=-1;window.openMaster();});
document.getElementById('dlg-add-new-veg').addEventListener('click',()=>{document.getElementById('dlg-register').style.display='none';addVegState.fromReg=true;window.openMaster();document.getElementById('btn-add-veg').click();});
document.getElementById('dlg-register').addEventListener('mousedown',e=>{if(e.target===e.currentTarget&&Date.now()-(window._regDlgOpenTime||0)>500){document.getElementById('dlg-register').style.display='none';dragState.pendingRow=-1;dragState.pendingStart=-1;dragState.pendingEnd=-1;window.renderGrid();}});
document.getElementById('dlg-save').addEventListener('click',()=>{
  const cropId=document.getElementById('dlg-crop').value,date=document.getElementById('dlg-date-input').value;if(!cropId)return;
  document.getElementById('dlg-register').style.display='none';pushUndo();
  const sid=`s_${dragState.pendingRow}_${dragState.pendingStart}_${Date.now()}`;
  for(let c=dragState.pendingStart;c<=dragState.pendingEnd;c++){const k=K(dragState.pendingRow,c);if(!gridState.cells[k]||!gridState.cells[k].crop)gridState.cells[k]={segId:sid,crop:cropId,plantDate:date};}
  dragState.pendingRow=-1;dragState.pendingStart=-1;dragState.pendingEnd=-1;buildSegs();window.renderGrid();saveLS();
});
