// @ts-check
// ===== 権限管理 =====
// 全ユーザー可: タスク記録・収穫追加・全体メモ・画面閲覧
// 管理者のみ  : 区画登録/編集、栽培レシピ追加/編集/削除、
//               AI生成、設定変更、収穫削除、管理完了
import { permState, navState, farmMeta, ADMIN_PASSWORD } from './state.js';
import { showAlert } from './dialogs.js';
import { _dataStrategy, saveLS, updateFarmNameDisplay } from './storage.js';
import { closeSettings } from './settings-dialog.js';
import { openMaster } from './grid-settings.js';
import { renderMasterDetail } from './master-recipes.js';

/** @returns {boolean} */
export function permRequireAdmin(){return permState.isAdmin;}
/** @returns {boolean} */
export function permRequireSupervisor(){return permState.isSupervisor;}
export function permApply(){
  const st=document.getElementById('admin-status');
  if(permState.isAdmin){
    document.body.classList.remove('view-mode');
    document.body.classList.add('admin-mode');
    if(st){st.textContent='管理者モードで操作中';st.style.color='#e28a12';}
  }else{
    document.body.classList.add('view-mode');
    document.body.classList.remove('admin-mode');
    if(st){st.textContent='閲覧モード（閲覧・作業記録のみ）';st.style.color='var(--color-text-tertiary)';}
  }
  // 動的に描画済みのマスタ詳細があれば再描画して権限を反映
  if(document.getElementById('screen-master').classList.contains('active')&&navState.masterVeg){renderMasterDetail();}
}
document.getElementById('btn-admin-login').addEventListener('click',()=>{
  if(_dataStrategy==='session')return; // マーケットプレイス版はパスワード方式を使わない（Supabase Authのroleのみで判定）
  const pw=document.getElementById('s-admin-pw').value;
  if(pw===ADMIN_PASSWORD){
    permState.isAdmin=true;
    // セッション版はlocalStorageに管理者フラグを書かない（セッション限定）
    if(_dataStrategy!=='session')localStorage.setItem('hatake_admin','1');
    permApply();
    document.getElementById('s-admin-pw').value='';
    showAlert('管理者モードになりました');
  }else if(pw===''){
    permState.isAdmin=false;
    localStorage.removeItem('hatake_admin');
    permApply();
  }else{showAlert('パスワードが違います');}
});
// v25シナリオ2: マーケットプレイス版はSupabase Authのroleでのみ権限判定する（後段のAuth処理が確定させる）。
// 個人版のみ、従来通りlocalStorageのhatake_adminフラグで判定する。
if(_dataStrategy!=='session'){
  if(localStorage.getItem('hatake_admin')==='1'){
    permState.isAdmin=true;
    permState.isSupervisor=true;
  }else{
    document.body.classList.add('view-mode');
  }
}else{
  document.body.classList.add('view-mode');
}
document.getElementById('btn-save-farm-name').addEventListener('click',()=>{farmMeta.name=document.getElementById('s-farm-name').value.trim();saveLS();updateFarmNameDisplay();const btn=document.getElementById('btn-save-farm-name');btn.textContent='保存しました';setTimeout(()=>{btn.textContent='保存';},1200);});
document.querySelectorAll('input[name="farm-font"]').forEach(r=>{r.addEventListener('change',()=>{farmMeta.font=r.value;saveLS();updateFarmNameDisplay();});});
document.getElementById('btn-open-master').addEventListener('click',()=>{closeSettings();openMaster();});
