// @ts-check
// ===== 管理画面（工程表・ログ・収穫） =====
import { navState, permState, gridState, segData } from './state.js';
import { vegIconHtml, UNITS } from './helpers.js';
import { buildSegs, getVeg, calcMajorStatus, calcProgress, getTaskState, setTaskState, getMilestoneDate, addDays, getMergedLogsByDate, getHarvestSummary, harvestTotalStr } from './segments.js';
import { dispToISO, showTaskDateDialog, showMilestoneDialog, showConfirm } from './dialogs.js';
import { pushUndo, saveLS, getLastTab, setLastTab } from './storage.js';
import { isoShort, isoFull, daysBetween, todayISO } from './date-utils.js';
import { permCanEditFarm } from './add-veg.js';
import { openCompleteConfirm } from './complete.js';
import { renderGrid } from './grid.js';
import { renderBasicTab } from './basic-tab.js';

export function openManage(sid){navState.seg=sid;navState.tab=getLastTab(sid)||'roadmap';document.getElementById('screen-register').classList.remove('active');document.getElementById('screen-manage').classList.add('active');renderManage();}
export function goBack(){document.getElementById('screen-manage').classList.remove('active');document.getElementById('screen-register').classList.add('active');navState.seg=null;renderGrid();}

export function renderManage(){
  buildSegs();const seg=segData.segs[navState.seg];if(!seg)return;const veg=getVeg(seg.crop);const majorSt=calcMajorStatus(navState.seg,seg.crop);
  const st=document.getElementById('manage-static');
  const tb=document.getElementById('manage-tabs');
  const el=document.getElementById('manage-content');
  const existingIframe=el.querySelector('iframe');if(existingIframe)existingIframe.src='';
  st.innerHTML='';tb.innerHTML='';el.innerHTML='';
  const hdr=document.createElement('div');hdr.className='manage-header';
  const plantDisp=seg.plantDate?seg.plantDate.slice(5).replace('-','/'):null;
  hdr.innerHTML=`<span style="display:inline-flex;align-items:center;font-size:22px">${veg?vegIconHtml(veg,28):''}</span><div style="flex:1"><div class="manage-title">${veg?veg.name+(veg.variety?' ('+veg.variety+')':''):'不明'}</div><div class="manage-meta" style="display:flex;align-items:center;flex-wrap:wrap;gap:2px">${seg.row+1}行 ${Math.min(...seg.cols)+1}〜${Math.max(...seg.cols)+1}列 ${seg.cols.length}マス</div></div><div class="status-pill" style="background:${majorSt.bg};color:${majorSt.color}">${majorSt.name}</div>`;
  st.appendChild(hdr);
  const tabs=[{id:'basic',icon:'ti-plant',label:'基礎知識'},{id:'roadmap',icon:'ti-road',label:'工程表'},{id:'harvest',icon:'ti-basket',label:'収穫'},{id:'log',icon:'ti-clipboard-list',label:'作業ログ'}];
  const tabBar=document.createElement('div');tabBar.className='tab-bar';tabBar.style.margin='0 0 0';
  tabs.forEach(tab=>{const btn=document.createElement('div');btn.className='tab-btn'+(navState.tab===tab.id?' active':'');btn.innerHTML=`<i class="ti ${tab.icon}" style="font-size:var(--fs-sm)"></i>${tab.label}`;btn.addEventListener('click',()=>{navState.tab=tab.id;setLastTab(navState.seg,tab.id);renderManage();});tabBar.appendChild(btn);});
  tb.appendChild(tabBar);
  if(navState.tab==='roadmap')renderRoadmapTab(el,seg,veg);
  else if(navState.tab==='log')renderLogTab(el,seg);
  else if(navState.tab==='harvest')renderHarvestTab(el,seg);
  else if(navState.tab==='basic')renderBasicTab(el,veg);
  else{navState.tab='roadmap';renderRoadmapTab(el,seg,veg);}
}

