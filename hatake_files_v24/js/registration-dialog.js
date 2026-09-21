// @ts-check
// ===== 区画登録ダイアログ =====
import { dragState, masterData, gridState, segData, addVegState } from './state.js';
import { K, todayISO, daysBetween } from './date-utils.js';
import { getVeg, ROTATION_FAMILIES, checkRotation, buildSegs, linkSegs } from './segments.js';
import { vegIconHtml } from './helpers.js';
import { saveLS } from './storage.js';
import { openMaster } from './grid-settings.js';

/** 登録ダイアログで選択中の連携先sid（登録と同時に連携する候補） @type {Set<string>} */
let regLinkChecked=new Set();
function updateLinkLabel(){
  document.getElementById('dlg-link-label').textContent=regLinkChecked.size?`他の栽培エリアと連携する（任意）・${regLinkChecked.size}件選択中`:'他の栽培エリアと連携する（任意）';
}
// 作物を選ばなくても、連携先を1件以上選んでいれば登録可能（連携先の作物を引き継ぐ）
function updateSaveEnabled(){
  const cropId=/** @type {HTMLSelectElement} */ (document.getElementById('dlg-crop')).value;
  /** @type {HTMLButtonElement} */ (document.getElementById('dlg-save')).disabled=!cropId&&!regLinkChecked.size;
}

export function showRegDlg(){
  // grid.js⇄registration-dialog.jsは相互依存（grid.jsがshowRegDlgを使う）のため
  // 循環import回避のためpopulateCropSelect/renderGridはwindow経由で参照する
  window.populateCropSelect();
  document.getElementById('dlg-preview').textContent=`${dragState.pendingRow+1}行 / ${dragState.pendingStart+1}〜${dragState.pendingEnd+1}列（${dragState.pendingEnd-dragState.pendingStart+1}マス）`;
  /** @type {HTMLSelectElement} */ (document.getElementById('dlg-crop')).value='';
  /** @type {HTMLInputElement} */ (document.getElementById('dlg-date-input')).value=todayISO();
  /** @type {HTMLButtonElement} */ (document.getElementById('dlg-save')).disabled=true;
  const rw=document.getElementById('dlg-rotation-warn');rw.style.display='none';rw.innerHTML='';
  const noVeg=!Object.keys(masterData.vegMaster).length;
  document.getElementById('dlg-crop-field').style.display=noVeg?'none':'';
  document.getElementById('dlg-date-field').style.display=noVeg?'none':'';
  document.getElementById('dlg-save').style.display=noVeg?'none':'';
  document.getElementById('dlg-no-veg').style.display=noVeg?'block':'none';
  buildSegs();
  regLinkChecked=new Set();
  const candidates=Object.values(segData.segs).filter(s=>s.crop);
  const linkField=document.getElementById('dlg-link-field');
  const linkBody=document.getElementById('dlg-link-body');
  const linkChevron=document.getElementById('dlg-link-chevron');
  const list=document.getElementById('dlg-link-candidates');
  list.innerHTML='';
  linkBody.style.display='none';
  linkChevron.className='ti ti-chevron-down';
  updateLinkLabel();
  if(noVeg||!candidates.length){
    linkField.style.display='none';
  }else{
    linkField.style.display='';
    candidates.forEach(s=>{
      const v=getVeg(s.crop);
      const row=document.createElement('label');row.style.cssText='display:flex;align-items:center;gap:8px;font-size:var(--fs-sm);padding:6px 8px;border-radius:var(--border-radius-md);cursor:pointer';
      row.addEventListener('mouseenter',()=>{row.style.background='var(--color-background-secondary)';});
      row.addEventListener('mouseleave',()=>{row.style.background='';});
      const cb=document.createElement('input');cb.type='checkbox';cb.addEventListener('change',()=>{if(cb.checked)regLinkChecked.add(s.id);else regLinkChecked.delete(s.id);updateLinkLabel();updateSaveEnabled();});
      const rowLetter=String.fromCharCode(65+s.row),colStart=Math.min(...s.cols)+1,colEnd=Math.max(...s.cols)+1;
      const loc=colStart===colEnd?`${rowLetter}${colStart}`:`${rowLetter}${colStart}〜${rowLetter}${colEnd}`;
      const label=document.createElement('span');label.innerHTML=`${v?vegIconHtml(v,16):''} ${v?v.name:'不明'}（${loc}）`;
      row.append(cb,label);list.appendChild(row);
    });
  }
  document.getElementById('dlg-register').style.display='flex';
  window._regDlgOpenTime=Date.now();
}
document.getElementById('dlg-crop').addEventListener('change',()=>{
  const cropId=/** @type {HTMLSelectElement} */ (document.getElementById('dlg-crop')).value;
  updateSaveEnabled();
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
document.getElementById('dlg-link-toggle').addEventListener('click',()=>{
  const body=document.getElementById('dlg-link-body'),chevron=document.getElementById('dlg-link-chevron');
  const open=body.style.display!=='none';
  body.style.display=open?'none':'block';
  chevron.className=open?'ti ti-chevron-down':'ti ti-chevron-up';
});
document.getElementById('btn-dlg-cancel').addEventListener('click',()=>{document.getElementById('dlg-register').style.display='none';dragState.pendingRow=-1;dragState.pendingStart=-1;dragState.pendingEnd=-1;window.renderGrid();});
document.getElementById('dlg-go-master').addEventListener('click',()=>{document.getElementById('dlg-register').style.display='none';dragState.pendingRow=-1;dragState.pendingStart=-1;dragState.pendingEnd=-1;openMaster();});
document.getElementById('dlg-add-new-veg').addEventListener('click',()=>{document.getElementById('dlg-register').style.display='none';addVegState.fromReg=true;openMaster();document.getElementById('btn-add-veg').click();});
document.getElementById('dlg-register').addEventListener('mousedown',e=>{if(e.target===e.currentTarget&&Date.now()-(window._regDlgOpenTime||0)>500){document.getElementById('dlg-register').style.display='none';dragState.pendingRow=-1;dragState.pendingStart=-1;dragState.pendingEnd=-1;window.renderGrid();}});
document.getElementById('dlg-save').addEventListener('click',()=>{
  let cropId=/** @type {HTMLSelectElement} */ (document.getElementById('dlg-crop')).value;
  const date=/** @type {HTMLInputElement} */ (document.getElementById('dlg-date-input')).value;
  const targets=[...regLinkChecked];
  if(!cropId){
    if(!targets.length)return;
    cropId=(segData.segs[targets[0]]||{}).crop;
    if(!cropId)return;
  }
  document.getElementById('dlg-register').style.display='none';
  const sid=`s_${dragState.pendingRow}_${dragState.pendingStart}_${Date.now()}`;
  for(let c=dragState.pendingStart;c<=dragState.pendingEnd;c++){const k=K(dragState.pendingRow,c);if(!gridState.cells[k]||!gridState.cells[k].crop)gridState.cells[k]={segId:sid,crop:cropId,plantDate:date};}
  dragState.pendingRow=-1;dragState.pendingStart=-1;dragState.pendingEnd=-1;buildSegs();
  if(targets.length){linkSegs(targets[0],[sid,...targets.slice(1)]);}
  window.renderGrid();saveLS();
});
