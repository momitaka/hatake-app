// @ts-check
// ===== 日付変換・汎用ダイアログ =====
import { todayISO } from './date-utils.js';

/** @param {string} disp "MM/DD"形式 @returns {string|null} 今年のYYYY-MM-DD、または不正な形式ならnull */
export function dispToISO(disp){
  if(!disp)return null;
  const year=new Date().getFullYear();
  const parts=disp.split('/');
  if(parts.length!==2)return null;
  return `${year}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
}
/** @param {'germination'|'firstHarvest'} type */
export function showMilestoneDialog(type){
  const dlg=document.getElementById('dlg-milestone');
  const img=/** @type {HTMLImageElement} */ (document.getElementById('dlg-milestone-img'));
  const title=document.getElementById('dlg-milestone-title');
  const msg=document.getElementById('dlg-milestone-msg');
  if(type==='germination'){
    img.src='images/milestone_germination.png';
    title.textContent='🌱 発芽しました！';
    msg.textContent='小さな命が土から顔を出しましたね。ここからが本番です。大切に育てていきましょう！';
  }else if(type==='firstHarvest'){
    img.src='images/milestone_firstharvest.png';
    title.textContent='🎉 初収穫おめでとうございます！';
    msg.textContent='ここまで育ててきた努力が実を結びました。よく頑張りましたね。お疲れ様でした！';
  }
  dlg.style.display='flex';
}
/** @param {string} msg @param {() => void} onOk */
export function showConfirm(msg, onOk){
  document.getElementById('dlg-custom-confirm-msg').textContent=msg;
  const dlg=document.getElementById('dlg-custom-confirm');
  const okBtn=document.getElementById('dlg-custom-confirm-ok');
  const cancelBtn=document.getElementById('dlg-custom-confirm-cancel');
  const close=()=>{dlg.style.display='none';okBtn.onclick=null;cancelBtn.onclick=null;};
  okBtn.onclick=()=>{close();onOk();};
  cancelBtn.onclick=()=>close();
  dlg.style.display='flex';
}
/** @param {string} msg @param {(() => void)} [onOk] */
export function showAlert(msg, onOk){
  document.getElementById('dlg-custom-alert-msg').textContent=msg;
  const dlg=document.getElementById('dlg-custom-alert');
  const okBtn=document.getElementById('dlg-custom-alert-ok');
  const close=()=>{dlg.style.display='none';okBtn.onclick=null;if(onOk)onOk();};
  okBtn.onclick=()=>close();
  dlg.style.display='flex';
}
/** @param {string} title @param {string} taskName @param {(dateVal: string) => void} onConfirm @param {(() => void)} [onCancel] */
export function showTaskDateDialog(title, taskName, onConfirm, onCancel){
  const dlg=document.getElementById('dlg-task-date');
  document.getElementById('dlg-task-date-title').textContent=title;
  document.getElementById('dlg-task-date-name').textContent=taskName;
  /** @type {HTMLInputElement} */ (document.getElementById('dlg-task-date-input')).value=todayISO();
  window._taskDateConfirm=onConfirm;
  window._taskDateCancel=onCancel||null;
  dlg.style.display='flex';
}
