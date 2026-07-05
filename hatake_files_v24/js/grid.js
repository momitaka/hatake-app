// @ts-check
// ===== グリッド描画・ドラッグ操作 =====
import { gridState, masterData, segData, dragState } from './state.js';
import { K } from './date-utils.js';
import { dispToISO } from './dialogs.js';
import { vegIconHtml } from './helpers.js';
import { buildSegs, segIsRegistered, famStyle, vegFamily, calcMajorStatus, getVeg, getTaskState } from './segments.js';
import { updateFarmNameDisplay } from './storage.js';
import { permCanEditFarm } from './add-veg.js';
import { showRegDlg } from './registration-dialog.js';
import { openManage } from './manage.js';

const AISLE_W=10,AISLE_H=10;
export function calcCellSize(){const wrap=document.getElementById('grid-wrap');const W=wrap.offsetWidth||600;const normalCols=gridState.cols-gridState.aisleCols.length;const normalRows=gridState.rows-gridState.aisleRows.length;const usedW=12+3*(gridState.cols+1)+gridState.aisleCols.length*AISLE_W;const cellW=Math.floor((W-usedW)/Math.max(1,normalCols));const cellH=Math.max(36,Math.min(58,Math.floor(cellW*0.94)));return{cellW,cellH,normalCols,normalRows}}

export function populateCropSelect(){
  const sel=document.getElementById('dlg-crop');sel.innerHTML='<option value="">— 選択してください —</option>';
  Object.values(masterData.vegMaster).sort((a,b)=>a.name.localeCompare(b.name,'ja')).forEach(v=>{const op=document.createElement('option');op.value=v.id;op.textContent=v.name+(v.variety?' ('+v.variety+')':'');sel.appendChild(op);});
}