export function renderRoadmapTab(el,seg,veg){
  if(!veg||!veg.phases||!veg.phases.length){const b=document.createElement('div');b.className='ai-banner';b.innerHTML='<div class="ai-banner-text">工程表がありません。栽培レシピで生成してください。</div>';el.appendChild(b);return;}
  const{pct,phaseIdx}=calcProgress(navState.seg,seg.crop);
  const wrap=document.createElement('div');wrap.className='progress-wrap';wrap.innerHTML=`<div class="progress-label"><div class="progress-title">${vegIconHtml(veg,18)} ${veg.name} 工程表</div><div class="progress-pct">${pct}%</div></div><div class="progress-bar-outer"><div class="progress-bar-inner" style="width:${pct}%"></div></div>`;el.appendChild(wrap);
  veg.phases.forEach((phase,pi)=>{
    const isCurrent=pi===phaseIdx,isDone=pi<phaseIdx;
    const block=document.createElement('div');block.className='phase-block';block.innerHTML=`<div class="phase-heading"><div class="phase-radio ${isDone?'done':isCurrent?'active':''}"></div><span class="phase-name" style="color:${isCurrent?'#1a1915':'#5f5e5a'}">${phase.name}</span>${phase.period?'<span class="phase-period">（'+phase.period+'）</span>':''}</div>`;
    phase.tasks.forEach(task=>{
      const state=getTaskState(navState.seg,task.id);const isPest=task.type==='pest';const card=document.createElement('div');card.className='task-card'+(isPest?' pest':'');
      const _gm=veg.growMethod||'seedling';const _isSeed=_gm==='seed_pot'||_gm==='seed_ground';
      const _allTasks=veg.phases?veg.phases.flatMap(p=>p.tasks):[];
      const _pivotMilestone=_isSeed?'sowing':'planting';
      const _pivotTask=_allTasks.find(t=>t.milestone===_pivotMilestone);
      const _pivotDay=_pivotTask?_pivotTask.day:0;
      const _pivotDate=_isSeed?getMilestoneDate(navState.seg,seg.crop,'sowing'):getMilestoneDate(navState.seg,seg.crop,'planting');
      const _baseDate=_pivotDate||seg.plantDate||null;
      const _relDay=task.day-_pivotDay;
      const _relLabel=_relDay===0?'0日':(_relDay>0?'+'+_relDay+'日':_relDay+'日');
      const scheduledDate=_baseDate?addDays(_baseDate,_relDay):null;
      const dayLabel=_relLabel+(scheduledDate?' ('+scheduledDate+')':'');
      const main=document.createElement('div');main.className='task-main';const cbWrap=document.createElement('div');cbWrap.className='task-cb-wrap';const cb=document.createElement('input');cb.type='checkbox';cb.className='task-cb';cb.checked=state.done;cbWrap.appendChild(cb);
      const clickable=document.createElement('div');clickable.className='task-clickable';const body=document.createElement('div');body.className='task-body';if(isPest){const lbl=document.createElement('div');lbl.className='task-pest-label';lbl.innerHTML='<i class="ti ti-bug" style="font-size:10px"></i>病害虫チェック';body.appendChild(lbl);}const nameEl=document.createElement('div');nameEl.className='task-name'+(state.done?' done-text':'');nameEl.textContent=task.name;const descEl=document.createElement('div');descEl.className='task-desc';descEl.textContent=task.desc;const datesWrap=document.createElement('div');datesWrap.className='task-dates';(state.doneDates||[]).forEach((d,di)=>{const chip=document.createElement('div');chip.className='task-date-chip';chip.style.cursor='pointer';chip.textContent=d;chip.addEventListener('click',e=>{e.stopPropagation();const menu=document.getElementById('task-chip-menu');menu.style.display='flex';document.getElementById('task-chip-menu-label').textContent=d;window._chipEdit=()=>{menu.style.display='none';showTaskDateDialog('日付を変更',task.name,(dateVal)=>{if(!dateVal)return;pushUndo();const dates=[...(state.doneDates||[])];const disp=dateVal.slice(5).replace('-','/');dates[di]=disp;setTaskState(navState.seg,task.id,{done:dates.length>0,skip:false,doneDates:dates});renderManage();renderGrid();});};window._chipDelete=()=>{menu.style.display='none';pushUndo();const dates=[...(state.doneDates||[])];dates.splice(di,1);setTaskState(navState.seg,task.id,{done:dates.length>0,skip:false,doneDates:dates});renderManage();renderGrid();};});datesWrap.appendChild(chip);});const addChip=document.createElement('div');addChip.className='task-date-chip';addChip.style.cursor='pointer';addChip.textContent='＋追加';addChip.addEventListener('click',e=>{e.stopPropagation();showTaskDateDialog('追加の実施日',task.name,(dateVal)=>{if(!dateVal)return;pushUndo();const disp=dateVal.slice(5).replace('-','/');const dates=[...(state.doneDates||[]),disp];setTaskState(navState.seg,task.id,{done:true,skip:false,doneDates:dates});renderManage();renderGrid();if(task.milestone==='firstHarvest')setLastTab(navState.seg,'harvest');if(task.milestone==='germination'||task.milestone==='firstHarvest')setTimeout(()=>showMilestoneDialog(task.milestone),300);});});datesWrap.appendChild(addChip);body.append(nameEl,descEl,datesWrap);const dayBadge=document.createElement('div');dayBadge.className='task-day-badge';dayBadge.textContent=dayLabel;if(_relDay===0)dayBadge.style.fontWeight='600';const expandIcon=document.createElement('div');expandIcon.className='task-expand-icon';expandIcon.innerHTML='<i class="ti ti-chevron-down"></i>';clickable.append(body,dayBadge,expandIcon);main.append(cbWrap,clickable);
      const detail=document.createElement('div');detail.className='task-detail';if(task.memo){const m=document.createElement('div');m.className='task-detail-memo';m.textContent=task.memo;detail.appendChild(m);}if(task.url){const a=document.createElement('a');a.className='task-detail-url';a.href=task.url;a.target='_blank';a.innerHTML='<i class="ti ti-brand-youtube" style="font-size:var(--fs-base)"></i>参考動画を見る';detail.appendChild(a);}card.append(main,detail);block.appendChild(card);
      clickable.addEventListener('click',()=>{const isOpen=detail.classList.contains('open');detail.classList.toggle('open',!isOpen);expandIcon.querySelector('i').className=`ti ${isOpen?'ti-chevron-down':'ti-chevron-up'}`;});
      cb.addEventListener('change',e=>{e.stopPropagation();if(cb.checked){showTaskDateDialog('実施日を選択',task.name,(dateVal)=>{if(!dateVal)return;pushUndo();const disp=dateVal.slice(5).replace('-','/');const dates=[...(state.doneDates||[]),disp];setTaskState(navState.seg,task.id,{done:true,skip:false,doneDates:dates});renderManage();renderGrid();if(task.milestone==='firstHarvest')setLastTab(navState.seg,'harvest');if(task.milestone==='germination'||task.milestone==='firstHarvest')setTimeout(()=>showMilestoneDialog(task.milestone),300);},()=>{cb.checked=false;});}else{pushUndo();const dates=[...(state.doneDates||[])];dates.pop();setTaskState(navState.seg,task.id,{done:dates.length>0,skip:false,doneDates:dates});renderManage();renderGrid();}});
    });
    el.appendChild(block);
  });
}

