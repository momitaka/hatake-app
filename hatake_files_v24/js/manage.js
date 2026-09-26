// @ts-check
// ===== 管理画面（工程表・ログ・収穫） =====
import { navState, permState, gridState, segData } from './state.js';
import { vegIconHtml, UNITS, SIZE_LABELS, PHASE_COLORS, stripPhaseSuffix } from './helpers.js';
import { buildSegs, getVeg, calcMajorStatus, calcProgress, getTaskState, setTaskState, getMilestoneDate, getPhaseTimeline, getMergedLogsByDate, getHarvestSummary, harvestTotalStr, getHarvestLogs, addHarvestLog, removeHarvestLog, getSummaryMemo, setSummaryMemo, getLinkedSids, linkSegs, unlinkOne, detachSegFromGroup, hasAnyRecord, recordKey, setHarvestLogPhoto, setHarvestLogMemo, getWeeklyYieldComparisonData } from './segments.js';
import { dispToISO, showTaskDateDialog, showMilestoneDialog, showConfirm, showAlert, showHarvestMemoDialog } from './dialogs.js';
import { saveLS, getLastTab, setLastTab } from './storage.js';
import { isoShort, isoFull, daysBetween, todayISO, addDaysISO, junLabel } from './date-utils.js';
import { permCanEditFarm } from './add-veg.js';
import { openCompleteConfirm } from './complete.js';
import { renderGrid } from './grid.js';
import { renderBasicTab } from './basic-tab.js';
import { uploadHarvestPhoto, uploadTaskPhoto, deleteHarvestPhoto, deleteHarvestPhotosForSeg, getHarvestPhotoUrl } from './photo-utils.js';

// 収穫ログ・工程実施ログ共通の写真表示用署名URLキャッシュ（1時間有効。再描画のたびに毎回サインさせないための簡易キャッシュ）
/** @type {Map<string,string>} */
const harvestPhotoUrlCache=new Map();

/** @param {string} dataUrl @param {(() => void)} [onDelete] タップで拡大表示するライトボックスを開く。onDelete省略時は削除ボタンを出さない読み取り専用表示（作業ログ／アーカイブでの表示用）。削除ボタンは誤タップ防止のためここにのみ置き、削除実行前に確認ダイアログを挟む */
export function openHarvestPhotoLightbox(dataUrl,onDelete){
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:300;background:rgba(0,0,0,0.8);padding:24px;box-sizing:border-box';
  const imgWrap=document.createElement('div');imgWrap.style.cssText='position:relative;max-width:100%;max-height:100%';
  const img=/** @type {HTMLImageElement} */(document.createElement('img'));
  img.src=dataUrl;
  img.style.cssText='display:block;max-width:100%;max-height:calc(100vh - 48px);border-radius:var(--border-radius-md);box-shadow:0 4px 20px rgba(0,0,0,0.4)';
  imgWrap.appendChild(img);
  if(onDelete){
    const delBtn=document.createElement('button');delBtn.type='button';delBtn.style.cssText='position:absolute;top:-14px;right:-14px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);color:var(--color-text-danger);cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.3)';delBtn.innerHTML='<i class="ti ti-trash"></i>';
    delBtn.addEventListener('click',e=>{e.stopPropagation();showConfirm('この写真を削除しますか？',()=>{overlay.remove();onDelete();});});
    imgWrap.appendChild(delBtn);
  }
  overlay.appendChild(imgWrap);
  overlay.addEventListener('click',()=>overlay.remove());
  imgWrap.addEventListener('click',e=>e.stopPropagation());
  document.body.appendChild(overlay);
}

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
  const tabs=[{id:'basic',icon:'ti-plant',label:'基礎知識'},{id:'roadmap',icon:'ti-road',label:'工程表'},{id:'harvest',icon:'ti-basket',label:'収穫'},{id:'log',icon:'ti-clipboard-list',label:'栽培記録'}];
  const tabBar=document.createElement('div');tabBar.className='tab-bar';tabBar.style.margin='0 0 0';
  tabs.forEach(tab=>{const btn=document.createElement('div');btn.className='tab-btn'+(navState.tab===tab.id?' active':'');btn.innerHTML=`<i class="ti ${tab.icon}" style="font-size:var(--fs-sm)"></i>${tab.label}`;btn.addEventListener('click',()=>{navState.tab=tab.id;setLastTab(navState.seg,tab.id);renderManage();});tabBar.appendChild(btn);});
  tb.appendChild(tabBar);
  if(navState.tab==='roadmap')renderRoadmapTab(el,seg,veg);
  else if(navState.tab==='log')renderLogTab(el,seg);
  else if(navState.tab==='harvest')renderHarvestTab(el,seg);
  else if(navState.tab==='basic')renderBasicTab(el,veg);
  else{navState.tab='roadmap';renderRoadmapTab(el,seg,veg);}
}

/** @param {HTMLElement} datesWrap @param {any} task @param {any} state タスクの実施日チップと「＋追加」チップを描画する */
function renderTaskDates(datesWrap,task,state){
  (state.doneDates||[]).forEach((d,di)=>{
    const chip=document.createElement('div');chip.className='task-date-chip';chip.style.cursor='pointer';
    const label=document.createElement('span');label.textContent=d.date;chip.appendChild(label);
    if(d.memo){const dot=document.createElement('span');dot.className='task-date-chip-memo-dot';chip.appendChild(dot);}
    chip.addEventListener('click',e=>{
      e.stopPropagation();
      const menu=document.getElementById('task-chip-menu');menu.style.display='flex';
      document.getElementById('task-chip-menu-label').textContent=d.date;
      window._chipEdit=()=>{menu.style.display='none';openTaskDateEditor(task,state,di);};
      window._chipDelete=()=>{
        menu.style.display='none';
        showConfirm('この実施日の記録を削除しますか？',()=>{
          
          const dates=[...(state.doneDates||[])];
          dates.splice(di,1);
          setTaskState(navState.seg,task.id,{done:dates.length>0,skip:false,doneDates:dates});
          renderManage();renderGrid();
        });
      };
    });
    datesWrap.appendChild(chip);
  });
  const addChip=document.createElement('div');addChip.className='task-date-chip';addChip.style.cursor='pointer';addChip.textContent='＋追加';
  addChip.addEventListener('click',e=>{
    e.stopPropagation();
    showTaskDateDialog('追加の実施日',task.name,(dateVal,memoVal)=>{
      if(!dateVal)return;
      const disp=dateVal.slice(5).replace('-','/');
      const dates=[...(state.doneDates||[]),{date:disp,memo:memoVal||''}];
      setTaskState(navState.seg,task.id,{done:true,skip:false,doneDates:dates});
      renderManage();renderGrid();
      if(task.milestone==='firstHarvest')setLastTab(navState.seg,'harvest');
      if(task.milestone==='germination'||task.milestone==='firstHarvest')setTimeout(()=>showMilestoneDialog(task.milestone),300);
    },undefined,{showMemo:true});
  });
  datesWrap.appendChild(addChip);
}

