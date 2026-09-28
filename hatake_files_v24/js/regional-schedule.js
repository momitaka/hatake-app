// @ts-check
// ===== 地域別見通しスケジュール表示（TSK-65） =====
// 工程表タブに、実施記録ベースの工程表（phases）とは別枠で、農園設定の
// 栽培地域(farmMeta.region)に対応する1地域分の絶対的な時期の見通しを、
// 今日の月を中心に前後6ヶ月ぶん回転させた12ヶ月カレンダー（横スクロール可能な
// 横棒タイムライン）として表示する。1ヶ月あたりの幅を固定pxにすることで、
// 月ラベルが詰まらないようにしつつ、画面幅を超える分は横スクロールで見る。
// カレンダーの描画部品（軸・目盛り・今日マーカー・トラック）はmaster-recipes.jsの
// 監修者向け3地域比較プレビューからも再利用するため、個別にexportしている。
import { farmMeta } from './state.js';
import { REGION_OPTIONS, SCHEDULE_EVENT_OPTIONS, formatScheduleEvent, scheduleEventVisibility, optionLabel, SCHEDULE_EVENT_COLORS, scheduleEventIconHtml, scheduleWindowStartMonth, monthPartWindowUnits, todayWindowUnits } from './helpers.js';

const MONTH_WIDTH_PX=52;

/** @param {boolean} [withLabelSpacer] trueなら地域名ラベル分の空白を左に確保する（複数地域を比較する画面で、軸とトラックの横位置を揃えるため。単一地域表示ではラベルが無いのでfalse/省略でよい） @returns {HTMLElement} 今日の月を中心に前後6ヶ月ぶん回転させた軸行 */
export function createScheduleAxis(withLabelSpacer){
  const row=document.createElement('div');row.className='sched-cal-row';
  if(withLabelSpacer){const spacer=document.createElement('div');spacer.className='sched-cal-label';row.appendChild(spacer);}
  const axis=document.createElement('div');axis.className='sched-cal-axis';axis.style.width=(MONTH_WIDTH_PX*12)+'px';
  const startMonth=scheduleWindowStartMonth();
  for(let i=0;i<12;i++){
    const m=((startMonth-1+i)%12)+1;
    const s=document.createElement('span');s.style.width=MONTH_WIDTH_PX+'px';s.textContent=m+'月';axis.appendChild(s);
  }
  row.appendChild(axis);
  return row;
}

/** @returns {HTMLElement} イベントを配置する前の空のトラック（幅は12ヶ月ぶんの固定px） */
export function createScheduleTrack(){
  const track=document.createElement('div');track.className='sched-cal-track';track.style.width=(MONTH_WIDTH_PX*12)+'px';
  return track;
}

/** @param {HTMLElement} el @param {HTMLElement} referenceTrack 位置合わせの基準にするトラック要素 @returns {number} elの左端からreferenceTrackの左端までのpx距離
 * 地域名ラベル分の左オフセットがある画面（複数地域比較）でも、目盛り・今日の線をトラックと同じ座標系に揃えるための計測 */
function measureTrackOffset(el,referenceTrack){
  return referenceTrack.getBoundingClientRect().left-el.getBoundingClientRect().left;
}

/** @param {HTMLElement} bodyEl 月の目盛り（縦の薄いヘアライン）を背景として追加する @param {HTMLElement} referenceTrack 位置合わせの基準トラック */
export function addScheduleGrid(bodyEl,referenceTrack){
  const offsetPx=measureTrackOffset(bodyEl,referenceTrack);
  for(let m=1;m<12;m++){
    const g=document.createElement('div');g.className='sched-cal-grid-line';g.style.left=(offsetPx+m*MONTH_WIDTH_PX)+'px';
    bodyEl.appendChild(g);
  }
}

/** @param {HTMLElement} bodyEl 実際の今日の日付の位置に、縦線と三角マーカーを追加する @param {HTMLElement} referenceTrack 位置合わせの基準トラック */
export function addScheduleToday(bodyEl,referenceTrack){
  const offsetPx=measureTrackOffset(bodyEl,referenceTrack);
  const px=offsetPx+todayWindowUnits()*MONTH_WIDTH_PX;
  const line=document.createElement('div');line.className='sched-cal-today-line';line.style.left=px+'px';bodyEl.appendChild(line);
  const tri=document.createElement('div');tri.className='sched-cal-today-tri';tri.style.left=px+'px';bodyEl.appendChild(tri);
}

/** @param {HTMLElement} scrollWrap overflow-x:autoなスクロールコンテナ @param {HTMLElement} referenceTrack 位置合わせの基準トラック
 * 初期表示時に「今日」がスクロール位置の中央に来るようscrollLeftを設定する */
