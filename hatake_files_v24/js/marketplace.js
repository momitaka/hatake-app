// @ts-check
// ===== v25シナリオ2: マーケットプレイス（フェーズ2・一覧＋詳細画面のみ。購入処理はフェーズ3） =====
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './state.js';
import { marketAuth } from './db.js';
import { showAlert } from './dialogs.js';
import { _openAddVegFromPurchase } from './add-veg.js';
import { renderGrid } from './grid.js';

let _marketReturnScreenId=null,_marketSelectedRecipe=null;
function _ytThumbUrl(url){
  if(!url)return null;
  const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/);
  return m?('https://img.youtube.com/vi/'+m[1]+'/hqdefault.jpg'):null;
}
// 表示用の見積り価格（セール中かどうかをクライアント側でも判定）。
// 実際の課金額は purchase-recipe Edge Function がサーバー側で同じロジックを
// 再計算して確定させるため、ここでの結果を信用して決済してはいけない。
function _effectivePrice(r){
  if(r.sale_price_jpy!=null&&r.sale_starts_at&&r.sale_ends_at){
    const now=new Date(),s=new Date(r.sale_starts_at),e=new Date(r.sale_ends_at);
    if(now>=s&&now<=e)return r.sale_price_jpy;
  }
  return r.price_jpy;
}
export function openMarketList(){
  document.getElementById('dlg-add-veg').style.display='none';
  const active=document.querySelector('.screen.active');
  _marketReturnScreenId=active?active.id:'screen-register';
  if(active)active.classList.remove('active');
  document.getElementById('screen-market-list').classList.add('active');
  renderMarketList();
}
// インラインonclick="closeMarketList()"から直接呼ばれるため、bootstrap時点でwindow登録済み
export function closeMarketList(){
  document.getElementById('screen-market-list').classList.remove('active');
  document.getElementById(_marketReturnScreenId||'screen-register').classList.add('active');
  renderGrid();
}
export function openMarketDetail(recipe){
  _marketSelectedRecipe=recipe;
  document.getElementById('screen-market-list').classList.remove('active');
  document.getElementById('screen-market-detail').classList.add('active');
  renderMarketDetail();
}
// インラインonclick="backToMarketList()"から直接呼ばれるため、bootstrap時点でwindow登録済み
export function backToMarketList(){
  document.getElementById('screen-market-detail').classList.remove('active');
  document.getElementById('screen-market-list').classList.add('active');
}
export async function renderMarketList(){
  const el=document.getElementById('market-list-items');
  el.innerHTML='<div style="text-align:center;color:var(--color-text-tertiary);font-size:var(--fs-sm);padding:20px 0">読み込み中...</div>';
  try{
    const res=await fetch(SUPABASE_URL+'/rest/v1/recipes?is_published=eq.true&select=id,name,emoji,family,price_jpy,sale_price_jpy,sale_starts_at,sale_ends_at,reference_video_url,creators(name,avatar_emoji)&order=created_at.desc',{
      headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY}
    });
    if(!res.ok)throw new Error('recipes fetch failed: '+res.status);
    const rows=await res.json();

    let ownedIds=new Set();
    if(marketAuth.userId&&marketAuth.accessToken){
      try{
        const ownedRes=await fetch(SUPABASE_URL+'/rest/v1/user_recipes?user_id=eq.'+marketAuth.userId+'&select=source_recipe_id',{
          headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+marketAuth.accessToken}
        });
        if(ownedRes.ok){
          const ownedRows=await ownedRes.json();
          ownedIds=new Set(ownedRows.map(o=>o.source_recipe_id).filter(Boolean));
        }
      }catch(e){console.error('owned recipes fetch error',e);}
    }

    el.innerHTML='';
    if(!Array.isArray(rows)||rows.length===0){
      el.innerHTML='<div style="text-align:center;color:var(--color-text-tertiary);font-size:var(--fs-sm);padding:20px 0">まだ公開されているレシピがありません</div>';
      return;
    }
    rows.forEach(r=>{
      const card=document.createElement('div');card.className='market-card';
      const thumb=_ytThumbUrl(r.reference_video_url);
      const creatorName=(r.creators&&r.creators.name)||'';
      const priceLabel=ownedIds.has(r.id)?'<span class="market-owned">購入済み</span>':`<span class="market-price">${_effectivePrice(r)}円</span>`;
      card.innerHTML=`<div class="market-thumb">${thumb?`<img src="${thumb}">`:''}<span class="market-play"><i class="ti ti-player-play"></i></span></div><div style="min-width:0;flex:1"><div style="font-size:var(--fs-sm);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.name}</div><div style="font-size:var(--fs-xs);color:var(--color-text-tertiary);margin:3px 0">${creatorName}</div>${priceLabel}</div>`;
      card.addEventListener('click',()=>openMarketDetail(r));
      el.appendChild(card);
    });
  }catch(e){
    console.error('market list load error',e);
    el.innerHTML='<div style="text-align:center;color:var(--color-text-tertiary);font-size:var(--fs-sm);padding:20px 0">読み込みに失敗しました</div>';
  }
}
export function renderMarketDetail(){
  const r=_marketSelectedRecipe;if(!r)return;
  const el=document.getElementById('market-detail-content');
  const thumb=_ytThumbUrl(r.reference_video_url);
  const creatorName=(r.creators&&r.creators.name)||'';
  el.innerHTML=`<div class="market-detail-thumb">${thumb?`<img src="${thumb}">`:''}<span class="market-play"><i class="ti ti-player-play"></i></span></div>
    <div style="text-align:center;margin-bottom:12px">
      <div style="font-size:var(--fs-base);font-weight:600">${r.name}</div>
      <div style="font-size:var(--fs-xs);color:var(--color-text-tertiary);margin-top:3px">${creatorName} 監修</div>
    </div>
    <div class="market-lock-box">
      <div style="font-size:var(--fs-xs);color:var(--color-text-tertiary);margin-bottom:8px">工程表・基礎知識（購入後に閲覧できます）</div>
      <div class="market-lock-lines"><div style="width:80%"></div><div style="width:60%"></div><div style="width:70%"></div></div>
      <div class="market-lock-icon"><i class="ti ti-lock"></i></div>
    </div>
    <div style="font-size:var(--fs-xs);color:var(--color-text-danger);line-height:1.6;margin-bottom:14px">退会すると、購入したレシピも含めて全データが削除されます。再度ご利用には購入し直しが必要です。</div>
    <button class="btn-primary" id="btn-market-purchase" style="width:100%;justify-content:center">${_effectivePrice(r)}円で購入する</button>`;
  document.getElementById('btn-market-purchase').addEventListener('click',async()=>{
    const btn=/** @type {HTMLButtonElement} */ (document.getElementById('btn-market-purchase'));
    if(!window._sbClient){showAlert('ログインが必要です。');return;}
    btn.disabled=true;btn.textContent='購入処理中...';
    try{
      const {data,error}=await window._sbClient.functions.invoke('purchase-recipe',{body:{recipe_id:r.id}});
      if(error)throw error;
      if(data&&data.error)throw new Error(data.error);
      showAlert(
        (data&&data.already_owned)?'このレシピは購入済みです。':'購入が完了しました。内容を確認して登録してください。',
        ()=>{backToMarketList();closeMarketList();_openAddVegFromPurchase(data&&data.user_recipe);}
      );
    }catch(e){
      console.error('purchase error',e);
      showAlert('購入処理に失敗しました。時間をおいて再度お試しください。');
      btn.disabled=false;btn.textContent=_effectivePrice(r)+'円で購入する';
    }
  });
}