/** @param {any} task @param {any} state @param {number} di 指定した実施日エントリ（doneDates[di]）の日付・メモ編集ダイアログを開く */
function openTaskDateEditor(task,state,di){
  const entry=(state.doneDates||[])[di];if(!entry)return;
  showTaskDateDialog('日付を変更',task.name,(dateVal,memoVal)=>{
    if(!dateVal)return;
    const dates=[...(state.doneDates||[])];
    const disp=dateVal.slice(5).replace('-','/');
    dates[di]={date:disp,memo:memoVal||''};
    setTaskState(navState.seg,task.id,{done:dates.length>0,skip:false,doneDates:dates});
    renderManage();renderGrid();
  },undefined,{showMemo:true,memo:entry.memo||''});
}

/** @param {HTMLElement} wrap @param {any} task @param {any} state メモが記入されている実施日だけを「日付＋本文」で一覧表示する。行タップで編集ダイアログを開く */
function renderTaskMemoPreview(wrap,task,state){
  wrap.innerHTML='';
  (state.doneDates||[]).forEach((d,di)=>{
    if(!d.memo)return;
    const line=document.createElement('div');line.className='task-memo-line';
    const dateEl=document.createElement('div');dateEl.className='task-memo-line-date';dateEl.textContent=d.date;
    const textEl=document.createElement('div');textEl.className='task-memo-line-text';textEl.textContent=d.memo;
    line.append(dateEl,textEl);
    line.addEventListener('click',e=>{e.stopPropagation();openTaskDateEditor(task,state,di);});
    wrap.appendChild(line);
  });
}

/** @param {HTMLElement} photosWrap @param {any} task @param {any} state タスク単位の写真枠（最大2枚）を描画する */
function renderTaskPhotos(photosWrap,task,state){
  for(let pi=0;pi<2;pi++)photosWrap.appendChild(buildTaskPhotoBox(task,state,pi));
}

/** @param {any} task @param {any} state @param {number} pi 写真枠番号（0=1枚目, 1=2枚目） @returns {HTMLElement} */
function buildTaskPhotoBox(task,state,pi){
  const path=(state.photos||[])[pi];
  const box=document.createElement('div');box.className='task-photo-box';
  if(path){
    const img=/** @type {HTMLImageElement} */(document.createElement('img'));img.className='task-photo-box-img';box.appendChild(img);
    const cachedUrl=harvestPhotoUrlCache.get(path);
    if(cachedUrl)img.src=cachedUrl;
    else getHarvestPhotoUrl(path).then(url=>{if(url){harvestPhotoUrlCache.set(path,url);img.src=url;}});
    box.addEventListener('click',e=>{
      e.stopPropagation();
      openHarvestPhotoLightbox(harvestPhotoUrlCache.get(path)||img.src,()=>{
        harvestPhotoUrlCache.delete(path);
        const photos=(state.photos||[]).filter(/** @param {string} p */p=>p!==path);
        setTaskState(navState.seg,task.id,{photos});
        renderManage();
        deleteHarvestPhoto(path);
      });
    });
  }else{
    box.classList.add('empty');box.innerHTML='<i class="ti ti-camera-plus"></i>';
    const input=/** @type {HTMLInputElement} */(document.createElement('input'));input.type='file';input.accept='image/*';input.style.display='none';
    box.appendChild(input);
    box.addEventListener('click',e=>{e.stopPropagation();input.click();});
    input.addEventListener('click',e=>e.stopPropagation());
    input.addEventListener('change',()=>{
      const file=input.files&&input.files[0];if(!file)return;
      box.style.opacity='0.5';box.style.pointerEvents='none';
      uploadTaskPhoto(recordKey(navState.seg),task.id,/** @type {1|2} */(pi+1),file).then(path2=>{
        if(path2){
          
          const photos=[...(state.photos||[])];photos[pi]=path2;
          setTaskState(navState.seg,task.id,{photos});
          renderManage();
        }else{
          box.style.opacity='1';box.style.pointerEvents='auto';
          showAlert('写真のアップロードに失敗しました。通信環境を確認して再度お試しください。');
        }
      });
    });
  }
  return box;
}

/** @param {HTMLElement} el @param {any} data getPhaseTimeline()の結果 @param {number} phaseIdx 工程表タブ上部のフェーズ帯タイムライン（色分け・現在地マーカー・旬メモリ・凡例）を描画する */
function renderPhaseTimeline(el,data,phaseIdx){
  if(!data)return;
  const wrap=document.createElement('div');wrap.className='phase-timeline';
  const barWrap=document.createElement('div');barWrap.className='phase-timeline-barwrap';
  if(data.markerPct!=null){
    const marker=document.createElement('div');marker.className='phase-timeline-marker';marker.style.left=data.markerPct+'%';
    marker.innerHTML='<div class="phase-timeline-marker-label">今日</div><div class="phase-timeline-marker-flag"></div>';
    barWrap.appendChild(marker);
  }
  const bar=document.createElement('div');bar.className='phase-timeline-bar';
  data.segments.forEach(s=>{
    const segEl=document.createElement('div');segEl.className='phase-timeline-seg';segEl.style.flex=`${s.widthPct} 1 0%`;segEl.style.background=s.color;
    if(s.widthPct>=18)segEl.innerHTML=`<span class="phase-timeline-seg-label">${s.name}</span>`;
    bar.appendChild(segEl);
  });
  barWrap.appendChild(bar);wrap.appendChild(barWrap);
  if(data.ticks.length){
    const ticksEl=document.createElement('div');ticksEl.className='phase-timeline-ticks';
    data.ticks.forEach(t=>{
      const tick=document.createElement('div');tick.className='phase-timeline-tick';tick.style.left=t.pct+'%';
      tick.innerHTML=`<div class="phase-timeline-tick-mark"></div><div class="phase-timeline-tick-label">${t.label}</div>`;
      ticksEl.appendChild(tick);
    });
    wrap.appendChild(ticksEl);
  }
  const legend=document.createElement('div');legend.className='phase-timeline-legend';
  data.segments.forEach(s=>{
    const isCurrent=s.phaseIdx===phaseIdx;
    const item=document.createElement('div');item.className='phase-timeline-legend-item';
    item.innerHTML=`<span class="phase-timeline-legend-dot" style="background:${s.color}"></span><span class="phase-timeline-legend-label${isCurrent?' current':''}">${s.name}</span>`;
    legend.appendChild(item);
  });
  wrap.appendChild(legend);
  el.appendChild(wrap);
}

