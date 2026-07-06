// @ts-check
// ===== グリッド設定・畑名・凡例 =====
import { gridState, segData, masterData, farmMeta, navState, undoStack } from './state.js';
import { FAMILIES } from './helpers.js';
import { dispToISO } from './dialogs.js';
import { vegIconHtml } from './helpers.js';
import { buildSegs, getVeg, calcMajorStatus, calcProgress, getTaskState } from './segments.js';
import { showConfirm } from './dialogs.js';
import { saveLS, pushUndo, updUndoBtn, updateFarmNameDisplay } from './storage.js';
import { permCanEditFarm } from './add-veg.js';
import { renderGrid } from './grid.js';
import { openManage } from './manage.js';
import { renderMasterList, renderMasterDetail } from './master-recipes.js';

const GRID_BG_SRC='images/grid_bg_farmer.png';
export function applyGridBg(){
  const wrap=document.getElementById('grid-wrap');
  if(!wrap)return;
  const wr=wrap.getBoundingClientRect();
  const _img=new Image();
  _img.src=GRID_BG_SRC;
  const imgW=_img.naturalWidth||840,imgH=_img.naturalHeight||400;
  const zoom=1.2;
  const scale=wr.width/imgW*zoom;
  const dw=imgW*scale,dh=imgH*scale;
  const cx=(dw-wr.width)/2;
  const els=document.querySelectorAll('.cell-empty-bg');
  let maxBottom=0,rowBTop=Infinity;
  els.forEach(el=>{const r=el.getBoundingClientRect();maxBottom=Math.max(maxBottom,r.bottom-wr.top);if(parseInt(el.dataset.row)===1&&r.top-wr.top<rowBTop)rowBTop=r.top-wr.top;});
  const imgTop=Math.max(rowBTop,maxBottom-dh+40);
  els.forEach(el=>{
    const r=el.getBoundingClientRect();
    const ox=r.left-wr.left;
    const oy=r.top-wr.top;
    const bgY=-(oy-imgTop);
    if(bgY>=r.height||bgY+dh<=0){el.style.backgroundImage='none';el.style.opacity='';return;}
    el.style.backgroundImage=`url('${GRID_BG_SRC}')`;
    el.style.backgroundSize=`${dw}px ${dh}px`;
    el.style.backgroundPosition=`${-ox-cx}px ${bgY}px`;
    el.style.backgroundRepeat='no-repeat';
    el.style.opacity='0.22';
  });
}
export function renderSegList(){
  buildSegs();const list=document.getElementById('seg-list');list.innerHTML='';
  const arr=Object.values(segData.segs).filter(s=>s.crop).sort((a,b)=>a.row-b.row||(Math.min(...a.cols)-Math.min(...b.cols)));
  if(!arr.length){list.innerHTML='<p style="font-size:var(--fs-xs);color:#9c9a93;padding:6px 0">まだ登録された区画がありません</p>';return;}
  const countEl=document.getElementById('seg-count');if(countEl)countEl.textContent=arr.length+'件';
  arr.forEach(seg=>{const veg=getVeg(seg.crop);const majorSt=calcMajorStatus(seg.id,seg.crop);const{pct}=calcProgress(seg.id,seg.crop);
    // 直近の完了タスクを取得
    const allTasks=(veg&&veg.phases)?veg.phases.flatMap(p=>p.tasks):[];
    let nextTaskName='';
    {let lastDoneIdx=-1;for(let i=0;i<allTasks.length;i++){const st=getTaskState(seg.id,allTasks[i].id);if(st.done)lastDoneIdx=i;}
    for(let i=lastDoneIdx+1;i<allTasks.length;i++){const t=allTasks[i];const st=getTaskState(seg.id,t.id);if(!st.skip){nextTaskName=t.name;break;}}}
    let startDateDisp='';
    {if(seg.plantDate){startDateDisp=seg.plantDate.slice(5).replace('-','/')+'〜';}else{let earliest='';allTasks.forEach(t=>{(getTaskState(seg.id,t.id).doneDates||[]).forEach(d=>{const iso=dispToISO(d);if(iso&&(!earliest||iso<earliest))earliest=iso;});});if(earliest)startDateDisp=earliest.slice(5).replace('-','/')+'〜';}}
    const item=document.createElement('div');item.className='seg-item';item.style.cssText='flex-direction:column;align-items:stretch;gap:0';
    const harvestTotal=(segData.harvestLogs[seg.id]||[]).reduce((s,h)=>s+(parseFloat(h.amount)||0),0);
    const harvestUnit=(segData.harvestLogs[seg.id]||[]).find(h=>h.unit)?.unit||'';
    const harvestDisp=harvestTotal>0?`計 ${harvestTotal.toFixed(harvestTotal%1===0?0:1)}${harvestUnit}`:'';
    item.innerHTML=`<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px"><span style="font-size:17px;line-height:1;flex-shrink:0">${veg?(vegIconHtml(veg,18)):'🌱'}</span><span style="font-size:var(--fs-base);font-weight:600;color:#1a1915;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${veg?veg.name:'—'}</span><span class="status-pill" style="background:${majorSt.bg};color:${majorSt.color};font-size:9px;padding:2px 7px;border-radius:99px;font-weight:500">${majorSt.name}</span></div><div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><div style="flex:1;height:3px;background:#d4edb8;border-radius:2px"><div style="height:3px;border-radius:2px;background:${majorSt.color};width:${pct}%"></div></div><span style="font-size:var(--fs-xs);font-weight:600;color:${majorSt.color};min-width:26px;text-align:right">${pct}%</span></div><div style="display:flex;align-items:center;gap:4px"><i class="ti ti-arrow-right" style="font-size:9px;color:#b4b2a9"></i><span style="font-size:var(--fs-xs);color:#9c9a93;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${nextTaskName||'—'}</span><span style="font-size:var(--fs-xs);color:#5aad4e;flex-shrink:0;font-weight:500">${harvestDisp}</span></div>`;
    item.addEventListener('click',()=>openManage(seg.id));list.appendChild(item);});
}