export function renderLogTab(el,seg){
  const notice=document.createElement('div');notice.className='complete-notice';notice.id='complete-notice';notice.innerHTML='<i class="ti ti-info-circle" style="font-size:var(--fs-base);flex-shrink:0;margin-top:1px"></i><span>管理を完了する場合は内容を確認して下部の「この野菜の管理を完了」を押下してください。</span>';el.appendChild(notice);
  const summary=document.createElement('div');summary.className='summary-section';
  // doneDates から全日付を収集して作業期間を計算
  const allTaskDates=[];const _seg2=segData.segs[navState.seg];if(_seg2){const _veg2=getVeg(_seg2.crop);if(_veg2&&_veg2.phases){_veg2.phases.forEach(ph=>{ph.tasks.forEach(t=>{(getTaskState(navState.seg,t.id).doneDates||[]).forEach(d=>{const iso=dispToISO(d);if(iso)allTaskDates.push(iso);});});});}}
  allTaskDates.sort();
  let workPeriodVal='—',workPeriodSub='';
  if(seg.plantDate){const today=new Date().toISOString().slice(0,10);const elapsed=daysBetween(seg.plantDate,today);workPeriodVal=`${isoShort(seg.plantDate)}〜 （${elapsed}日経過）`;}
  const veg=getVeg(seg.crop);const growMethod=veg?veg.growMethod||'seedling':'seedling';
  const isSeed=growMethod==='seed_pot'||growMethod==='seed_ground';
  const sowingDate=getMilestoneDate(navState.seg,seg.crop,'sowing');
  const germinationDate=getMilestoneDate(navState.seg,seg.crop,'germination');
  const plantingDate=getMilestoneDate(navState.seg,seg.crop,'planting');
  const harvestStartDate=getMilestoneDate(navState.seg,seg.crop,'harvest_start');
  let seedHtml='';
  if(!isSeed){seedHtml=`<div class="summary-stat"><div class="summary-stat-label">種まき情報</div><div class="summary-stat-val" style="color:var(--color-text-tertiary)">なし（苗から）</div></div>`;}
  else{
    const sv=sowingDate?isoShort(sowingDate):'—';
    const gv=germinationDate?isoShort(germinationDate):'—';
    const sowToGerm=(sowingDate&&germinationDate)?daysBetween(sowingDate,germinationDate):null;
    const germToPlant=(germinationDate&&plantingDate)?daysBetween(germinationDate,plantingDate):null;
    const germLine=sowToGerm!=null?`発芽：${gv} ／ ${sowToGerm}日後`:`発芽：${gv}`;
    const plantLine=germToPlant!=null?`定植：${plantingDate?isoShort(plantingDate):'—'} ／ 発芽から${germToPlant}日後`:'';
    seedHtml=`<div class="summary-stat"><div class="summary-stat-label">種まき情報</div><div class="summary-stat-val">種まき：${sv}</div><div class="summary-stat-sub">${germLine}${plantLine?'<br>'+plantLine:''}</div></div>`;
  }
  const daysToHarvest=(plantingDate&&harvestStartDate)?daysBetween(plantingDate,harvestStartDate):null;
  const transplantHtml=`<div class="summary-stat"><div class="summary-stat-label">定植 ／ 収穫開始</div><div class="summary-stat-val">${plantingDate?isoShort(plantingDate):'—'}</div><div class="summary-stat-sub">収穫開始：${harvestStartDate?isoShort(harvestStartDate):'—'}${daysToHarvest!=null?' ／ 定植から'+daysToHarvest+'日後':''}</div></div>`;
  const stats=document.createElement('div');stats.className='summary-stats';
  const periodStat=document.createElement('div');periodStat.className='summary-stat';
  const periodNotSet=!seg.plantDate&&workPeriodVal==='—';
  const periodStyle=permState.isAdmin?'cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;color:'+(periodNotSet?'#b4b2a9':'inherit'):'';
  const periodDispVal=periodNotSet&&permState.isAdmin?'未設定':workPeriodVal;
  periodStat.innerHTML='<div class="summary-stat-label">作業期間</div><div class="summary-stat-val" id="work-period-val" style="'+periodStyle+'">'+periodDispVal+'</div>'+(workPeriodSub?'<div class="summary-stat-sub">'+workPeriodSub+'</div>':'');
  if(permState.isAdmin){periodStat.querySelector('#work-period-val').addEventListener('click',()=>{if(seg.plantDate){const menu=document.getElementById('task-chip-menu');menu.style.display='flex';document.getElementById('task-chip-menu-label').textContent='作業開始日';window._chipEdit=()=>{menu.style.display='none';showTaskDateDialog('作業開始日を変更','作業開始日',(dateVal)=>{if(!dateVal)return;pushUndo();Object.keys(gridState.cells).forEach(k=>{if(gridState.cells[k]&&gridState.cells[k].segId===navState.seg)gridState.cells[k].plantDate=dateVal;});buildSegs();saveLS();renderManage();renderGrid();});};window._chipDelete=()=>{menu.style.display='none';pushUndo();Object.keys(gridState.cells).forEach(k=>{if(gridState.cells[k]&&gridState.cells[k].segId===navState.seg)gridState.cells[k].plantDate=null;});buildSegs();saveLS();renderManage();renderGrid();};}else{showTaskDateDialog('作業開始日を設定','作業開始日',(dateVal)=>{if(!dateVal)return;pushUndo();Object.keys(gridState.cells).forEach(k=>{if(gridState.cells[k]&&gridState.cells[k].segId===navState.seg)gridState.cells[k].plantDate=dateVal;});buildSegs();saveLS();renderManage();renderGrid();});}});}
  stats.innerHTML=`${seedHtml}${transplantHtml}<div class="summary-stat"><div class="summary-stat-label">合計収穫量</div><div class="summary-stat-val" style="color:#2e7a28">${harvestTotalStr(navState.seg)||'未記録'}</div></div>`;
  stats.insertBefore(periodStat,stats.firstChild);
  summary.appendChild(stats);
  const memoBox=document.createElement('div');memoBox.className='summary-memo-box';memoBox.innerHTML='<div class="summary-memo-header"><i class="ti ti-notes" style="color:#9c9a93"></i>全体メモ</div>';const memoBody=document.createElement('div');memoBody.className='summary-memo-body';const memoTa=document.createElement('textarea');memoTa.className='summary-memo-ta';memoTa.placeholder='この区画の栽培を振り返って...';memoTa.value=segData.summaryMemo[navState.seg]||'';const memoSave=document.createElement('button');memoSave.className='summary-save-btn';memoSave.innerHTML='<i class="ti ti-device-floppy" style="font-size:var(--fs-xs)"></i>保存';memoSave.addEventListener('click',()=>{segData.summaryMemo[navState.seg]=memoTa.value;saveLS();memoSave.textContent='保存しました';setTimeout(()=>{memoSave.innerHTML='<i class="ti ti-device-floppy" style="font-size:var(--fs-xs)"></i>保存';},1200);});memoBody.append(memoTa,memoSave);memoBox.appendChild(memoBody);summary.appendChild(memoBox);el.appendChild(summary);
  const logTitle=document.createElement('div');logTitle.className='log-section-title';logTitle.innerHTML='<i class="ti ti-clock" style="font-size:var(--fs-base)"></i>作業履歴';el.appendChild(logTitle);
  const byDate=getMergedLogsByDate(navState.seg);const sortedDates=Object.keys(byDate).sort((a,b)=>b.localeCompare(a));
  if(!sortedDates.length){const p=document.createElement('p');p.style.cssText='font-size:var(--fs-xs);color:#9c9a93;padding:4px 0';p.textContent='タスクを完了するか収穫を記録すると表示されます。';el.appendChild(p);}
  else{sortedDates.forEach(date=>{const group=document.createElement('div');group.className='log-date-group';const hdr=document.createElement('div');hdr.className='log-date-header';hdr.innerHTML=`<span class="log-date-label">${isoFull(date)}</span><div class="log-date-line"></div>`;group.appendChild(hdr);byDate[date].forEach(item=>{const isHarvest=item._type==='harvest';const entry=document.createElement('div');entry.className='log-entry';const icon=document.createElement('div');icon.className=`log-entry-icon ${isHarvest?'harvest':'task'}`;icon.innerHTML=`<i class="ti ${isHarvest?'ti-basket':'ti-check'}" aria-hidden="true"></i>`;const title=document.createElement('div');title.className='log-entry-title';title.textContent=isHarvest?'収穫':item.task;entry.append(icon,title);if(isHarvest){const badge=document.createElement('div');badge.className='log-entry-badge';badge.textContent=`${item.amount} ${item.unit}`;entry.appendChild(badge);}group.appendChild(entry);});el.appendChild(group);});}
  if(!permCanEditFarm())return;
  const completeBar=document.createElement('div');completeBar.style.cssText='margin-top:20px;padding-top:14px;border-top:0.5px solid var(--color-border-tertiary)';
  const completeBtn=document.createElement('button');completeBtn.className='btn-complete-final';completeBtn.innerHTML='<i class="ti ti-flag-check"></i>この野菜の管理を完了';
  completeBtn.addEventListener('click',()=>openCompleteConfirm(navState.seg));
  completeBar.appendChild(completeBtn);
  const delDivider=document.createElement('hr');delDivider.style.cssText='border:none;border-top:0.5px solid var(--color-border-tertiary);margin:16px 0';completeBar.appendChild(delDivider);
  const deleteBtn=document.createElement('button');deleteBtn.style.cssText='margin-top:0;width:100%;font-size:var(--fs-sm);padding:8px;border-radius:var(--border-radius-md);border:0.5px solid #e57373;background:#fff5f5;color:#c62828;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px';deleteBtn.innerHTML='<i class="ti ti-trash"></i>この区画の登録を削除';deleteBtn.addEventListener('click',()=>{showConfirm('この区画の登録を削除します。\n作業記録や収穫記録も失われます。\nよろしいですか？',()=>{pushUndo();const sid=navState.seg;Object.keys(gridState.cells).forEach(k=>{if(gridState.cells[k]&&gridState.cells[k].segId===sid)delete gridState.cells[k];});delete segData.tasks[sid];delete segData.actionLogs[sid];delete segData.harvestLogs[sid];delete segData.summaryMemo[sid];buildSegs();saveLS();goBack();renderGrid();});});
  completeBar.appendChild(deleteBtn);el.appendChild(completeBar);
}

