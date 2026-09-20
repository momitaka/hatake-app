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
  yEl.innerHTML='';for(let y=curY-2;y<=curY+2;y++){const o=document.createElement('option');o.value=String(y);o.textContent=y+'年';if(y===curY)o.selected=true;yEl.appendChild(o);}
  mEl.innerHTML='';for(let m=1;m<=12;m++){const o=document.createElement('option');o.value=String(m).padStart(2,'0');o.textContent=m+'月';if(m===curM)o.selected=true;mEl.appendChild(o);}
  dEl.innerHTML='';for(let d=1;d<=31;d++){const o=document.createElement('option');o.value=String(d).padStart(2,'0');o.textContent=d+'日';if(d===curD)o.selected=true;dEl.appendChild(o);}
}
/** @param {string} yId @param {string} mId @param {string} dId @returns {string} */
export function getDateFromSelects(yId,mId,dId){
  const y=/** @type {HTMLSelectElement|null} */ (document.getElementById(yId))?.value;
  const m=/** @type {HTMLSelectElement|null} */ (document.getElementById(mId))?.value;
  const d=/** @type {HTMLSelectElement|null} */ (document.getElementById(dId))?.value;
  return(y&&m&&d)?`${y}-${m}-${d}`:'';
}
/** @returns {string} 今日の日付を"M/D"形式で返す */
export const todayDisp=()=>{const d=new Date();return `${d.getMonth()+1}/${d.getDate()}`};
/** @param {string} s YYYY-MM-DD @returns {string} */
export const isoFull=s=>{if(!s)return '';const[y,m,d]=s.split('-');return `${y}年${parseInt(m)}月${parseInt(d)}日`};
/** @param {string} s YYYY-MM-DD @returns {string} */
export const isoShort=s=>{if(!s)return '';const[y,m,d]=s.split('-');return `${y}/${parseInt(m)}/${parseInt(d)}`};
/** @param {string} a @param {string} b @returns {number} */
export const daysBetween=(a,b)=>Math.round((new Date(b).getTime()-new Date(a).getTime())/86400000);
/** @param {string|null} dateStr YYYY-MM-DD @param {number} days @returns {string|null} 加算した日付をYYYY-MM-DD形式で返す */
export function addDaysISO(dateStr,days){if(!dateStr)return null;const d=new Date(dateStr);d.setDate(d.getDate()+days);return d.toISOString().slice(0,10);}
/** @param {string|null} dateStr YYYY-MM-DD @returns {string|null} 「M月上旬/中旬/下旬」形式のラベル（1〜10日=上旬、11〜20日=中旬、21日〜=下旬） */
export function junLabel(dateStr){if(!dateStr)return null;const d=new Date(dateStr);const day=d.getDate();const jun=day<=10?'上旬':day<=20?'中旬':'下旬';return `${d.getMonth()+1}月${jun}`;}