export function renderGrid(){
  buildSegs();const{cellW,cellH}=calcCellSize();const tbl=document.getElementById('grid-table');tbl.innerHTML='';
  // 列番号ヘッダ行
  const htr=document.createElement('tr');
  const corner=document.createElement('td');corner.className='col-num col-num-corner';corner.style.cssText=`width:10px;`;htr.appendChild(corner);
  for(let c=0;c<gridState.cols;c++){
    const isAisleC=gridState.aisleCols.includes(c);
    const ch=document.createElement('td');ch.className='col-num';
    ch.textContent=isAisleC?'':c+1;
    ch.style.cssText=`width:${isAisleC?AISLE_W:cellW}px;`;
    htr.appendChild(ch);
  }
  tbl.appendChild(htr);
  for(let r=0;r<gridState.rows;r++){
    const isAisleR=gridState.aisleRows.includes(r);
    const rowH=isAisleR?AISLE_H:cellH;
    const tr=document.createElement('tr');
    const rn=document.createElement('td');rn.className='row-num';
    rn.textContent=isAisleR?'':String.fromCharCode(65+r);
    rn.style.cssText=`width:10px;height:${rowH}px;vertical-align:middle`;
    tr.appendChild(rn);
    for(let c=0;c<gridState.cols;c++){
      const isAisleC=gridState.aisleCols.includes(c);
      // 通路セル
      if(isAisleR||isAisleC){
        const td=document.createElement('td');td.dataset.r=r;td.dataset.c=c;
        td.style.cssText=`width:${isAisleC?AISLE_W:cellW}px;height:${rowH}px;min-width:0;padding:0;box-sizing:border-box;`;
        const inner=document.createElement('div');
        inner.style.cssText=`width:100%;height:100%;background:#f0efe9;border-radius:3px;`;
        td.appendChild(inner);tr.appendChild(td);continue;
      }
      const k=K(r,c),cell=gridState.cells[k];const sid=cell?cell.segId:null,seg=sid?segData.segs[sid]:null;
      const registered=seg?segIsRegistered(sid):false;
      if(registered&&seg&&c>Math.min(...seg.cols))continue;
      // colspanはアイル列を跨がない範囲に制限
      let span=registered&&seg?seg.cols.length:1;
      if(span>1){const cols=seg.cols.slice().sort((a,b)=>a-b);span=0;for(const sc of cols){if(gridState.aisleCols.includes(sc))break;span++;}if(span===0)span=1;}
      const selecting=dragState.dragging&&r===dragState.row&&c>=Math.min(dragState.startCol,dragState.endCol)&&c<=Math.max(dragState.startCol,dragState.endCol);
      const fs=famStyle(vegFamily(seg?seg.crop:null));const majorSt=registered?calcMajorStatus(sid,seg.crop):null;
      const td=document.createElement('td');td.dataset.r=r;td.dataset.c=c;
      if(span>1)td.setAttribute('colspan',span);
      const isActive=selecting||(registered&&fs);
      td.style.cssText=`width:${cellW*span}px;height:${cellH}px;min-width:0;border:0.5px solid ${isActive?'#e8e6df':'#ede9e1'};padding:${isActive?'2':'0'}px;box-sizing:border-box`;
      const inner=document.createElement('div');inner.className='cell-inner';
      inner.style.height='100%';inner.style.boxSizing='border-box';inner.style.borderRadius='5px';
      if(selecting){
        inner.style.background='#E6F1FB';inner.style.border='2px solid #378ADD';
      } else if(registered&&fs){
        inner.style.background=fs.bg;inner.style.borderTop=`3px solid ${fs.border}`;inner.style.boxShadow='0 1px 4px rgba(0,0,0,0.08)';
      } else {
        inner.style.backgroundColor='transparent';inner.style.borderRadius='3px';inner.classList.add('cell-empty-bg');inner.dataset.row=r;
      }
      if(selecting)inner.style.backgroundImage='repeating-linear-gradient(45deg,transparent,transparent 5px,rgba(55,138,221,0.2) 5px,rgba(55,138,221,0.2) 7px)';
      else if(cell&&!registered)inner.style.backgroundImage='repeating-linear-gradient(45deg,transparent,transparent 5px,rgba(0,0,0,0.10) 5px,rgba(0,0,0,0.10) 7px)';
      if(registered&&seg){
        const veg=getVeg(seg.crop);
        const lbl=document.createElement('div');lbl.className='cell-label';
        lbl.innerHTML=veg?(vegIconHtml(veg,14)+'<span style="margin-left:2px">'+veg.name+'</span>'):'';
        inner.appendChild(lbl);
        if(majorSt){const stLbl=document.createElement('div');stLbl.style.cssText=`font-size:8px;font-weight:500;color:${majorSt.color};line-height:1.2`;stLbl.textContent=majorSt.name;inner.appendChild(stLbl);}
        {let dtDisp='';if(seg.plantDate){dtDisp=seg.plantDate.slice(5).replace('-','/')+'〜';}else{const veg2=getVeg(seg.crop);const allT=(veg2&&veg2.phases)?veg2.phases.flatMap(p=>p.tasks):[];let earliest='';allT.forEach(t=>{(getTaskState(seg.id,t.id).doneDates||[]).forEach(d=>{const iso=dispToISO(d);if(iso&&(!earliest||iso<earliest))earliest=iso;});});if(earliest)dtDisp=earliest.slice(5).replace('-','/')+'〜';}if(dtDisp){const dtLbl=document.createElement('div');dtLbl.style.cssText='font-size:7px;color:#9c9a93;line-height:1.2;margin-top:1px';dtLbl.textContent=dtDisp;inner.appendChild(dtLbl);}}
      }
      td.appendChild(inner);
      if(registered){td.style.cursor='pointer';td.addEventListener('click',()=>openManage(sid));}
      else{td.style.cursor='crosshair';td.addEventListener('mousedown',e=>{if(e.button!==0)return;onDown(r,c,e)});td.addEventListener('mouseenter',()=>{if(dragState.dragging&&r===dragState.row)onEnter(c)});td.addEventListener('touchstart',e=>{e.preventDefault();onDown(r,c,e)},{passive:false});td.addEventListener('touchmove',e=>{e.preventDefault();const t=e.touches[0];if(Math.abs(t.clientX-dragState.touchStartX)<10&&Math.abs(t.clientY-dragState.touchStartY)<10)return;const el2=document.elementFromPoint(t.clientX,t.clientY);const td2=el2&&el2.closest('td');if(td2)td2.dispatchEvent(new MouseEvent('mouseenter'));},{passive:false});}
      tr.appendChild(td);
    }
    tbl.appendChild(tr);
  }
  // renderSegList/applyGridBgはjs/grid.js内(renderSegList)・js/grid-settings.js抽出まで(applyGridBg)のwindow経由の一時ブリッジ
  window.renderSegList();
  updateFarmNameDisplay();
  requestAnimationFrame(()=>window.applyGridBg());
}
export function onDown(r,c,e){e.preventDefault();if(!permCanEditFarm())return;if(gridState.aisleRows.includes(r)||gridState.aisleCols.includes(c))return;const k=K(r,c);if(gridState.cells[k]&&gridState.cells[k].crop)return;dragState.dragging=true;dragState.row=r;dragState.startCol=c;dragState.endCol=c;if(e.touches&&e.touches[0]){dragState.touchStartX=e.touches[0].clientX;dragState.touchStartY=e.touches[0].clientY;}document.addEventListener('mouseup',onUp,{once:true});document.addEventListener('touchend',onUp,{once:true});window.addEventListener('touchend',onUp,{once:true});
  // DOM再構築せず直接ハイライト（iOS touchend対策）
  const tds=document.querySelectorAll('#grid-table td');tds.forEach(td=>{if(td.dataset.r==r&&td.dataset.c==c)td.style.background='var(--color-background-tertiary)';});
}
export function onEnter(c){const dir=c>=dragState.startCol?1:-1;let end=dragState.startCol;for(let ci=dragState.startCol;ci!==c+dir;ci+=dir){if(ci<0||ci>=gridState.cols)break;const k=K(dragState.row,ci);if(gridState.cells[k]&&gridState.cells[k].crop)break;end=ci;}if(end===dragState.endCol)return;dragState.endCol=end;const s=Math.min(dragState.startCol,dragState.endCol),e2=Math.max(dragState.startCol,dragState.endCol);document.querySelectorAll('#grid-table td[data-r]').forEach(td=>{const r2=+td.dataset.r,c2=+td.dataset.c;if(r2===dragState.row&&c2>=s&&c2<=e2){td.style.outline='2px solid #4A90E2';td.style.background='rgba(74,144,226,0.12)';}else if(!gridState.cells[K(r2,c2)]?.crop){td.style.outline='';td.style.background='';}});}
export function onUp(){if(!dragState.dragging){dragState.dragging=false;return;}dragState.dragging=false;const s=Math.min(dragState.startCol,dragState.endCol),e2=Math.max(dragState.startCol,dragState.endCol);if(dragState.row>=0&&s<=e2){dragState.pendingRow=dragState.row;dragState.pendingStart=s;dragState.pendingEnd=e2;showRegDlg();}renderGrid();}