export function renderRoadmapTab(el,seg,veg){
  if(!veg||!veg.phases||!veg.phases.length){const b=document.createElement('div');b.className='ai-banner';b.innerHTML='<div class="ai-banner-text">工程表がありません。栽培レシピで生成してください。</div>';el.appendChild(b);return;}
  const{pct,phaseIdx}=calcProgress(navState.seg,seg.crop);
  const wrap=document.createElement('div');wrap.className='progress-wrap';wrap.innerHTML=`<div class="progress-label"><div class="progress-title">${vegIconHtml(veg,18)} ${veg.name} 工程表</div><div class="progress-pct">${pct}%</div></div>`;el.appendChild(wrap);
  const timeline=getPhaseTimeline(navState.seg,seg.crop);
  renderPhaseTimeline(el,timeline,phaseIdx);
  const _baseDate=timeline?timeline.baseDate:null;
  veg.phases.forEach((phase,pi)=>{
    const isCurrent=pi===phaseIdx,isDone=pi<phaseIdx;
    const block=document.createElement('div');block.className='phase-block';block.style.borderLeftColor=PHASE_COLORS[pi%PHASE_COLORS.length];
    block.innerHTML=`<div class="phase-heading"><div class="phase-radio ${isDone?'done':isCurrent?'active':''}"></div><span class="phase-name" style="color:${isCurrent?'#1a1915':'#5f5e5a'}">${stripPhaseSuffix(phase.name)}</span>${phase.period?'<span class="phase-period">（'+phase.period+'）</span>':''}</div>`;
    phase.tasks.forEach(task=>{
      const state=getTaskState(navState.seg,task.id);const isPest=task.type==='pest';const card=document.createElement('div');card.className='task-card'+(isPest?' pest':'');
      const _relDay=timeline&&timeline.taskRelDay[task.id]!=null?timeline.taskRelDay[task.id]:0;
      const _relLabel=_relDay===0?'0日':(_relDay>0?'+'+_relDay+'日':_relDay+'日');
      const _dueJun=_baseDate?junLabel(addDaysISO(_baseDate,_relDay)):null;
      const main=document.createElement('div');main.className='task-main';const cbWrap=document.createElement('div');cbWrap.className='task-cb-wrap';const cb=document.createElement('input');cb.type='checkbox';cb.className='task-cb';cb.checked=state.done;cbWrap.appendChild(cb);
      const clickable=document.createElement('div');clickable.className='task-clickable';const body=document.createElement('div');body.className='task-body';if(isPest){const lbl=document.createElement('div');lbl.className='task-pest-label';lbl.innerHTML='<i class="ti ti-bug" style="font-size:10px"></i>病害虫チェック';body.appendChild(lbl);}const nameEl=document.createElement('div');nameEl.className='task-name'+(state.done?' done-text':'');nameEl.textContent=task.name;const descEl=document.createElement('div');descEl.className='task-desc';descEl.textContent=task.desc;const textCol=document.createElement('div');textCol.className='task-header-text';textCol.append(nameEl,descEl);const dayBadge=document.createElement('div');dayBadge.className='task-day-badge';if(_dueJun)dayBadge.innerHTML=`〜${_dueJun}<span class="task-day-badge-sub">(${_relLabel})</span>`;else dayBadge.textContent=_relLabel;if(_relDay===0)dayBadge.style.fontWeight='600';const headerRow=document.createElement('div');headerRow.className='task-header-row';headerRow.append(textCol,dayBadge);const datesWrap=document.createElement('div');datesWrap.className='task-dates';renderTaskDates(datesWrap,task,state);const divider=document.createElement('div');divider.className='task-dates-divider';datesWrap.appendChild(divider);renderTaskPhotos(datesWrap,task,state);const memoPreviewWrap=document.createElement('div');memoPreviewWrap.className='task-memo-preview';renderTaskMemoPreview(memoPreviewWrap,task,state);body.append(headerRow,datesWrap,memoPreviewWrap);const expandIcon=document.createElement('div');expandIcon.className='task-expand-icon';expandIcon.innerHTML='<i class="ti ti-chevron-down"></i>';clickable.append(body,expandIcon);main.append(cbWrap,clickable);
      const detail=document.createElement('div');detail.className='task-detail';if(task.memo){const m=document.createElement('div');m.className='task-detail-memo';m.textContent=task.memo;detail.appendChild(m);}if(task.url){const a=document.createElement('a');a.className='task-detail-url';a.href=task.url;a.target='_blank';a.innerHTML='<i class="ti ti-brand-youtube" style="font-size:var(--fs-base)"></i>参考動画を見る';detail.appendChild(a);}card.append(main,detail);block.appendChild(card);
      clickable.addEventListener('click',()=>{const isOpen=detail.classList.contains('open');detail.classList.toggle('open',!isOpen);expandIcon.querySelector('i').className=`ti ${isOpen?'ti-chevron-down':'ti-chevron-up'}`;});
      cb.addEventListener('change',e=>{e.stopPropagation();if(cb.checked){showTaskDateDialog('実施日を選択',task.name,(dateVal,memoVal)=>{if(!dateVal)return;const disp=dateVal.slice(5).replace('-','/');const dates=[...(state.doneDates||[]),{date:disp,memo:memoVal||''}];setTaskState(navState.seg,task.id,{done:true,skip:false,doneDates:dates});renderManage();renderGrid();if(task.milestone==='firstHarvest')setLastTab(navState.seg,'harvest');if(task.milestone==='germination'||task.milestone==='firstHarvest')setTimeout(()=>showMilestoneDialog(task.milestone),300);},()=>{cb.checked=false;},{showMemo:true});}else{const dates=[...(state.doneDates||[])];dates.pop();setTaskState(navState.seg,task.id,{done:dates.length>0,skip:false,doneDates:dates});renderManage();renderGrid();}});
    });
    el.appendChild(block);
  });
}

