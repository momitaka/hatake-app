// @ts-check
// ===== 日付ユーティリティ =====

/** @param {number} r @param {number} c @returns {string} グリッドセルキー("行,列") */
export const K=(r,c)=>`${r},${c}`;
/** @returns {string} 今日の日付をYYYY-MM-DD形式で返す */
export const todayISO=()=>new Date().toISOString().slice(0,10);

/** @param {string} yId @param {string} mId @param {string} dId @param {string} [isoVal] */
export function initDateSelects(yId,mId,dId,isoVal){
  const now=isoVal?new Date(isoVal):new Date();
  const curY=now.getFullYear(),curM=now.getMonth()+1,curD=now.getDate();
  const yEl=document.getElementById(yId);
  const mEl=document.getElementById(mId);
  const dEl=document.getElementById(dId);
  if(!yEl||!mEl||!dEl)return;
  yEl.innerHTML='';for(let y=curY-2;y<=curY+2;y++){const o=document.createElement('option');o.value=y;o.textContent=y+'年';if(y===curY)o.selected=true;yEl.appendChild(o);}
  mEl.innerHTML='';for(let m=1;m<=12;m++){const o=document.createElement('option');o.value=String(m).padStart(2,'0');o.textContent=m+'月';if(m===curM)o.selected=true;mEl.appendChild(o);}
  dEl.innerHTML='';for(let d=1;d<=31;d++){const o=document.createElement('option');o.value=String(d).padStart(2,'0');o.textContent=d+'日';if(d===curD)o.selected=true;dEl.appendChild(o);}
}
/** @param {string} yId @param {string} mId @param {string} dId @returns {string} */
export function getDateFromSelects(yId,mId,dId){
  const y=document.getElementById(yId)?.value;
  const m=document.getElementById(mId)?.value;
  const d=document.getElementById(dId)?.value;
  return(y&&m&&d)?`${y}-${m}-${d}`:'';
}
/** @returns {string} 今日の日付を"M/D"形式で返す */
export const todayDisp=()=>{const d=new Date();return `${d.getMonth()+1}/${d.getDate()}`};
/** @param {string} s YYYY-MM-DD @returns {string} */
export const isoFull=s=>{if(!s)return '';const[y,m,d]=s.split('-');return `${y}年${parseInt(m)}月${parseInt(d)}日`};
/** @param {string} s YYYY-MM-DD @returns {string} */
export const isoShort=s=>{if(!s)return '';const[y,m,d]=s.split('-');return `${y}/${parseInt(m)}/${parseInt(d)}`};
/** @param {string} a @param {string} b @returns {number} */
export const daysBetween=(a,b)=>Math.round((new Date(b)-new Date(a))/86400000);
