// @ts-check
// ===== アーカイブ画面 =====
import { segData, masterData, gridState } from './state.js';
import { isoShort, isoFull, daysBetween } from './date-utils.js';
import { vegIconHtml } from './helpers.js';
import { famStyle, getMergedLogsByDate } from './segments.js';

let archiveSortKey='completedDate',archiveSortDir='desc',archiveDetailSeg=null,currentSnapshotIdx=0;

export function openArchive(){archiveDetailSeg=null;currentSnapshotIdx=0;document.getElementById('screen-register').classList.remove('active');document.getElementById('screen-archive').classList.add('active');renderArchive();}
// インラインonclick="closeArchive()"から直接呼ばれるため、bootstrap時点でwindow登録済み
export function closeArchive(){document.getElementById('screen-archive').classList.remove('active');document.getElementById('screen-register').classList.add('active');}


export function getSnapshots(){
  // completedDate でグループ化し、最後のエントリのスナップショットを採用
  const byDate={};
  Object.values(segData.archived).forEach(a=>{
    if(a.gridSnapshot&&a.gridSnapshot.length){
      if(!byDate[a.completedDate]||a.completedDate>=byDate[a.completedDate].completedDate){
        byDate[a.completedDate]=a;
      }
    }
  });
  return Object.values(byDate).sort((a,b)=>b.completedDate.localeCompare(a.completedDate));
}