export function renderLogTab(el,seg){
  const veg=getVeg(seg.crop);
  const heading=document.createElement('div');heading.className='progress-wrap';heading.innerHTML=`<div class="progress-label"><div class="progress-title">${veg?vegIconHtml(veg,18):''} ${veg?veg.name:'不明'} 栽培記録</div></div>`;el.appendChild(heading);
  const notice=document.createElement('div');notice.className='complete-notice';notice.id='complete-notice';notice.innerHTML='<i class="ti ti-info-circle" style="font-size:var(--fs-base);flex-shrink:0;margin-top:1px"></i><span>管理を完了する場合は内容を確認して下部の「この野菜の管理を完了」を押下してください。</span>';el.appendChild(notice);
  const yieldData=getWeeklyYieldComparisonData(navState.seg);
  if(yieldData){
    const yieldTitle=document.createElement('div');yieldTitle.className='yield-main-title';
    yieldTitle.innerHTML='<i class="ti ti-basket" style="font-size:var(--fs-base)"></i><span>収穫量の比較グラフ</span>';
    el.appendChild(yieldTitle);
    renderYieldLegend(el,yieldData.series); // 2つのグラフより先に置き、どちらにも共通の凡例であることを示す
    renderYieldSubheading(el,'週別','ti-chart-bar','暦の週（1〜7日/8〜14日…）を揃えて、今回と過去の同じ時期の収穫量を比較しています。比較対象はレシピの「比較グループ」設定（栽培レシピ画面）に基づきます');
    renderYieldCharts(el,yieldData);
    renderYieldSubheading(el,'累積','ti-chart-line','各系列の累計収穫量の推移だけを並べて、今回と過去のペース（進み具合）を比較できるグラフです。暦の週（1〜7日/8〜14日…）を揃えて、今回と過去の同じ時期を比較しています。比較対象はレシピの「比較グループ」設定（栽培レシピ画面）に基づきます');
    renderYieldCumulativeChart(el,yieldData);
  }
  const summary=document.createElement('div');summary.className='summary-section';
  // doneDates から全日付を収集して作業期間を計算
  const allTaskDates=[];const _seg2=segData.segs[navState.seg];if(_seg2){const _veg2=getVeg(_seg2.crop);if(_veg2&&_veg2.phases){_veg2.phases.forEach(ph=>{ph.tasks.forEach(t=>{(getTaskState(navState.seg,t.id).doneDates||[]).forEach(d=>{const iso=dispToISO(d.date);if(iso)allTaskDates.push(iso);});});});}}
  allTaskDates.sort();
  let workPeriodVal='—',workPeriodSub='';
  if(seg.plantDate){const today=new Date().toISOString().slice(0,10);const elapsed=daysBetween(seg.plantDate,today);workPeriodVal=`${isoShort(seg.plantDate)}〜 （${elapsed}日経過）`;}
  const growMethod=veg?veg.growMethod||'seedling':'seedling';
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
  if(permState.isAdmin){periodStat.querySelector('#work-period-val').addEventListener('click',()=>{if(seg.plantDate){const menu=document.getElementById('task-chip-menu');menu.style.display='flex';document.getElementById('task-chip-menu-label').textContent='作業開始日';window._chipEdit=()=>{menu.style.display='none';showTaskDateDialog('作業開始日を変更','作業開始日',(dateVal)=>{if(!dateVal)return;Object.keys(gridState.cells).forEach(k=>{if(gridState.cells[k]&&gridState.cells[k].segId===navState.seg)gridState.cells[k].plantDate=dateVal;});buildSegs();saveLS();renderManage();renderGrid();});};window._chipDelete=()=>{menu.style.display='none';showConfirm('作業開始日を削除しますか？\n工程表の日付計算に影響します。',()=>{Object.keys(gridState.cells).forEach(k=>{if(gridState.cells[k]&&gridState.cells[k].segId===navState.seg)gridState.cells[k].plantDate=null;});buildSegs();saveLS();renderManage();renderGrid();});};}else{showTaskDateDialog('作業開始日を設定','作業開始日',(dateVal)=>{if(!dateVal)return;Object.keys(gridState.cells).forEach(k=>{if(gridState.cells[k]&&gridState.cells[k].segId===navState.seg)gridState.cells[k].plantDate=dateVal;});buildSegs();saveLS();renderManage();renderGrid();});}});}
  stats.innerHTML=`${seedHtml}${transplantHtml}<div class="summary-stat"><div class="summary-stat-label">合計収穫量</div><div class="summary-stat-val" style="color:#2e7a28">${harvestTotalStr(navState.seg)||'未記録'}</div></div>`;
  stats.insertBefore(periodStat,stats.firstChild);
  stats.style.marginBottom='0'; // 箱の中の最後の要素になるため、共通クラスの下マージンはここでだけ打ち消す（archive.js側の素の使い方には影響しない）
  const statsBox=document.createElement('div');statsBox.className='summary-memo-box';
  statsBox.innerHTML='<div class="summary-memo-header"><i class="ti ti-chart-bar" style="color:#9c9a93"></i>統計</div>';
  const statsBody=document.createElement('div');statsBody.className='summary-memo-body';statsBody.appendChild(stats);
  statsBox.appendChild(statsBody);summary.appendChild(statsBox);
  const linkedOthers=getLinkedSids(navState.seg).filter(s=>s!==navState.seg&&segData.segs[s]);
  const linkBox=document.createElement('div');linkBox.className='summary-memo-box';
  linkBox.innerHTML='<div class="summary-memo-header"><i class="ti ti-link" style="color:#9c9a93"></i>連携中の栽培区画</div>';
  const linkBody=document.createElement('div');linkBody.className='summary-memo-body';
  const linkInfo=document.createElement('div');linkInfo.style.cssText='font-size:var(--fs-sm);line-height:1.8;color:'+(linkedOthers.length?'var(--color-text-secondary)':'var(--color-text-tertiary)');
  linkInfo.textContent=linkedOthers.length?linkedOthers.map(s=>{const ss=segData.segs[s];return `${ss.row+1}行 ${Math.min(...ss.cols)+1}〜${Math.max(...ss.cols)+1}列`;}).join('、'):'他の栽培区画とは連携していません。';
  linkBody.appendChild(linkInfo);
  if(permCanEditFarm()){
    const linkBtnRow=document.createElement('div');linkBtnRow.style.cssText='display:flex;gap:8px;margin-top:8px';
    const linkAddBtn=document.createElement('button');linkAddBtn.className='btn';linkAddBtn.style.cssText='font-size:var(--fs-xs);padding:6px 10px;flex:1';linkAddBtn.innerHTML='<i class="ti ti-link"></i> 他の栽培区画と連携する';
    linkAddBtn.addEventListener('click',()=>showLinkPicker(navState.seg));
    linkBtnRow.appendChild(linkAddBtn);
    if(linkedOthers.length){
      const linkRmBtn=document.createElement('button');linkRmBtn.style.cssText='font-size:var(--fs-xs);padding:6px 10px;flex:1;border-radius:var(--border-radius-md);border:0.5px solid #e57373;background:#fff5f5;color:#c62828;cursor:pointer';linkRmBtn.innerHTML='<i class="ti ti-unlink"></i> この栽培区画の連携を解除';
      linkRmBtn.addEventListener('click',()=>{showConfirm('この栽培区画をグループから外します。\nこれまでの記録はこの栽培区画にそのまま引き継がれます。\nよろしいですか？',()=>{unlinkOne(navState.seg);buildSegs();saveLS();renderManage();});});
      linkBtnRow.appendChild(linkRmBtn);
    }
    linkBody.appendChild(linkBtnRow);
  }
  linkBox.appendChild(linkBody);summary.appendChild(linkBox);
  const memoBox=document.createElement('div');memoBox.className='summary-memo-box';memoBox.innerHTML='<div class="summary-memo-header"><i class="ti ti-notes" style="color:#9c9a93"></i>全体メモ</div>';const memoBody=document.createElement('div');memoBody.className='summary-memo-body';const memoTa=document.createElement('textarea');memoTa.className='summary-memo-ta';memoTa.placeholder='ここでの栽培を振り返って...';memoTa.value=getSummaryMemo(navState.seg);const memoSave=document.createElement('button');memoSave.className='summary-save-btn';memoSave.innerHTML='<i class="ti ti-device-floppy" style="font-size:var(--fs-xs)"></i>保存';memoSave.addEventListener('click',()=>{setSummaryMemo(navState.seg,memoTa.value);memoSave.textContent='保存しました';setTimeout(()=>{memoSave.innerHTML='<i class="ti ti-device-floppy" style="font-size:var(--fs-xs)"></i>保存';},1200);});memoBody.append(memoTa,memoSave);memoBox.appendChild(memoBody);summary.appendChild(memoBox);
  const archiveCount=Object.values(segData.archived).filter(a=>a.cropId===seg.crop).length;
  if(archiveCount>0){
    const archBox=document.createElement('div');archBox.className='summary-memo-box';archBox.style.cursor='pointer';
    archBox.innerHTML=`<div class="summary-memo-header"><i class="ti ti-archive" style="color:#9c9a93"></i>過去の栽培記録<span style="margin-left:auto;color:var(--color-text-success);font-weight:600;display:flex;align-items:center;gap:2px">${archiveCount}件<i class="ti ti-chevron-right" style="font-size:var(--fs-xs)"></i></span></div>`;
    // manage.js→archive.jsは直接importすると循環になるため、既存のwindow.openArchiveブリッジ経由で呼ぶ（循環回避のための恒久設計）
    archBox.addEventListener('click',()=>window.openArchive(seg.crop));
    summary.appendChild(archBox);
  }
  el.appendChild(summary);
  const logTitle=document.createElement('div');logTitle.className='log-section-title';logTitle.innerHTML='<i class="ti ti-clock" style="font-size:var(--fs-base)"></i>作業履歴';el.appendChild(logTitle);
  const byDate=getMergedLogsByDate(navState.seg);const sortedDates=Object.keys(byDate).sort((a,b)=>b.localeCompare(a));
  if(!sortedDates.length){const p=document.createElement('p');p.style.cssText='font-size:var(--fs-xs);color:#9c9a93;padding:4px 0';p.textContent='タスクを完了するか収穫を記録すると表示されます。';el.appendChild(p);}
  else{sortedDates.forEach(date=>{const group=document.createElement('div');group.className='log-date-group';const hdr=document.createElement('div');hdr.className='log-date-header';hdr.innerHTML=`<span class="log-date-label">${isoFull(date)}</span><div class="log-date-line"></div>`;group.appendChild(hdr);byDate[date].forEach(item=>{const isHarvest=item._type==='harvest';const entry=document.createElement('div');entry.className='log-entry';const icon=document.createElement('div');icon.className=`log-entry-icon ${isHarvest?'harvest':'task'}`;icon.innerHTML=`<i class="ti ${isHarvest?'ti-basket':'ti-check'}" aria-hidden="true"></i>`;const title=document.createElement('div');title.className='log-entry-title';title.textContent=isHarvest?'収穫':item.task;entry.append(icon,title);if(isHarvest){const badge=document.createElement('div');badge.className='log-entry-badge';badge.textContent=`${item.amount} ${item.unit}`;entry.appendChild(badge);}if(item.memo){const memoEl=document.createElement('div');memoEl.className='log-entry-memo';memoEl.textContent=item.memo;entry.appendChild(memoEl);}if(item.photos&&item.photos.length){const photosWrap=document.createElement('div');photosWrap.className='log-entry-photos';item.photos.forEach(/** @param {string} path */path=>{const img=/** @type {HTMLImageElement} */(document.createElement('img'));img.className='log-entry-photo-img';const cachedUrl=harvestPhotoUrlCache.get(path);if(cachedUrl)img.src=cachedUrl;else getHarvestPhotoUrl(path).then(url=>{if(url){harvestPhotoUrlCache.set(path,url);img.src=url;}});img.addEventListener('click',()=>openHarvestPhotoLightbox(harvestPhotoUrlCache.get(path)||img.src));photosWrap.appendChild(img);});entry.appendChild(photosWrap);}group.appendChild(entry);});el.appendChild(group);});}
  if(!permCanEditFarm())return;
  const completeBar=document.createElement('div');completeBar.style.cssText='margin-top:20px;padding-top:14px;border-top:0.5px solid var(--color-border-tertiary)';
  const completeBtn=document.createElement('button');completeBtn.className='btn-complete-final';completeBtn.innerHTML='<i class="ti ti-flag-check"></i>この野菜の管理を完了';
  completeBtn.addEventListener('click',()=>openCompleteConfirm(navState.seg));
  completeBar.appendChild(completeBtn);
  const delDivider=document.createElement('hr');delDivider.style.cssText='border:none;border-top:0.5px solid var(--color-border-tertiary);margin:16px 0';completeBar.appendChild(delDivider);
  const deleteBtn=document.createElement('button');deleteBtn.style.cssText='margin-top:0;width:100%;font-size:var(--fs-sm);padding:8px;border-radius:var(--border-radius-md);border:0.5px solid #e57373;background:#fff5f5;color:#c62828;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px';deleteBtn.innerHTML='<i class="ti ti-trash"></i>この栽培区画の登録を削除';deleteBtn.addEventListener('click',()=>{showConfirm('この栽培区画の登録を削除します。\n作業記録や収穫記録も失われます。\nよろしいですか？',()=>{const sid=navState.seg;const photoSegKey=recordKey(sid);const wasLinked=getLinkedSids(sid).length>1;detachSegFromGroup(sid);Object.keys(gridState.cells).forEach(k=>{if(gridState.cells[k]&&gridState.cells[k].segId===sid)delete gridState.cells[k];});delete segData.tasks[sid];delete segData.actionLogs[sid];delete segData.harvestLogs[sid];delete segData.summaryMemo[sid];delete segData.linkGroups[sid];buildSegs();saveLS();goBack();renderGrid();if(!wasLinked)deleteHarvestPhotosForSeg(photoSegKey);});});
  completeBar.appendChild(deleteBtn);el.appendChild(completeBar);
}

