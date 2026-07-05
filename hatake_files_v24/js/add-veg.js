// @ts-check
// ===== 野菜追加フロー（畑編集権限チェック含む） =====
// マーケットプレイス版では、お試し中の未ログイン訪問者も含めて
// 誰でも自分の畑（セッション or 会員データ）を操作できる（旧autoAdmin:trueと同じ考え方）。
// 個人版は従来通りpermRequireAdmin()（管理者パスワードでログインした本人）のみ。
import { SUPABASE_URL, SUPABASE_ANON_KEY, permState, addVegState, masterData, navState } from './state.js';
import { permRequireAdmin } from './permissions.js';
import { _dataStrategy, saveLS } from './storage.js';
import { marketAuth } from './db.js';
import { ALL_ICONS } from './helpers.js';

export function permCanEditFarm(){return permRequireAdmin()||_dataStrategy==='session';}
let _myPurchasedRecipes=[];
async function _populateAddVegPreset(){
  const sel=document.getElementById('av-preset');const label=document.getElementById('av-preset-label');
  if(_dataStrategy==='session'&&!permState.isAdmin&&!permState.isSupervisor&&marketAuth.userId){
    label.textContent='購入したレシピから選ぶ';
    sel.innerHTML='<option value="">— 購入したレシピ —</option>';
    _myPurchasedRecipes=[];
    try{
      const res=await fetch(SUPABASE_URL+'/rest/v1/user_recipes?user_id=eq.'+marketAuth.userId+'&select=id,name,emoji,veg_key,family,grow_method,season,phases,basic_info,reference_video_url',{
        headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+marketAuth.accessToken}
      });
      if(res.ok)_myPurchasedRecipes=await res.json();
    }catch(e){console.error('user_recipes load error',e);}
    _myPurchasedRecipes.forEach(r=>{const op=document.createElement('option');op.value=r.id;op.textContent=(r.emoji||'')+' '+r.name;sel.appendChild(op);});
  }else{
    label.textContent='プリセットから選ぶ';
    sel.innerHTML='<option value="">— プリセット野菜 —</option>';
    _myPurchasedRecipes=[];
    PRESET_VEGS.forEach(v=>{const op=document.createElement('option');op.value=v.id;op.textContent=`${v.emoji} ${v.name}`;sel.appendChild(op);});
  }
}
document.getElementById('btn-add-veg').addEventListener('click',()=>{if(!permCanEditFarm())return;document.getElementById('av-name').value='';document.getElementById('av-variety').value='';document.getElementById('av-ref-url').value='';document.getElementById('av-grow-method').value='seedling';document.getElementById('av-season').value='';document.getElementById('av-region').value=localStorage.getItem('hatake_last_region')||'';addVegState.emoji='🌱';addVegState.iconFile=null;renderEmojiGrid();document.getElementById('av-next').disabled=true;_populateAddVegPreset();document.getElementById('dlg-add-veg').style.display='flex';});
// 購入直後、「購入したレシピから選ぶ」を手動で選び直す手間を省き、
// そのまま内容が反映された状態で「野菜を追加」ダイアログを開く
export async function _openAddVegFromPurchase(userRecipe){
  document.getElementById('av-name').value='';document.getElementById('av-variety').value='';document.getElementById('av-ref-url').value='';document.getElementById('av-grow-method').value='seedling';document.getElementById('av-season').value='';document.getElementById('av-region').value=localStorage.getItem('hatake_last_region')||'';addVegState.emoji='🌱';addVegState.iconFile=null;renderEmojiGrid();
  document.getElementById('av-next').disabled=true;
  await _populateAddVegPreset();
  const sel=document.getElementById('av-preset');
  if(userRecipe&&userRecipe.id&&_myPurchasedRecipes.some(r=>r.id===userRecipe.id)){
    sel.value=userRecipe.id;
    sel.dispatchEvent(new Event('change'));
  }
  document.getElementById('dlg-add-veg').style.display='flex';
}
document.getElementById('btn-add-veg-cancel').addEventListener('click',()=>{document.getElementById('dlg-add-veg').style.display='none';});
document.getElementById('dlg-add-veg').addEventListener('mousedown',e=>{if(e.target===e.currentTarget)document.getElementById('dlg-add-veg').style.display='none';});
// openMarketListはjs/marketplace.js抽出までのwindow経由の一時ブリッジ
document.getElementById('btn-open-market').addEventListener('click',()=>window.openMarketList());
document.getElementById('av-preset').addEventListener('change',()=>{
  const val=document.getElementById('av-preset').value;
  const purchased=_myPurchasedRecipes.find(r=>r.id===val);
  if(purchased){
    document.getElementById('av-name').value=purchased.name;
    const vegPreset=PRESET_VEGS.find(v=>v.id===purchased.veg_key);
    if(vegPreset){addVegState.emoji=vegPreset.emoji;addVegState.iconFile=vegPreset.iconFile||null;}
    else{addVegState.emoji=purchased.emoji||'🌱';addVegState.iconFile=null;}
    renderEmojiGrid();
    document.getElementById('av-grow-method').value=purchased.grow_method||'seedling';
    document.getElementById('av-season').value=purchased.season||'';
    document.getElementById('av-ref-url').value=purchased.reference_video_url||'';
  }else{
    const preset=PRESET_VEGS.find(v=>v.id===val);
    if(preset){document.getElementById('av-name').value=preset.name;addVegState.emoji=preset.emoji;addVegState.iconFile=preset.iconFile||null;renderEmojiGrid();}
  }
  checkAddVegValid();
});
document.getElementById('av-name').addEventListener('input',checkAddVegValid);
export function checkAddVegValid(){document.getElementById('av-next').disabled=!document.getElementById('av-name').value.trim();}
document.getElementById('btn-upload-icon').addEventListener('click',()=>document.getElementById('av-icon-upload').click());
document.getElementById('av-icon-upload').addEventListener('change',e=>{
  const file=e.target.files[0];e.target.value='';const errEl=document.getElementById('upload-icon-error');errEl.style.display='none';
  if(!file)return;
  const allowed=['image/jpeg','image/png','image/webp'];
  if(!allowed.includes(file.type)){errEl.textContent='JPEG・PNG・WebP 形式の画像を選択してください。';errEl.style.display='block';return;}
  if(file.size>2*1024*1024){errEl.textContent='ファイルサイズは2MB以内にしてください。';errEl.style.display='block';return;}
  const reader=new FileReader();
  reader.onload=ev=>{
    const img=new Image();
    img.onload=()=>{
      const SIZE=128;const canvas=document.createElement('canvas');canvas.width=SIZE;canvas.height=SIZE;
      const ctx=canvas.getContext('2d');
      const scale=Math.min(SIZE/img.width,SIZE/img.height);
      const w=Math.round(img.width*scale),h=Math.round(img.height*scale);
      ctx.clearRect(0,0,SIZE,SIZE);ctx.drawImage(img,(SIZE-w)/2,(SIZE-h)/2,w,h);
      const b64=canvas.toDataURL('image/png');
      const key='custom_'+Date.now();masterData.customIcons[key]=b64;saveLS();
      addVegState.iconFile=key;addVegState.emoji='';renderEmojiGrid();
    };img.src=ev.target.result;
  };reader.readAsDataURL(file);
});
export function renderEmojiGrid(){const grid=document.getElementById('av-emoji-grid');grid.innerHTML='';const customEntries=Object.keys(masterData.customIcons).map(k=>({emoji:'',iconFile:k,isCustom:true}));[...ALL_ICONS,...customEntries].forEach(icon=>{const isSelected=icon.iconFile?icon.iconFile===addVegState.iconFile:(!addVegState.iconFile&&icon.emoji===addVegState.emoji);const opt=document.createElement('div');opt.className='emoji-opt'+(isSelected?' selected':'');opt.style.position='relative';const src=icon.iconFile?(ICON_B64[icon.iconFile]||masterData.customIcons[icon.iconFile]||null):null;if(src){opt.innerHTML=`<img src="${src}" width="24" height="24" style="object-fit:contain">`;}else{opt.textContent=icon.emoji;}if(icon.isCustom){const del=document.createElement('div');del.innerHTML='<i class="ti ti-x"></i>';del.style.cssText='position:absolute;top:-5px;right:-5px;width:14px;height:14px;border-radius:50%;background:#e53;color:#fff;font-size:8px;display:flex;align-items:center;justify-content:center;cursor:pointer';del.addEventListener('click',e=>{e.stopPropagation();delete masterData.customIcons[icon.iconFile];if(addVegState.iconFile===icon.iconFile){addVegState.iconFile=null;addVegState.emoji='🌱';}saveLS();renderEmojiGrid();});opt.appendChild(del);}opt.addEventListener('click',()=>{addVegState.emoji=icon.emoji;addVegState.iconFile=icon.iconFile||null;renderEmojiGrid();});grid.appendChild(opt);});}
document.getElementById('av-next').addEventListener('click',()=>{
  if(!permCanEditFarm())return;
  const name=document.getElementById('av-name').value.trim();const variety=document.getElementById('av-variety').value.trim();const presetId=document.getElementById('av-preset').value;const preset=PRESET_VEGS.find(v=>v.id===presetId);const purchased=_myPurchasedRecipes.find(r=>r.id===presetId);if(!name)return;
  const id=purchased?`veg_${Date.now()}`:(presetId&&!masterData.vegMaster[presetId]?presetId:`veg_${Date.now()}`);
  const growMethod=document.getElementById('av-grow-method').value;const refUrl=document.getElementById('av-ref-url').value.trim();const season=document.getElementById('av-season').value;const region=document.getElementById('av-region').value;if(region)localStorage.setItem('hatake_last_region',region);
  masterData.vegMaster[id]={id,name,emoji:addVegState.emoji,iconFile:addVegState.iconFile||undefined,family:purchased?purchased.family:(preset?preset.family:''),variety,growMethod,season,region,referenceUrl:refUrl,phases:purchased?JSON.parse(JSON.stringify(purchased.phases||[])):[],basicInfo:purchased?JSON.parse(JSON.stringify(purchased.basic_info||{})):undefined};
  navState.masterVeg=id;saveLS();document.getElementById('dlg-add-veg').style.display='none';
  // renderMasterList/renderMasterDetailはjs/master-recipes.js抽出までのwindow経由の一時ブリッジ
  window.renderMasterList();window.renderMasterDetail();
});