export function renderLegend(){const el=document.getElementById('family-legend');el.innerHTML='';Object.entries(FAMILIES).forEach(([name,style])=>{const item=document.createElement('div');item.className='legend-item';item.innerHTML=`<div class="legend-dot" style="background:${style.bg};border-color:${style.border}"></div>${name}`;el.appendChild(item);});}

export function applyGrid(){const nc=Math.min(20,Math.max(2,parseInt(document.getElementById('s-cols').value)||8));const nr=Math.min(20,Math.max(2,parseInt(document.getElementById('s-rows').value)||6));gridState.cols=nc;gridState.rows=nr;const nc2={};for(const k in gridState.cells){const[ri,ci]=k.split(',').map(Number);if(ri<gridState.rows&&ci<gridState.cols)nc2[k]=gridState.cells[k];}gridState.cells=nc2;renderGrid();saveLS();}
function parseAisleInput(str,max){return str.split(',').map(s=>parseInt(s.trim())-1).filter(n=>!isNaN(n)&&n>=0&&n<max);}
export function applyAisles(){
  pushUndo();
  gridState.aisleRows=parseAisleInput(document.getElementById('s-aisle-rows').value,gridState.rows);
  gridState.aisleCols=parseAisleInput(document.getElementById('s-aisle-cols').value,gridState.cols);
  renderGrid();saveLS();
}
export function renderFarmIconPicker(){
  const picker=document.getElementById('farm-icon-picker');
  if(!picker)return;
  picker.innerHTML='';
  const vegs=Object.values(masterData.vegMaster).filter(v=>v&&v.id);
  vegs.forEach(veg=>{
    const selected=(farmMeta.icon===veg.id);
    const btn=document.createElement('button');
    btn.style.cssText=`width:44px;height:44px;border-radius:10px;border:2px solid ${selected?'#2e7a28':'transparent'};background:${selected?'#d4f0b8':'var(--color-background-secondary)'};cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;`;
    btn.innerHTML=vegIconHtml(veg,28);
    btn.onclick=()=>{farmMeta.icon=(farmMeta.icon===veg.id)?'':veg.id;saveLS();updateFarmNameDisplay();renderFarmIconPicker();};
    picker.appendChild(btn);
  });
}
export function syncAisleInputs(){
  document.getElementById('s-aisle-rows').value=gridState.aisleRows.map(r=>r+1).join(', ');
  document.getElementById('s-aisle-cols').value=gridState.aisleCols.map(c=>c+1).join(', ');
}
export function resetAll(){if(!permCanEditFarm())return;showConfirm('全データをリセットしますか？',()=>{gridState.cells={};segData.segs={};segData.tasks={};segData.actionLogs={};segData.harvestLogs={};segData.summaryMemo={};segData.archived={};undoStack.length=0;renderGrid();updUndoBtn();saveLS();});}

export function openMaster(){document.getElementById('screen-register').classList.remove('active');document.getElementById('screen-master').classList.add('active');renderMasterList();if(navState.masterVeg)renderMasterDetail();}
export function closeMaster(){document.getElementById('screen-master').classList.remove('active');document.getElementById('screen-register').classList.add('active');renderGrid();}
