// @ts-check
// ===== 地域別見通しスケジュール表示（TSK-65） =====
// 工程表タブに、実施記録ベースの工程表（phases）とは別枠で、農園設定の
// 栽培地域(farmMeta.region)に対応する1地域分の絶対的な時期の見通しを表示する。
import { farmMeta } from './state.js';
import { REGION_OPTIONS, SCHEDULE_EVENT_OPTIONS, formatScheduleEvent, scheduleEventVisibility, optionLabel } from './helpers.js';

/** @param {HTMLElement} el @param {any} veg 地域・データいずれかが未設定の場合は何も描画しない */
export function renderRegionalScheduleSummary(el,veg){
  if(!veg||!veg.regionalSchedule||!farmMeta.region)return;
  const regionData=veg.regionalSchedule[farmMeta.region];
  if(!regionData)return;
  const vis=scheduleEventVisibility(veg.growMethod||'seedling');
  const constraints=veg.regionalSchedule.constraints||[];
  const rows=SCHEDULE_EVENT_OPTIONS
    .filter(ev=>ev.v==='sowing'?vis.sowing:ev.v==='planting'?vis.planting:true)
    .map(ev=>({ev,text:formatScheduleEvent(regionData[ev.v]),notes:constraints.filter(c=>c.applies_to===ev.v&&c.note)}))
    .filter(r=>r.text);
  if(!rows.length)return;
  const box=document.createElement('div');box.className='summary-memo-box';
  box.innerHTML=`<div class="summary-memo-header"><i class="ti ti-map-pin" style="color:#9c9a93"></i>${optionLabel(REGION_OPTIONS,farmMeta.region)}の見通しスケジュール</div>`;
  const body=document.createElement('div');body.className='summary-memo-body';body.style.cssText='display:flex;flex-direction:column;gap:8px';
  rows.forEach(r=>{
    const row=document.createElement('div');
    row.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;font-size:var(--fs-sm)"><span style="color:var(--color-text-tertiary)">${r.ev.l}</span><span style="color:var(--color-text-primary);font-weight:500">${r.text}</span></div>`;
    r.notes.forEach(n=>{
      const note=document.createElement('div');note.style.cssText='font-size:var(--fs-xs);color:var(--color-text-tertiary);margin-top:2px';note.textContent=`※${n.note}`;
      row.appendChild(note);
    });
    body.appendChild(row);
  });
  box.appendChild(body);
  el.appendChild(box);
}
