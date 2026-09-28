// @ts-check
// ===== 地域別見通しスケジュール表示（TSK-65） =====
// 工程表タブに、実施記録ベースの工程表（phases）とは別枠で、農園設定の
// 栽培地域(farmMeta.region)に対応する1地域分の絶対的な時期の見通しを、
// 12ヶ月の年間カレンダー（横棒タイムライン）として表示する。
// カレンダーの描画部品（軸・目盛り・今日マーカー・トラック）はmaster-recipes.jsの
// 監修者向け3地域比較プレビューからも再利用するため、個別にexportしている。
import { farmMeta } from './state.js';
import { REGION_OPTIONS, SCHEDULE_EVENT_OPTIONS, formatScheduleEvent, scheduleEventVisibility, optionLabel, SCHEDULE_EVENT_COLORS, scheduleEventIconHtml, monthPartPct, todayMonthPct } from './helpers.js';

/** @returns {HTMLElement} 1〜12月のラベルを持つ軸行 */
export function createScheduleAxis(){
  const axis=document.createElement('div');axis.className='sched-cal-axis';
  for(let m=1;m<=12;m++){const s=document.createElement('span');s.textContent=m+'月';axis.appendChild(s);}
  return axis;
}

/** @returns {HTMLElement} イベントを配置する前の空のトラック（幅を測るため、populateScheduleTrackはDOM挿入後に呼ぶこと） */
export function createScheduleTrack(){
  const track=document.createElement('div');track.className='sched-cal-track';
  return track;
}

/** @param {HTMLElement} bodyEl 月の目盛り（縦の薄いヘアライン）を背景として追加する。bodyElはposition:relativeな祖先を想定 */
export function addScheduleGrid(bodyEl){
  for(let m=1;m<12;m++){
    const g=document.createElement('div');g.className='sched-cal-grid-line';g.style.left=(m/12*100)+'%';
    bodyEl.appendChild(g);
  }
}

/** @param {HTMLElement} bodyEl 実際の今日の日付の位置に、縦線と三角マーカーを追加する */
export function addScheduleToday(bodyEl){
  const pct=todayMonthPct();
  const line=document.createElement('div');line.className='sched-cal-today-line';line.style.left=pct+'%';bodyEl.appendChild(line);
  const tri=document.createElement('div');tri.className='sched-cal-today-tri';tri.style.left=pct+'%';bodyEl.appendChild(tri);
}

/** @param {HTMLElement} track @param {'soil_prep'|'sowing'|'planting'|'harvest'} kind @param {number} pct @param {string} [growMethod] */
function addPoint(track,kind,pct,growMethod){
  const el=document.createElement('div');el.className='sched-cal-point';
  el.style.left=pct+'%';el.style.background=SCHEDULE_EVENT_COLORS[kind];
  el.innerHTML=scheduleEventIconHtml(kind,growMethod);
  track.appendChild(el);
}

/** @param {HTMLElement} track @param {'soil_prep'|'sowing'|'planting'|'harvest'} kind @param {number} fromPct @param {number} toPct @param {string} [growMethod]
 * バッジ（アイコン付きの丸）をそのまま引き伸ばして角丸長方形のバーにする。期間が短い場合はバッジの最小サイズ（22px）を保ち、区間の中央に配置する */
function addPill(track,kind,fromPct,toPct,growMethod){
  const trackW=track.getBoundingClientRect().width;
  const fromPx=trackW*fromPct/100,toPx=trackW*toPct/100;
  const minSize=22;
  let leftPx,widthPx;
  if(toPx-fromPx<minSize){const midPx=(fromPx+toPx)/2;leftPx=midPx-minSize/2;widthPx=minSize;}
  else{leftPx=fromPx;widthPx=toPx-fromPx;}
  const el=document.createElement('div');el.className='sched-cal-pill';
  el.style.left=leftPx+'px';el.style.width=widthPx+'px';el.style.background=SCHEDULE_EVENT_COLORS[kind];
  el.innerHTML=scheduleEventIconHtml(kind,growMethod);
  track.appendChild(el);
}

/** @param {HTMLElement} track DOMに挿入済みのトラック要素（幅測定のため） @param {any} regionData veg.regionalSchedule[region]の1地域分 @param {string} [growMethod]
 * 育成方法に応じて種まき/定植を出し分け、土づくり・収穫とあわせてトラックにバッジを配置する */