function renderSnapshotViewer(el){
  const snaps=getSnapshots();
  const wrap=document.createElement('div');
  wrap.style.cssText='background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary);padding:12px 14px';
  const secTitle1=document.createElement('div');secTitle1.style.cssText='font-size:var(--fs-xs);font-weight:600;color:var(--color-text-secondary);letter-spacing:0.04em;margin-bottom:10px;display:flex;align-items:center;gap:5px';secTitle1.innerHTML='<i class="ti ti-layout-grid" style="font-size:var(--fs-xs)"></i>畑レイアウト履歴';wrap.appendChild(secTitle1);

  if(!snaps.length){
    const note=document.createElement('div');
    note.style.cssText='font-size:var(--fs-xs);color:var(--color-text-tertiary);text-align:center;padding:8px 0';
    note.textContent='スナップショットはまだありません（作物完了時に自動記録されます）';
    wrap.appendChild(note);el.appendChild(wrap);return;
  }

  if(currentSnapshotIdx>=snaps.length)currentSnapshotIdx=snaps.length-1;
  if(currentSnapshotIdx<0)currentSnapshotIdx=0;
  const snap=snaps[currentSnapshotIdx];
  const gCols=snap.gridCOLS||8;const gRows=snap.gridROWS||6;
  const cellMap={};
  (snap.gridSnapshot||[]).forEach(s=>{const leftCol=Math.min(...s.cols);s.cols.forEach(c=>{
    cellMap[s.row+','+c]={cropName:s.cropName,family:s.family,isSelf:s.isSelf,cropId:s.cropId,isLeft:c===leftCol};
  });});

  // ミニグリッド
  const gridWrap=document.createElement('div');gridWrap.style.cssText='margin-bottom:8px';
  const grid=document.createElement('div');
  grid.style.cssText=`display:grid;grid-template-columns:repeat(${gCols},1fr);gap:2px`;
  for(let r=0;r<gRows;r++){
    for(let col=0;col<gCols;col++){
      const cell=document.createElement('div');
      cell.style.cssText='height:24px;border-radius:2px;overflow:hidden;position:relative;';
      const info=cellMap[r+','+col];
      if(info){
        const fs=famStyle(info.family);
        cell.style.background=fs?fs.bg:'#e5e5e3';
        cell.style.border=`${info.isSelf?'2':'1'}px solid ${fs?fs.border:'#ccc'}`;
        cell.title=info.cropName;
        if(info.isLeft){const lbl=document.createElement('span');lbl.textContent=info.cropName;lbl.style.cssText='position:absolute;inset:0;font-size:8px;line-height:24px;padding-left:2px;white-space:nowrap;overflow:hidden;color:rgba(0,0,0,0.55);pointer-events:none';cell.appendChild(lbl);}
      }else{
        cell.style.background='var(--color-background-secondary)';
        cell.style.border='1px solid var(--color-border-tertiary)';
      }
      grid.appendChild(cell);
    }
  }
  gridWrap.appendChild(grid);

  // 凡例
  const families=[...new Set((snap.gridSnapshot||[]).map(s=>s.family).filter(Boolean))];
  if(families.length){
    const legend=document.createElement('div');legend.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin-top:6px';
    families.forEach(fam=>{
      const fs=famStyle(fam);if(!fs)return;
      const chip=document.createElement('div');chip.style.cssText='display:flex;align-items:center;gap:3px;font-size:var(--fs-xs);color:var(--color-text-secondary)';
      chip.innerHTML=`<div style="width:9px;height:9px;border-radius:2px;background:${fs.bg};border:1px solid ${fs.border}"></div>${fam}`;
      legend.appendChild(chip);
    });
    gridWrap.appendChild(legend);
  }
  wrap.appendChild(gridWrap);

  // ナビゲーションバー（← 日付▾ →）
  const nav=document.createElement('div');nav.style.cssText='display:flex;align-items:center;justify-content:center;gap:8px;margin-top:4px';
  const prevBtn=document.createElement('button');
  prevBtn.style.cssText='width:28px;height:28px;border-radius:50%;border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:var(--fs-base);color:var(--color-text-primary)';
  prevBtn.innerHTML='<i class="ti ti-chevron-left"></i>';
  prevBtn.disabled=currentSnapshotIdx>=snaps.length-1;
  prevBtn.style.opacity=prevBtn.disabled?'0.3':'1';
  prevBtn.addEventListener('click',()=>{currentSnapshotIdx++;renderArchive();});

  const nextBtn=document.createElement('button');
  nextBtn.style.cssText='width:28px;height:28px;border-radius:50%;border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:var(--fs-base);color:var(--color-text-primary)';
  nextBtn.innerHTML='<i class="ti ti-chevron-right"></i>';
  nextBtn.disabled=currentSnapshotIdx<=0;
  nextBtn.style.opacity=nextBtn.disabled?'0.3':'1';
  nextBtn.addEventListener('click',()=>{currentSnapshotIdx--;renderArchive();});

  const dateBtn=document.createElement('button');
  dateBtn.style.cssText='font-size:var(--fs-sm);font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);padding:4px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px';
  dateBtn.innerHTML=`${isoShort(snap.completedDate)}<i class="ti ti-calendar" style="font-size:var(--fs-xs);color:var(--color-text-tertiary)"></i>`;
  dateBtn.addEventListener('click',()=>openSnapshotCalendar(snaps));

  const counter=document.createElement('span');
  counter.style.cssText='font-size:var(--fs-xs);color:var(--color-text-tertiary);position:absolute;right:14px';
  counter.textContent=`${snaps.length-currentSnapshotIdx}/${snaps.length}`;

  nav.style.position='relative';
  nav.append(prevBtn,dateBtn,nextBtn,counter);
  wrap.appendChild(nav);
  el.appendChild(wrap);
}