export function scrollScheduleToToday(scrollWrap,referenceTrack){
  const offsetPx=measureTrackOffset(scrollWrap,referenceTrack)+scrollWrap.scrollLeft;
  const todayPx=offsetPx+todayWindowUnits()*MONTH_WIDTH_PX;
  scrollWrap.scrollLeft=Math.max(0,todayPx-scrollWrap.clientWidth/2);
}

/** @param {HTMLElement} track @param {'soil_prep'|'sowing'|'planting'|'harvest'} kind @param {number} units 窓内の0〜12位置 @param {string} [growMethod] */
function addPoint(track,kind,units,growMethod){
  const el=document.createElement('div');el.className='sched-cal-point';
  el.style.left=(units*MONTH_WIDTH_PX)+'px';el.style.background=SCHEDULE_EVENT_COLORS[kind];
  el.innerHTML=scheduleEventIconHtml(kind,growMethod);
  track.appendChild(el);
}

/** @param {HTMLElement} track @param {'soil_prep'|'sowing'|'planting'|'harvest'} kind @param {number} fromUnits @param {number} toUnits @param {string} [growMethod]
 * バッジ（アイコン付きの丸）をそのまま引き伸ばして角丸長方形のバーにする。期間が短い場合はバッジの最小サイズ（22px）を保ち、区間の中央に配置する */
function addPill(track,kind,fromUnits,toUnits,growMethod){
  const fromPx=fromUnits*MONTH_WIDTH_PX,toPx=toUnits*MONTH_WIDTH_PX;
  const minSize=22;
  let leftPx,widthPx;
  if(toPx-fromPx<minSize){const midPx=(fromPx+toPx)/2;leftPx=midPx-minSize/2;widthPx=minSize;}
  else{leftPx=fromPx;widthPx=toPx-fromPx;}
  const el=document.createElement('div');el.className='sched-cal-pill';
  el.style.left=leftPx+'px';el.style.width=widthPx+'px';el.style.background=SCHEDULE_EVENT_COLORS[kind];
  el.innerHTML=scheduleEventIconHtml(kind,growMethod);
  track.appendChild(el);
}

/** @param {HTMLElement} track @param {any} regionData veg.regionalSchedule[region]の1地域分 @param {string} [growMethod]
 * 育成方法に応じて種まき/定植を出し分け、土づくり・収穫とあわせてトラックにバッジを配置する */
export function populateScheduleTrack(track,regionData,growMethod){
  if(!regionData)return;
  const vis=scheduleEventVisibility(growMethod);
  const startMonth=scheduleWindowStartMonth();
  const soilUnits=monthPartWindowUnits(regionData.soil_prep&&regionData.soil_prep.before,startMonth);
  if(soilUnits!=null)addPoint(track,'soil_prep',soilUnits,growMethod);
  if(vis.sowing&&regionData.sowing){
    const fromUnits=monthPartWindowUnits(regionData.sowing.from,startMonth),toUnits=monthPartWindowUnits(regionData.sowing.to,startMonth);
    if(fromUnits!=null&&toUnits!=null)addPill(track,'sowing',fromUnits,toUnits,growMethod);
  }
  if(vis.planting&&regionData.planting){
    const fromUnits=monthPartWindowUnits(regionData.planting.from,startMonth),toUnits=monthPartWindowUnits(regionData.planting.to,startMonth);
    if(fromUnits!=null&&toUnits!=null)addPill(track,'planting',fromUnits,toUnits,growMethod);
  }
  if(regionData.harvest){
    const fromUnits=monthPartWindowUnits(regionData.harvest.from,startMonth),toUnits=monthPartWindowUnits(regionData.harvest.to,startMonth);
    if(fromUnits!=null&&toUnits!=null)addPill(track,'harvest',fromUnits,toUnits,growMethod);
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

  const box=document.createElement('div');box.className='summary-memo-box sched-cal-summary-box';
  box.innerHTML=`<div class="summary-memo-header"><i class="ti ti-calendar-event" style="color:#9c9a93"></i>栽培カレンダー（${optionLabel(REGION_OPTIONS,farmMeta.region)}）</div>`;
  const body=document.createElement('div');body.className='summary-memo-body';
  box.appendChild(body);
  el.appendChild(box); // populateScheduleTrackが幅を測れるよう、トラックを組み立てる前にDOMへ接続しておく

  const scrollWrap=document.createElement('div');scrollWrap.className='sched-cal-scroll';
  body.appendChild(scrollWrap);
  const calBody=document.createElement('div');calBody.className='sched-cal-body';
  calBody.appendChild(createScheduleAxis());
  const row=document.createElement('div');row.className='sched-cal-row';
  const track=createScheduleTrack();
  row.appendChild(track);
  calBody.appendChild(row);
  scrollWrap.appendChild(calBody);
  populateScheduleTrack(track,regionData,growMethod);
  addScheduleGrid(calBody,track);
  addScheduleToday(calBody,track);
  scrollScheduleToToday(scrollWrap,track);

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
