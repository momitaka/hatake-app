// @ts-check
// ===== DB保存・読込 =====
// v25シナリオ2: テーブルごとに保存・読込のクエリを切り替える
// app_data（個人版）: id カラムで識別  PATCH（従来通り、匿名anonキーのみ）
// user_records（マーケットプレイス版）: user_id（=users.id）で識別  UPSERT
// マーケットプレイス版は channel_id で分離しない（1ユーザー1行）。
// 未ログイン（会員でない）間は marketAuth.userId が null のため保存・読込とも何もしない
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_TABLE, DB_ID, gridState, segData, masterData, farmMeta } from './state.js';

/** マーケットプレイス版のログイン状態。importした変数は再代入できないため
 * プロパティ経由で更新する（auth.js等から marketAuth.userId=... の形で更新）。
 * @type {{userId: string|null, accessToken: string|null}} */
export const marketAuth={userId:null,accessToken:null};

/** @param {any} data */
export async function saveToDB(data){
  try{
    let res;
    if(SUPABASE_TABLE==='app_data'){
      // 個人版：従来通り PATCH
      res=await fetch(SUPABASE_URL+'/rest/v1/app_data?id=eq.'+DB_ID,{
        method:'PATCH',
        headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},
        body:JSON.stringify({data,updated_at:new Date().toISOString()})
      });
    }else{
      // マーケットプレイス版：会員のみ user_records に UPSERT（user_id をキーに）
      // on_conflict=user_idを指定しないと、PostgRESTがどのUNIQUE制約で重複解決すべきか
      // 認識できず、2回目以降の保存がuser_idのUNIQUE制約違反(409)で失敗し続ける
      if(!marketAuth.userId||!marketAuth.accessToken)return;
      res=await fetch(SUPABASE_URL+'/rest/v1/'+SUPABASE_TABLE+'?on_conflict=user_id',{
        method:'POST',
        headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+marketAuth.accessToken,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify({user_id:marketAuth.userId,data,updated_at:new Date().toISOString()})
      });
    }
    // fetchはHTTPエラー（401/403/400等）でも例外を投げないため、
    // res.okを見ないと保存失敗が握りつぶされて気づけない
    if(!res.ok){
      const body=await res.text().catch(()=>'');
      console.error('DB save failed',res.status,body);
    }
  }catch(e){console.error('DB save error',e);}
}
/** @returns {Promise<boolean>} */
export async function loadFromDB(){
  try{
    let res;
    if(SUPABASE_TABLE==='app_data'){
      // 個人版：従来通り
      res=await fetch(SUPABASE_URL+'/rest/v1/app_data?id=eq.'+DB_ID+'&select=data',{
        headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY}
      });
    }else{
      // マーケットプレイス版：会員のみ user_id で取得
      if(!marketAuth.userId||!marketAuth.accessToken)return false;
      res=await fetch(SUPABASE_URL+'/rest/v1/'+SUPABASE_TABLE+'?user_id=eq.'+marketAuth.userId+'&select=data',{
        headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+marketAuth.accessToken}
      });
    }
    const rows=await res.json();
    const d=rows[0]?.data;
    if(d){
      // 区画が0件でも、農園名・アイコン・天気位置は保存されていれば必ず復元する
      // （cellsの有無で復元判定すると、区画未登録の会員がアプリを再起動した際に
      // 　保存済みの天気位置設定だけが消えてしまうため、cellsの判定とは切り離す）
      farmMeta.name=d.farmName||'';farmMeta.icon=d.farmIcon||'';farmMeta.lat=(typeof d.farmLat==='number')?d.farmLat:null;farmMeta.lng=(typeof d.farmLng==='number')?d.farmLng:null;
    }
    if(d&&d.cells&&Object.keys(d.cells).length>0){
      gridState.cells=d.cells;gridState.cols=d.COLS||8;gridState.rows=d.ROWS||6;
      segData.tasks=d.segTasks||{};segData.actionLogs=d.actionLogs||{};segData.harvestLogs=d.harvestLogs||{};
      segData.summaryMemo=d.segSummaryMemo||{};masterData.vegMaster=d.vegMaster||{};
      segData.archived=d.archivedSegs||{};gridState.aisleRows=d.aisleRows||[];gridState.aisleCols=d.aisleCols||[];
      return true;
    }
  }catch(e){console.error('DB load error',e);}
  return false;
}