export function populateScheduleTrack(track,regionData,growMethod){
  if(!regionData)return;
  const vis=scheduleEventVisibility(growMethod);
  const soilPct=monthPartPct(regionData.soil_prep&&regionData.soil_prep.before);
  if(soilPct!=null)addPoint(track,'soil_prep',soilPct,growMethod);
  if(vis.sowing&&regionData.sowing){
    const fromPct=monthPartPct(regionData.sowing.from),toPct=monthPartPct(regionData.sowing.to);
    if(fromPct!=null&&toPct!=null)addPill(track,'sowing',fromPct,toPct,growMethod);
  }
  if(vis.planting&&regionData.planting){
    const fromPct=monthPartPct(regionData.planting.from),toPct=monthPartPct(regionData.planting.to);
    if(fromPct!=null&&toPct!=null)addPill(track,'planting',fromPct,toPct,growMethod);
  }
  if(regionData.harvest){
    const fromPct=monthPartPct(regionData.harvest.from),toPct=monthPartPct(regionData.harvest.to);
    if(fromPct!=null&&toPct!=null)addPill(track,'harvest',fromPct,toPct,growMethod);
  }
}

/** @param {'soil_prep'|'sowing'|'planting'|'harvest'} kind @param {string} [growMethod] @returns {string} アイコンバッジ（色付きの丸+アイコン）のHTML。詳細リストや凡例で使う */
export function scheduleBadgeHtml(kind,growMethod){
  return '<span class="sched-cal-badge" style="background:'+SCHEDULE_EVENT_COLORS[kind]+'">'+scheduleEventIconHtml(kind,growMethod)+'</span>';
}

/** @param {HTMLElement} el @param {any} veg 地域・データいずれかが未設定の場合は何も描画しない */
export function renderRegionalScheduleSummary(el,veg){
  if(!veg||!veg.regionalSchedule||!farmMeta.region)return;
  const regionData=veg.regionalSchedule[farmMeta.region];
  if(!regionData)return;
  const growMethod=veg.growMethod||'seedling';
  const vis=scheduleEventVisibility(growMethod);
  const constraints=veg.regionalSchedule.constraints||[];

  const box=document.createElement('div');box.className='summary-memo-box';
  box.innerHTML=`<div class="summary-memo-header"><i class="ti ti-calendar-event" style="color:#9c9a93"></i>栽培カレンダー（${optionLabel(REGION_OPTIONS,farmMeta.region)}）</div>`;
  const body=document.createElement('div');body.className='summary-memo-body';
  box.appendChild(body);
  el.appendChild(box); // populateScheduleTrackが幅を測れるよう、トラックを組み立てる前にDOMへ接続しておく

  const calBody=document.createElement('div');calBody.className='sched-cal-body';
  calBody.appendChild(createScheduleAxis());
  const row=document.createElement('div');row.className='sched-cal-row';
  const track=createScheduleTrack();
  row.appendChild(track);
  calBody.appendChild(row);
  body.appendChild(calBody);
  populateScheduleTrack(track,regionData,growMethod);
  addScheduleGrid(calBody);
  addScheduleToday(calBody);

  const rows=SCHEDULE_EVENT_OPTIONS
    .filter(ev=>ev.v==='sowing'?vis.sowing:ev.v==='planting'?vis.planting:true)
    .filter(ev=>ev.v==='soil_prep'?!!(regionData.soil_prep&&regionData.soil_prep.before&&regionData.soil_prep.before.month):!!(regionData[ev.v]&&formatScheduleEvent(regionData[ev.v])));
  if(rows.length){
    const detail=document.createElement('div');detail.className='sched-cal-detail';
    rows.forEach(ev=>{
      const notes=constraints.filter(c=>c.applies_to===ev.v&&c.note);
      const detailRow=document.createElement('div');detailRow.className='sched-cal-detail-row';
      detailRow.innerHTML=scheduleBadgeHtml(/** @type {any} */(ev.v),growMethod)+
        '<span class="sched-cal-detail-label">'+ev.l+'</span>'+
        (notes.length?'<span class="sched-cal-detail-note">※'+notes.map(n=>n.note).join('／')+'</span>':'');
      detail.appendChild(detailRow);
    });
    body.appendChild(detail);
  }
}