/** @param {string} sid 連携先を選ぶ区画の候補ピッカーを開く */
function showLinkPicker(sid){
  buildSegs();
  const linked=new Set(getLinkedSids(sid));
  const candidates=Object.values(segData.segs).filter(s=>s.crop&&!linked.has(s.id));
  const list=document.getElementById('dlg-link-list');list.innerHTML='';
  const checked=new Set();
  if(!candidates.length){
    const p=document.createElement('div');p.style.cssText='font-size:var(--fs-sm);color:var(--color-text-tertiary)';p.textContent='連携できる他の栽培区画がありません。';list.appendChild(p);
  }else{
    candidates.forEach(s=>{
      const v=getVeg(s.crop);
      const row=document.createElement('label');row.style.cssText='display:flex;align-items:center;gap:8px;font-size:var(--fs-sm)';
      const cb=document.createElement('input');cb.type='checkbox';cb.addEventListener('change',()=>{if(cb.checked)checked.add(s.id);else checked.delete(s.id);});
      const label=document.createElement('span');label.innerHTML=`${v?vegIconHtml(v,16):''} ${v?v.name:'不明'}（${s.row+1}行 ${Math.min(...s.cols)+1}〜${Math.max(...s.cols)+1}列）`;
      row.append(cb,label);list.appendChild(row);
    });
  }
  const dlg=document.getElementById('dlg-link-picker');
  const confirmBtn=document.getElementById('btn-link-confirm');
  const cancelBtn=document.getElementById('btn-link-cancel');
  const close=()=>{dlg.style.display='none';confirmBtn.onclick=null;cancelBtn.onclick=null;};
  confirmBtn.onclick=()=>{
    if(!checked.size){close();return;}
    const targets=[...checked];
    const doMerge=()=>{linkSegs(sid,targets);buildSegs();saveLS();close();renderManage();};
    if(hasAnyRecord(sid)||targets.some(hasAnyRecord)){
      showConfirm('連携すると、工程表・収穫記録・全体メモがこの栽培区画とまとめて1つになります。\n\n・工程表は、進んでいる方の状態に統合されます\n・収穫量の合計は、両方の数字を足し算した値になります\n・一度連携すると、あとで元の別々の記録には戻せません\n\nよろしいですか？',doMerge,{align:'left',fontSize:'var(--fs-sm)'});
    }else{
      doMerge();
    }
  };
  cancelBtn.onclick=()=>close();
  dlg.style.display='flex';
}