export function openSnapshotCalendar(snaps){
  const availDates=new Set(snaps.map(s=>s.completedDate));
  let displayDate=snaps[currentSnapshotIdx].completedDate;
  let calYear=parseInt(displayDate.slice(0,4));let calMonth=parseInt(displayDate.slice(5,7))-1;

  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:300;display:flex;align-items:flex-end;justify-content:center';

  function renderCal(){
    overlay.innerHTML='';
    const panel=document.createElement('div');
    panel.style.cssText='background:var(--color-background-primary);border-radius:12px 12px 0 0;padding:16px;width:100%;max-width:420px;box-sizing:border-box';

    // ヘッダ
    const hdr=document.createElement('div');hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:12px';
    const mPrev=document.createElement('button');mPrev.innerHTML='<i class="ti ti-chevron-left"></i>';mPrev.style.cssText='background:none;border:none;cursor:pointer;font-size:var(--fs-md);color:var(--color-text-primary);padding:4px';
    mPrev.addEventListener('click',()=>{calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCal();});
    const mNext=document.createElement('button');mNext.innerHTML='<i class="ti ti-chevron-right"></i>';mNext.style.cssText='background:none;border:none;cursor:pointer;font-size:var(--fs-md);color:var(--color-text-primary);padding:4px';
    mNext.addEventListener('click',()=>{calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCal();});
    const mLabel=document.createElement('span');mLabel.style.cssText='font-size:var(--fs-base);font-weight:500';mLabel.textContent=`${calYear}年${calMonth+1}月`;
    const closeBtn=document.createElement('button');closeBtn.innerHTML='<i class="ti ti-x"></i>';closeBtn.style.cssText='background:none;border:none;cursor:pointer;font-size:var(--fs-md);color:var(--color-text-secondary);padding:4px';
    closeBtn.addEventListener('click',()=>overlay.remove());
    hdr.append(mPrev,mLabel,mNext,closeBtn);panel.appendChild(hdr);

    // 曜日ヘッダ
    const dayNames=['日','月','火','水','木','金','土'];
    const dayHdr=document.createElement('div');dayHdr.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px';
    dayNames.forEach((d,i)=>{const dh=document.createElement('div');dh.style.cssText=`text-align:center;font-size:var(--fs-xs);color:${i===0?'#D85A30':i===6?'#378ADD':'var(--color-text-tertiary)'}`;dh.textContent=d;dayHdr.appendChild(dh);});
    panel.appendChild(dayHdr);

    // カレンダーグリッド
    const calGrid=document.createElement('div');calGrid.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:3px';
    const firstDay=new Date(calYear,calMonth,1).getDay();
    const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
    for(let i=0;i<firstDay;i++){const blank=document.createElement('div');calGrid.appendChild(blank);}
    for(let d=1;d<=daysInMonth;d++){
      const dateStr=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const hasSnap=availDates.has(dateStr);
      const isSelected=snaps[currentSnapshotIdx].completedDate===dateStr;
      const cell=document.createElement('div');
      cell.style.cssText=`text-align:center;padding:6px 2px;border-radius:6px;font-size:var(--fs-base);cursor:${hasSnap?'pointer':'default'};color:${hasSnap?(isSelected?'#fff':'var(--color-text-primary)'):'var(--color-border-secondary)'};background:${isSelected?'#5aad4e':hasSnap?'var(--color-background-secondary)':'transparent'};font-weight:${hasSnap?'500':'400'}`;
      cell.textContent=d;
      if(hasSnap){
        if(!isSelected){
          const dot=document.createElement('div');dot.style.cssText='width:4px;height:4px;border-radius:50%;background:#5aad4e;margin:1px auto 0';cell.appendChild(dot);
        }
        cell.addEventListener('click',()=>{
          const idx=snaps.findIndex(s=>s.completedDate===dateStr);
          if(idx>=0){currentSnapshotIdx=idx;overlay.remove();renderArchive();}
        });
      }
      calGrid.appendChild(cell);
    }
    panel.appendChild(calGrid);
    overlay.appendChild(panel);
  }
  renderCal();
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
  document.body.appendChild(overlay);
}

