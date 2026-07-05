// @ts-check
// ===== 設定ダイアログ =====
export function openSettings(){document.getElementById('dlg-settings').style.display='flex';window.syncAisleInputs();}
export function closeSettings(){document.getElementById('dlg-settings').style.display='none';}
document.getElementById('btn-settings').addEventListener('click',openSettings);
document.getElementById('btn-close-settings').addEventListener('click',closeSettings);
document.getElementById('dlg-settings').addEventListener('mousedown',e=>{if(e.target===e.currentTarget)closeSettings();});