/** @param {any} h 収穫記録1件のメモ編集ダイアログを開く（日付は記録済みのものをそのまま使う） */
function openHarvestMemoEditor(h){
  showHarvestMemoDialog(`${h.date}　${h.amount} ${h.unit}`,h.memo||'',(memoVal)=>{
    
    setHarvestLogMemo(navState.seg,h.id,memoVal||'');
    renderManage();
  });
}

const YIELD_PAST_COLORS=['#9c9a93','#c2c0b8','#dedcd3'];
// 棒の最大高さ（px）。折れ線・右軸のプロット領域もこの値と揃える（CSS .yield-week-chart の padding-top:4px が上端オフセットYIELD_PLOT_TOPに対応）
const YIELD_BAR_MAX_H=96;
const YIELD_PLOT_TOP=4;
/** @param {number} v @returns {number} 目盛りの上限をキリのいい数値（1/2/5×10^n）に切り上げる */
function niceCeil(v){
  if(v<=0)return 1;
  const mag=Math.pow(10,Math.floor(Math.log10(v)));
  const norm=v/mag;
  const niceNorm=norm<=1?1:norm<=2?2:norm<=5?5:10;
  return niceNorm*mag;
}
/** @param {number} v */
const fmtTick=v=>Number.isInteger(v)?String(v):String(Math.round(v*10)/10);
/** @param {HTMLElement} el @param {string} text @param {string} iconClass @param {string} infoText 週別比較・累積比較グラフの小見出し（アイコン＋テキスト＋説明ダイアログ用の？ボタン）を描画する共通ヘルパー */
function renderYieldSubheading(el,text,iconClass,infoText){
  const heading=document.createElement('div');heading.className='yield-section-title';
  heading.innerHTML=`<i class="ti ${iconClass}" style="font-size:var(--fs-sm)"></i><span>${text}</span><button type="button" class="yield-info-btn" aria-label="このグラフについて">？</button>`;
  const infoBtn=/** @type {HTMLButtonElement} */(heading.querySelector('.yield-info-btn'));
  infoBtn.addEventListener('click',()=>{showAlert(infoText,undefined,{align:'left'});});
  el.appendChild(heading);
}
/** @param {HTMLElement} el @param {any} data getWeeklyYieldComparisonData()の結果 収穫タブ末尾に「週別収穫（同じ野菜の過去比較）」のグループ棒グラフを描画する。
 * 定植日は揃えず暦月内の週（1〜7日=1週...）でそのまま比較するため、「去年の7月1週目」のような実際の季節感で今回と過去を見比べられる。
 * 累計比較は別グラフ（renderYieldCumulativeChart）に分離しているため、ここでは棒グラフのみを描画する。見出しは呼び出し側（renderYieldSubheading）が担当する */
function renderYieldCharts(el,data){
  const{unit,weeks,series,currentWeekKey}=data;
  if(!weeks.length)return;
  const outer=document.createElement('div');outer.className='yield-week-chart-outer';
  const chartRow=document.createElement('div');chartRow.className='yield-chart-row';
  const wrap=document.createElement('div');wrap.className='yield-week-chart';
  const maxAmt=Math.max(...series.flatMap(/** @param {any} s */s=>s.values),0.0001);
  const tickMax=niceCeil(maxAmt);
  weeks.forEach(/** @param {any} w @param {number} wi */(w,wi)=>{
    const col=document.createElement('div');col.className='yield-week-col'+(w.key===currentWeekKey?' current-week':'');
    const bars=document.createElement('div');bars.className='yield-week-bars';
    let pastIdx=0;
    series.forEach(/** @param {any} s */s=>{
      const val=s.values[wi];
      const color=s.current?'#2e7a28':YIELD_PAST_COLORS[Math.min(pastIdx,YIELD_PAST_COLORS.length-1)];
      if(!s.current)pastIdx++;
      if(!val)return;
      const bar=document.createElement('div');bar.className='yield-week-bar';
      bar.style.height=Math.max(4,Math.round(val/tickMax*YIELD_BAR_MAX_H))+'px';
      bar.style.background=color;
      bar.setAttribute('data-label',s.label);bar.setAttribute('data-val',String(val));bar.setAttribute('data-week',w.label);
      bars.appendChild(bar);
    });
    col.appendChild(bars);
    const lbl=document.createElement('div');lbl.className='yield-week-label';lbl.textContent=w.label;col.appendChild(lbl);
    wrap.appendChild(col);
  });
  chartRow.appendChild(wrap);
  const axis=document.createElement('div');axis.className='yield-cum-axis';chartRow.appendChild(axis);
  outer.appendChild(chartRow);
  el.appendChild(outer); // ここでDOMに接続。以降のグリッド線描画にはレイアウト確定後の実測幅が必要

  [tickMax,tickMax/2,0].forEach(v=>{const t=document.createElement('div');t.textContent=fmtTick(v)+unit;axis.appendChild(t);});
  const svgNS='http://www.w3.org/2000/svg';
  const svgW=wrap.scrollWidth;
  const gridSvg=document.createElementNS(svgNS,'svg');
  gridSvg.setAttribute('width',String(svgW));gridSvg.setAttribute('height','116');
  gridSvg.style.cssText='position:absolute;top:0;left:0;pointer-events:none;overflow:visible';
  const valToY=/** @param {number} v */v=>YIELD_PLOT_TOP+YIELD_BAR_MAX_H*(1-v/tickMax);
  [tickMax,tickMax/2,0].forEach(v=>{
    const gline=document.createElementNS(svgNS,'line');
    gline.setAttribute('x1','0');gline.setAttribute('x2',String(svgW));
    gline.setAttribute('y1',String(valToY(v)));gline.setAttribute('y2',String(valToY(v)));
    gline.setAttribute('stroke','var(--color-border-tertiary)');gline.setAttribute('stroke-width','1');gline.setAttribute('stroke-dasharray','2,3');
    gridSvg.appendChild(gline);
  });
  wrap.appendChild(gridSvg);

  const tooltip=document.createElement('div');tooltip.className='yield-tooltip';tooltip.style.display='none';
  outer.appendChild(tooltip);
  wrap.querySelectorAll('.yield-week-bar').forEach(bar=>{
    bar.addEventListener('click',e=>{
      e.stopPropagation();
      const label=bar.getAttribute('data-label');const val=bar.getAttribute('data-val');const week=bar.getAttribute('data-week');
      const valEl=document.createElement('span');valEl.className='yield-tooltip-val';valEl.textContent=`${val}${unit}`;
      tooltip.innerHTML='';tooltip.append(valEl,document.createTextNode(`　${label}・${week}`));
      tooltip.style.transform='translate(-50%,-100%)';tooltip.style.left='0px';tooltip.style.display='block';
      const outerRect=outer.getBoundingClientRect();const barRect=bar.getBoundingClientRect();
      const centerX=barRect.left-outerRect.left+barRect.width/2;
      const half=tooltip.offsetWidth/2;
      const clampedX=Math.min(Math.max(centerX,half+2),outerRect.width-half-2);
      tooltip.style.left=clampedX+'px';
      tooltip.style.top=(barRect.top-outerRect.top)+'px';
    });
  });
  outer.addEventListener('click',()=>{tooltip.style.display='none';});
}