export function renderArchive(){
  const el=document.getElementById('archive-content');el.innerHTML='';
  if(archiveDetailSeg){renderArchiveDetail(el,archiveDetailSeg);return;}
  renderSnapshotViewer(el);
  const entries=Object.values(segData.archived);
  if(!entries.length){const emp=document.createElement('div');emp.className='archive-empty';emp.innerHTML='<i class="ti ti-database" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.3"></i>過去データはまだありません';el.appendChild(emp);return;}

  // 栽培履歴 見出し
  const secTitle2=document.createElement('div');secTitle2.style.cssText='font-size:var(--fs-xs);font-weight:600;color:var(--color-text-secondary);letter-spacing:0.04em;margin:14px 0 8px;display:flex;align-items:center;gap:5px;padding:0 2px';secTitle2.innerHTML='<i class="ti ti-plant-2" style="font-size:var(--fs-xs)"></i>栽培履歴';el.appendChild(secTitle2);

  // ソートバー
  const sortBar=document.createElement('div');sortBar.className='archive-sort-bar';
  sortBar.innerHTML='<span class="archive-sort-label">並び替え：</span>';
  const sortDefs=[{key:'cropName',label:'作物名'},{key:'plantDate',label:'作業開始日'},{key:'completedDate',label:'完了日'}];
  sortDefs.forEach(def=>{
    const btn=document.createElement('button');btn.className='archive-sort-btn'+(archiveSortKey===def.key?' active':'');
    const arrow=archiveSortKey===def.key?(archiveSortDir==='asc'?' ↑':' ↓'):'';
    btn.textContent=def.label+arrow;
    btn.addEventListener('click',()=>{if(archiveSortKey===def.key){archiveSortDir=archiveSortDir==='asc'?'desc':'asc';}else{archiveSortKey=def.key;archiveSortDir='asc';}renderArchive();});
    sortBar.appendChild(btn);
  });
  el.appendChild(sortBar);

  // ソート実行
  const sorted=[...entries].sort((a,b)=>{
    const va=a[archiveSortKey]||'';const vb=b[archiveSortKey]||'';
    const cmp=va.localeCompare(vb,'ja');return archiveSortDir==='asc'?cmp:-cmp;
  });

  sorted.forEach(arch=>{
    const veg=masterData.vegMaster[arch.cropId];
    const card=document.createElement('div');card.className='archive-card';
    const hdr=document.createElement('div');hdr.className='archive-card-header';
    hdr.innerHTML=`<span style="display:inline-flex;align-items:center;font-size:20px">${veg?vegIconHtml(veg,24):arch.cropName.slice(0,1)}</span><span class="archive-card-name">${arch.cropName}${arch.variety?' ('+arch.variety+')':''}</span><span class="archive-card-date">完了 ${isoShort(arch.completedDate)}</span>`;
    const meta=document.createElement('div');meta.className='archive-card-meta';
    const startVal=arch.plantDate?isoShort(arch.plantDate):'—';
    const harvestVal=arch.harvestTotal||'未記録';
    const isSeedArch=arch.growMethod==='seed_pot'||arch.growMethod==='seed_ground';
    const midLabel=isSeedArch?'種まき':'定植';
    const midVal=isSeedArch?(arch.sowingDate?isoShort(arch.sowingDate):'—'):(arch.plantingDate?isoShort(arch.plantingDate):'—');
    const areaLabel=`${arch.row+1}行 ${Math.min(...arch.cols)+1}〜${Math.max(...arch.cols)+1}列`;
    meta.innerHTML=`<span class="archive-card-stat"><i class="ti ti-calendar" style="font-size:var(--fs-xs)"></i>開始：${startVal}</span><span class="archive-card-stat"><i class="ti ti-plant-2" style="font-size:var(--fs-xs)"></i>${midLabel}：${midVal}</span><span class="archive-card-stat"><i class="ti ti-layout-grid" style="font-size:var(--fs-xs)"></i>${areaLabel}</span><span class="archive-card-stat"><i class="ti ti-basket" style="font-size:var(--fs-xs);color:#2e7a28"></i><span style="color:#2e7a28">${harvestVal}</span></span>`;
    card.append(hdr,meta);
    card.addEventListener('click',()=>{archiveDetailSeg=arch.segId;renderArchive();});
    el.appendChild(card);
  });
}