export function renderHarvestTab(el,seg){
  const logs=segData.harvestLogs[navState.seg]||[];const inputRow=document.createElement('div');inputRow.className='harvest-input-row';
  const gDate=document.createElement('div');gDate.className='harvest-input-group';gDate.innerHTML='<label>収穫日</label>';const iDate=document.createElement('input');iDate.type='date';iDate.value=todayISO();gDate.appendChild(iDate);
  const gAmt=document.createElement('div');gAmt.className='harvest-input-group';gAmt.innerHTML='<label>量</label>';const iAmt=document.createElement('input');iAmt.type='number';iAmt.inputMode='decimal';iAmt.min='0';iAmt.step='0.1';gAmt.appendChild(iAmt);
  const gUnit=document.createElement('div');gUnit.className='harvest-input-group';gUnit.innerHTML='<label>単位</label>';const iUnit=document.createElement('select');UNITS.forEach(u=>{const op=document.createElement('option');op.value=u;op.textContent=u;iUnit.appendChild(op);});
  const cropId=seg.crop;const lastUnit=Object.entries(segData.harvestLogs).flatMap(([sid,ls])=>(segData.segs[sid]&&segData.segs[sid].crop===cropId)?ls:[]).sort((a,b)=>b.date.localeCompare(a.date))[0]?.unit;
  if(lastUnit)iUnit.value=lastUnit;
  gUnit.appendChild(iUnit);
  const addBtn=document.createElement('button');addBtn.className='harvest-add-btn';addBtn.textContent='追加';inputRow.append(gDate,gAmt,gUnit,addBtn);el.appendChild(inputRow);
  addBtn.addEventListener('click',()=>{const date=iDate.value,amount=parseFloat(iAmt.value),unit=iUnit.value;if(!date||isNaN(amount)||amount<=0)return;pushUndo();if(!segData.harvestLogs[navState.seg])segData.harvestLogs[navState.seg]=[];segData.harvestLogs[navState.seg].push({id:`h_${Date.now()}`,date,amount,unit});segData.harvestLogs[navState.seg].sort((a,b)=>a.date.localeCompare(b.date));saveLS();renderManage();});
  const listWrap=document.createElement('div');listWrap.className='harvest-list';
  if(!logs.length){const emp=document.createElement('div');emp.className='harvest-empty';emp.textContent='まだ収穫記録がありません。';listWrap.appendChild(emp);}
  else{[...logs].reverse().forEach(h=>{const row=document.createElement('div');row.className='harvest-row';const dateEl=document.createElement('div');dateEl.className='harvest-row-date';dateEl.textContent=h.date;const amtEl=document.createElement('div');amtEl.className='harvest-row-amount';amtEl.textContent=`${h.amount} ${h.unit}`;const delBtn=document.createElement('button');delBtn.className='harvest-del-btn';delBtn.innerHTML='<i class="ti ti-trash" style="font-size:var(--fs-sm)"></i>';if(!permCanEditFarm())delBtn.style.display='none';delBtn.addEventListener('click',()=>{showConfirm('この収穫記録を削除しますか？',()=>{pushUndo();segData.harvestLogs[navState.seg]=segData.harvestLogs[navState.seg].filter(x=>x.id!==h.id);saveLS();renderManage();});});row.append(dateEl,amtEl,delBtn);listWrap.appendChild(row);});}
  el.appendChild(listWrap);
  Object.entries(getHarvestSummary(navState.seg)).forEach(([unit,amt])=>{const totalEl=document.createElement('div');totalEl.className='harvest-total';totalEl.innerHTML=`<span class="harvest-total-label"><i class="ti ti-calculator" style="font-size:var(--fs-sm);margin-right:4px"></i>合計（${unit}）</span><span class="harvest-total-val">${amt} ${unit}</span>`;el.appendChild(totalEl);});
}