const YIELD_CUM_COL_W=36; // 「12月5週」等、最大4〜5文字になる週ラベルがgap:0でも重ならない幅
/** @param {HTMLElement} el @param {any} data getWeeklyYieldComparisonData()の結果。週別比較グラフとは別に、各系列の累計収穫量の折れ線だけを並べてペース（進み具合）を比較する専用グラフを描画する。
 * 列は週数が少ない時は表示幅いっぱいに均等に伸び、最低幅を下回るほど週数が多い時だけ横スクロールになる（flex-growで自然に両立） */
function renderYieldCumulativeChart(el,data){
  const{unit,weeks,series,currentWeekKey}=data;
  if(!weeks.length)return;
  const outer=document.createElement('div');outer.className='yield-week-chart-outer';
  const chartRow=document.createElement('div');chartRow.className='yield-chart-row';
  const wrap=document.createElement('div');wrap.className='yield-week-chart';
  weeks.forEach(/** @param {any} w */w=>{
    const col=document.createElement('div');col.className='yield-week-col'+(w.key===currentWeekKey?' current-week':'');
    col.style.cssText=`flex:1 1 ${YIELD_CUM_COL_W}px;min-width:${YIELD_CUM_COL_W}px`;
    const lbl=document.createElement('div');lbl.className='yield-week-label';lbl.style.marginTop='auto';lbl.textContent=w.label;col.appendChild(lbl);
    wrap.appendChild(col);
  });
  chartRow.appendChild(wrap);
  const axis=document.createElement('div');axis.className='yield-cum-axis';chartRow.appendChild(axis);
  outer.appendChild(chartRow);
  el.appendChild(outer); // ここでDOMに接続。以降の列位置の実測にはレイアウト確定後の値が必要

  const cumSeries=series.map(/** @param {any} s */s=>{let running=0;return s.values.map(/** @param {number} v */v=>running+=v);});
  const maxCumRaw=Math.max(...cumSeries.map(c=>c[c.length-1]||0),0.0001);
  const tickMax=niceCeil(maxCumRaw);
  [tickMax,tickMax/2,0].forEach(v=>{const t=document.createElement('div');t.textContent=fmtTick(v)+unit;axis.appendChild(t);});
  const xs=[...wrap.querySelectorAll('.yield-week-col')].map(/** @param {Element} c */c=>/** @type {HTMLElement} */(c).offsetLeft+/** @type {HTMLElement} */(c).offsetWidth/2);
  const svgW=wrap.scrollWidth;
  const svgNS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(svgNS,'svg');
  svg.setAttribute('width',String(svgW));svg.setAttribute('height','116');
  svg.style.cssText='position:absolute;top:0;left:0;pointer-events:none;overflow:visible';
  const valToY=/** @param {number} v */v=>YIELD_PLOT_TOP+YIELD_BAR_MAX_H*(1-v/tickMax);
  [tickMax,tickMax/2,0].forEach(v=>{
    const gline=document.createElementNS(svgNS,'line');
    gline.setAttribute('x1','0');gline.setAttribute('x2',String(svgW));
    gline.setAttribute('y1',String(valToY(v)));gline.setAttribute('y2',String(valToY(v)));
    gline.setAttribute('stroke','var(--color-border-tertiary)');gline.setAttribute('stroke-width','1');gline.setAttribute('stroke-dasharray','2,3');
    svg.appendChild(gline);
  });
  let pastIdx=0;
  series.forEach(/** @param {any} s @param {number} si */(s,si)=>{
    const color=s.current?'#2e7a28':YIELD_PAST_COLORS[Math.min(pastIdx,YIELD_PAST_COLORS.length-1)];
    if(!s.current)pastIdx++;
    const cum=cumSeries[si];
    const points=cum.map((c,i)=>`${xs[i]},${valToY(c)}`).join(' ');
    const poly=document.createElementNS(svgNS,'polyline');
    poly.setAttribute('points',points);poly.setAttribute('fill','none');
    poly.setAttribute('stroke',color);poly.setAttribute('stroke-width','1.75');
    poly.setAttribute('stroke-linecap','round');poly.setAttribute('stroke-linejoin','round');
    svg.appendChild(poly);
    cum.forEach((c,i)=>{
      const dot=document.createElementNS(svgNS,'circle');
      dot.setAttribute('cx',String(xs[i]));dot.setAttribute('cy',String(valToY(c)));dot.setAttribute('r','2.5');
      dot.setAttribute('fill',color);
      svg.appendChild(dot);
    });
  });
  wrap.appendChild(svg);
}

/** @param {HTMLElement} el @param {any[]} series 週別比較・累積比較の2グラフで共通の凡例（系列名と色）を1つだけ表示する */
function renderYieldLegend(el,series){
  const legend=document.createElement('div');legend.className='yield-legend';
  let pastIdx=0;
  series.forEach(/** @param {any} s */s=>{
    const color=s.current?'#2e7a28':YIELD_PAST_COLORS[Math.min(pastIdx,YIELD_PAST_COLORS.length-1)];
    if(!s.current)pastIdx++;
    const item=document.createElement('div');item.className='yield-legend-item'+(s.current?' current':'');
    const swatch=document.createElement('span');swatch.className='yield-legend-swatch yield-legend-swatch-block';swatch.style.background=color;
    const labelEl=document.createElement('span');labelEl.textContent=s.label;
    item.append(swatch,labelEl);
    legend.appendChild(item);
  });
  el.appendChild(legend);
}