export function renderArchiveDetail(el,segId){
  const arch=segData.archived[segId];if(!arch)return;
  const veg=masterData.vegMaster[arch.cropId];

  // 戻るリンク
  const backBtn=document.createElement('div');backBtn.className='archive-detail-back';backBtn.innerHTML='<i class="ti ti-arrow-left" style="font-size:var(--fs-sm)"></i>リストへ戻る';backBtn.addEventListener('click',()=>{archiveDetailSeg=null;renderArchive();});el.appendChild(backBtn);

  // ヘッダー
  const hdr=document.createElement('div');hdr.className='manage-header';
  hdr.innerHTML=`<span style="display:inline-flex;align-items:center;font-size:22px">${veg?vegIconHtml(veg,28):''}</span><div style="flex:1"><div class="manage-title">${arch.cropName}${arch.variety?' ('+arch.variety+')':''}</div><div class="manage-meta">完了日：${isoShort(arch.completedDate)}${arch.plantDate?' ／ 開始：'+isoShort(arch.plantDate):''}</div></div>`;
  el.appendChild(hdr);

  // サマリー統計（読み取り専用）
  const taskLogs=segData.actionLogs[segId]||[];
  const allLogDates=taskLogs.map(l=>l.date).sort();
  const lastLogDate=arch.lastLogDate||allLogDates[allLogDates.length-1]||null;
  let workPeriodVal='—',workPeriodSub='';
  if(arch.plantDate&&lastLogDate){const days=daysBetween(arch.plantDate,lastLogDate);workPeriodVal=`${isoShort(arch.plantDate)} 〜 ${isoShort(lastLogDate)}`;workPeriodSub=`${days}日間`;}
  else if(arch.plantDate)workPeriodVal=`${isoShort(arch.plantDate)} 〜`;

  const summary=document.createElement('div');summary.className='summary-section';
  const stats=document.createElement('div');stats.className='summary-stats';
  const isSeedArch2=arch.growMethod==='seed_pot'||arch.growMethod==='seed_ground';
  let archSeedHtml='';
  if(!isSeedArch2){archSeedHtml=`<div class="summary-stat"><div class="summary-stat-label">種まき情報</div><div class="summary-stat-val" style="color:var(--color-text-tertiary)">なし（苗から）</div></div>`;}
  else{const sv2=arch.sowingDate?isoShort(arch.sowingDate):'—';const gv2=arch.germinationDate?isoShort(arch.germinationDate):'—';const gd2=(arch.sowingDate&&arch.germinationDate)?`発芽まで${daysBetween(arch.sowingDate,arch.germinationDate)}日`:'';archSeedHtml=`<div class="summary-stat"><div class="summary-stat-label">種まき情報</div><div class="summary-stat-val">種まき：${sv2}</div><div class="summary-stat-sub">発芽確認：${gv2}${gd2?' ／ '+gd2:''}</div></div>`;}
  const archTransplantHtml=`<div class="summary-stat"><div class="summary-stat-label">定植 ／ 収穫開始</div><div class="summary-stat-val">${arch.plantingDate?isoShort(arch.plantingDate):'—'}</div><div class="summary-stat-sub">収穫開始：${arch.harvestStartDate?isoShort(arch.harvestStartDate):'—'}</div></div>`;
  stats.innerHTML=`<div class="summary-stat"><div class="summary-stat-label">作業期間</div><div class="summary-stat-val">${workPeriodVal}</div>${workPeriodSub?`<div class="summary-stat-sub">${workPeriodSub}</div>`:''}</div>${archSeedHtml}${archTransplantHtml}<div class="summary-stat"><div class="summary-stat-label">合計収穫量</div><div class="summary-stat-val" style="color:#2e7a28">${arch.harvestTotal||'未記録'}</div></div><div class="summary-stat"><div class="summary-stat-label">完了日</div><div class="summary-stat-val">${isoShort(arch.completedDate)}</div></div>`;
  summary.appendChild(stats);

  // 栽培エリア ミニグリッド
  const miniGridWrap=document.createElement('div');
  miniGridWrap.style.cssText='margin-bottom:10px';
  const miniGridLabel=document.createElement('div');
  miniGridLabel.style.cssText='font-size:var(--fs-xs);color:var(--color-text-tertiary);margin-bottom:6px';
  miniGridLabel.textContent='栽培エリア（完了時のグリッド状態）';
  miniGridWrap.appendChild(miniGridLabel);
  const gs=arch.gridSnapshot||[];
  const gCols=arch.gridCOLS||gridState.cols;const gRows=arch.gridROWS||gridState.rows;
  const cellMap={};
  gs.forEach(s=>s.cols.forEach(c=>{cellMap[s.row+','+c]={cropName:s.cropName,family:s.family,isSelf:s.isSelf};}));
  const selfFs=famStyle(arch.family);
  const grid=document.createElement('div');
  grid.style.cssText=`display:grid;grid-template-columns:repeat(${gCols},1fr);gap:2px;max-width:320px`;
  for(let r=0;r<gRows;r++){
    for(let c=0;c<gCols;c++){
      const cell=document.createElement('div');
      cell.style.cssText='height:16px;border-radius:2px;';
      const info=cellMap[r+','+c];
      if(info){
        if(info.isSelf){
          cell.style.background=selfFs?selfFs.bg:'#B2DDD2';
          cell.style.border=`2px solid ${selfFs?selfFs.border:'#5aad4e'}`;
          cell.title=arch.cropName;
        } else {
          const ofs=famStyle(info.family);
          cell.style.background=ofs?ofs.bg:'#e5e5e3';
          cell.style.border=`1px solid ${ofs?ofs.border:'#ccc'}`;
          cell.title=info.cropName;
        }
      } else {
        cell.style.background='var(--color-background-secondary)';
        cell.style.border='1px solid var(--color-border-tertiary)';
      }
      grid.appendChild(cell);
    }
  }
  if(gs.length===0){
    const note=document.createElement('div');note.style.cssText='font-size:var(--fs-xs);color:var(--color-text-tertiary)';note.textContent='（スナップショットなし — 完了時に自動記録されます）';miniGridWrap.appendChild(note);
  } else {
    const areaLabel=document.createElement('div');
    areaLabel.style.cssText='font-size:var(--fs-xs);color:var(--color-text-secondary);margin-bottom:4px;font-weight:500';
    areaLabel.textContent=`${arch.row+1}行 ${Math.min(...arch.cols)+1}〜${Math.max(...arch.cols)+1}列`;
    miniGridWrap.appendChild(areaLabel);
    miniGridWrap.appendChild(grid);
    // 凡例
    const selfSegs=gs.filter(s=>!s.isSelf);const families=[...new Set(selfSegs.map(s=>s.family).filter(Boolean))];
    if(families.length){
      const legend=document.createElement('div');legend.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin-top:6px';
      [{family:arch.family,isSelf:true},...families.map(f=>({family:f,isSelf:false}))].forEach(({family,isSelf})=>{
        const fs2=famStyle(family);if(!fs2)return;
        const chip=document.createElement('div');chip.style.cssText='display:flex;align-items:center;gap:3px;font-size:var(--fs-xs);color:var(--color-text-secondary)';
        chip.innerHTML=`<div style="width:10px;height:10px;border-radius:2px;background:${fs2.bg};border:${isSelf?'2':'1'}px solid ${fs2.border}"></div>${family}${isSelf?' (本作)':''}`;
        legend.appendChild(chip);
      });
      miniGridWrap.appendChild(legend);
    }
  }
  summary.appendChild(miniGridWrap);

  // 全体メモ（読み取り専用）
  const memo=segData.summaryMemo[segId]||'';
  if(memo){const memoBox=document.createElement('div');memoBox.className='summary-memo-box';memoBox.innerHTML=`<div class="summary-memo-header"><i class="ti ti-notes" style="color:#9c9a93"></i>全体メモ</div><div class="summary-memo-body" style="font-size:var(--fs-sm);line-height:1.6;color:var(--color-text-primary);white-space:pre-wrap">${memo}</div>`;summary.appendChild(memoBox);}
  el.appendChild(summary);

  // 作業履歴
  const logTitle=document.createElement('div');logTitle.className='log-section-title';logTitle.innerHTML='<i class="ti ti-clock" style="font-size:var(--fs-base)"></i>作業履歴';el.appendChild(logTitle);
  const byDate=getMergedLogsByDate(segId);const sortedDates=Object.keys(byDate).sort((a,b)=>b.localeCompare(a));
  if(!sortedDates.length){const p=document.createElement('p');p.style.cssText='font-size:var(--fs-xs);color:#9c9a93;padding:4px 0';p.textContent='作業記録がありません。';el.appendChild(p);}
  else{sortedDates.forEach(date=>{const group=document.createElement('div');group.className='log-date-group';const ghdr=document.createElement('div');ghdr.className='log-date-header';ghdr.innerHTML=`<span class="log-date-label">${isoFull(date)}</span><div class="log-date-line"></div>`;group.appendChild(ghdr);byDate[date].forEach(item=>{const isHarvest=item._type==='harvest';const entry=document.createElement('div');entry.className='log-entry';const icon=document.createElement('div');icon.className=`log-entry-icon ${isHarvest?'harvest':'task'}`;icon.innerHTML=`<i class="ti ${isHarvest?'ti-basket':'ti-check'}" aria-hidden="true"></i>`;const title=document.createElement('div');title.className='log-entry-title';title.textContent=isHarvest?'収穫':item.task;entry.append(icon,title);if(isHarvest){const badge=document.createElement('div');badge.className='log-entry-badge';badge.textContent=`${item.amount} ${item.unit}`;entry.appendChild(badge);}group.appendChild(entry);});el.appendChild(group);});}
}