export function renderHarvestTab(el,seg){
  const veg=getVeg(seg.crop);
  const heading=document.createElement('div');heading.className='progress-wrap';heading.innerHTML=`<div class="progress-label"><div class="progress-title">${veg?vegIconHtml(veg,18):''} ${veg?veg.name:'不明'} 収穫</div></div>`;el.appendChild(heading);
  const logs=getHarvestLogs(navState.seg);const inputRow=document.createElement('div');inputRow.className='harvest-input-row';
  const gDate=document.createElement('div');gDate.className='harvest-input-group';gDate.innerHTML='<label>収穫日</label>';const iDate=document.createElement('input');iDate.type='date';iDate.value=todayISO();gDate.appendChild(iDate);
  const gAmt=document.createElement('div');gAmt.className='harvest-input-group';gAmt.innerHTML='<label>量</label>';const iAmt=document.createElement('input');iAmt.type='number';iAmt.inputMode='decimal';iAmt.min='0';iAmt.step='0.1';gAmt.appendChild(iAmt);
  const gUnit=document.createElement('div');gUnit.className='harvest-input-group';gUnit.innerHTML='<label>単位</label>';const iUnit=document.createElement('select');UNITS.forEach(u=>{const op=document.createElement('option');op.value=u;op.textContent=u;iUnit.appendChild(op);});
  const cropId=seg.crop;const lastUnit=Object.entries(segData.harvestLogs).flatMap(([sid,ls])=>(segData.segs[sid]&&segData.segs[sid].crop===cropId)?ls:[]).sort((a,b)=>b.date.localeCompare(a.date))[0]?.unit;
  if(lastUnit)iUnit.value=lastUnit;
  gUnit.appendChild(iUnit);
  const addBtn=document.createElement('button');addBtn.className='harvest-add-btn';addBtn.textContent='追加';inputRow.append(gDate,gAmt,gUnit,addBtn);el.appendChild(inputRow);

  const sizeToggle=document.createElement('button');sizeToggle.type='button';sizeToggle.className='harvest-size-toggle';sizeToggle.textContent='サイズ別に記録する';el.appendChild(sizeToggle);
  const sizeRow=document.createElement('div');sizeRow.className='harvest-size-row';sizeRow.style.display='none';
  const sizeInputs=SIZE_LABELS.map(label=>{
    const g=document.createElement('div');g.className='harvest-input-group';g.innerHTML=`<label>${label}</label>`;
    const inp=document.createElement('input');inp.type='number';inp.inputMode='decimal';inp.min='0';inp.step='0.1';
    g.appendChild(inp);sizeRow.appendChild(g);return inp;
  });
  el.appendChild(sizeRow);
  let sizeMode=false;
  sizeToggle.addEventListener('click',()=>{
    sizeMode=!sizeMode;
    sizeRow.style.display=sizeMode?'flex':'none';
    gAmt.style.display=sizeMode?'none':'flex';
    sizeToggle.textContent=sizeMode?'サイズ別記録をやめる':'サイズ別に記録する';
  });

  addBtn.addEventListener('click',()=>{
    const date=iDate.value,unit=iUnit.value;if(!date)return;
    let amount,sizes;
    if(sizeMode){
      sizes=SIZE_LABELS.map((label,i)=>({label,amount:parseFloat(sizeInputs[i].value)})).filter(s=>!isNaN(s.amount)&&s.amount>0);
      if(!sizes.length)return;
      amount=sizes.reduce((sum,s)=>sum+s.amount,0);
    }else{
      amount=parseFloat(iAmt.value);if(isNaN(amount)||amount<=0)return;
    }
    
    const entry=sizes?{id:`h_${Date.now()}`,date,amount,unit,sizes}:{id:`h_${Date.now()}`,date,amount,unit};
    addHarvestLog(navState.seg,entry);
    renderManage();
  });

  const listWrap=document.createElement('div');listWrap.className='harvest-list';
  if(!logs.length){const emp=document.createElement('div');emp.className='harvest-empty';emp.textContent='まだ収穫記録がありません。';listWrap.appendChild(emp);}
  else{[...logs].reverse().forEach(h=>{const row=document.createElement('div');row.className='harvest-row';const topRow=document.createElement('div');topRow.className='harvest-row-top';
    const photoBox=document.createElement('div');photoBox.className='harvest-row-photo';
    if(h.photoPath){
      const photoPath=h.photoPath;
      const img=/** @type {HTMLImageElement} */(document.createElement('img'));img.className='harvest-row-photo-img';photoBox.appendChild(img);
      const cachedUrl=harvestPhotoUrlCache.get(photoPath);
      if(cachedUrl)img.src=cachedUrl;
      else getHarvestPhotoUrl(photoPath).then(url=>{if(url){harvestPhotoUrlCache.set(photoPath,url);img.src=url;}});
      photoBox.style.cursor='pointer';
      photoBox.addEventListener('click',()=>{
        openHarvestPhotoLightbox(harvestPhotoUrlCache.get(photoPath)||img.src,()=>{
          harvestPhotoUrlCache.delete(photoPath);setHarvestLogPhoto(navState.seg,h.id,null);renderManage();
          deleteHarvestPhoto(photoPath);
        });
      });
    }else{
      photoBox.classList.add('empty');photoBox.innerHTML='<i class="ti ti-camera-plus"></i>';
      const rowPhotoInput=/** @type {HTMLInputElement} */(document.createElement('input'));rowPhotoInput.type='file';rowPhotoInput.accept='image/*';rowPhotoInput.style.display='none';
      photoBox.appendChild(rowPhotoInput);
      photoBox.addEventListener('click',()=>rowPhotoInput.click());
      rowPhotoInput.addEventListener('change',()=>{
        const file=rowPhotoInput.files&&rowPhotoInput.files[0];if(!file)return;
        photoBox.style.opacity='0.5';photoBox.style.pointerEvents='none';
        uploadHarvestPhoto(recordKey(navState.seg),h.id,file).then(path=>{
          if(path){setHarvestLogPhoto(navState.seg,h.id,path);renderManage();}
          else{photoBox.style.opacity='1';photoBox.style.pointerEvents='auto';showAlert('写真のアップロードに失敗しました。通信環境を確認して再度お試しください。');}
        });
      });
    }
    const dateEl=document.createElement('div');dateEl.className='harvest-row-date';dateEl.textContent=h.date;
    const amtEl=document.createElement('div');amtEl.className='harvest-row-amount';amtEl.textContent=`${h.amount} ${h.unit}`;
    if(h.sizes&&h.sizes.length){const sizesEl=document.createElement('div');sizesEl.className='harvest-row-sizes';sizesEl.textContent=h.sizes.map(s=>`${s.label}${s.amount}`).join(' / ');amtEl.appendChild(sizesEl);}
    const memoBtn=document.createElement('button');memoBtn.className='harvest-memo-btn'+(h.memo?' has-memo':'');memoBtn.innerHTML='<i class="ti ti-note" style="font-size:var(--fs-sm)"></i>';memoBtn.setAttribute('aria-label','メモ');memoBtn.addEventListener('click',()=>openHarvestMemoEditor(h));
    const delBtn=document.createElement('button');delBtn.className='harvest-del-btn';delBtn.innerHTML='<i class="ti ti-trash" style="font-size:var(--fs-sm)"></i>';if(!permCanEditFarm())delBtn.style.display='none';delBtn.addEventListener('click',()=>{showConfirm('この収穫記録を削除しますか？',()=>{const removed=removeHarvestLog(navState.seg,h.id);renderManage();if(removed&&removed.photoPath){harvestPhotoUrlCache.delete(removed.photoPath);deleteHarvestPhoto(removed.photoPath);}});});topRow.append(photoBox,dateEl,amtEl,memoBtn,delBtn);row.appendChild(topRow);
    if(h.memo){const memoLine=document.createElement('div');memoLine.className='harvest-row-memo';memoLine.textContent=h.memo;memoLine.addEventListener('click',()=>openHarvestMemoEditor(h));row.appendChild(memoLine);}
    listWrap.appendChild(row);});}
  el.appendChild(listWrap);
  Object.entries(getHarvestSummary(navState.seg)).forEach(([unit,amt])=>{const totalEl=document.createElement('div');totalEl.className='harvest-total';totalEl.innerHTML=`<span class="harvest-total-label"><i class="ti ti-calculator" style="font-size:var(--fs-sm);margin-right:4px"></i>合計（${unit}）</span><span class="harvest-total-val">${amt} ${unit}</span>`;el.appendChild(totalEl);});
}
