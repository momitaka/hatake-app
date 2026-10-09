// @ts-check
// ===== 野菜マスタ(基礎知識・栽培カレンダー)の取得 =====
// 基礎知識は野菜キー(veg_key)単位のマスタとして管理し、表示時にマスタを直接読む方針(TSK-76)。
// 取得元は veg_basic_info_defaults の status='published'(運営が確認して確定した行)のみで、
// 個人版(ログインなし)でもマーケット版でも同じ anon キーで読める。
// 保存データ(masterData等)には混ぜない。端末にも永続化せず、起動のたびに取り直す。
// 取得に失敗しても何もせず、従来どおり各野菜が持つ basicInfo の表示にフォールバックさせる。
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './state.js';

/** @typedef {{basicInfo: any, regionalSchedule: any, updatedAt: string}} VegMasterEntry */

/** veg_key → マスタ1件。loadVegMaster()が成功するたびに全置換される */
/** @type {Object<string, VegMasterEntry>} */
export const vegMasterStore={};

/** @returns {Promise<boolean>} 取得に成功したか(確定済みの行が0件でもtrue) */
export async function loadVegMaster(){
  try{
    const res=await fetch(SUPABASE_URL+'/rest/v1/veg_basic_info_defaults?status=eq.published&select=veg_key,basic_info,regional_schedule,updated_at',{
      headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY}
    });
    if(!res.ok)throw new Error('veg master fetch failed: '+res.status);
    const rows=await res.json();
    if(!Array.isArray(rows))throw new Error('veg master response is not an array');
    Object.keys(vegMasterStore).forEach(k=>delete vegMasterStore[k]);
    rows.forEach(r=>{
      vegMasterStore[r.veg_key]={basicInfo:r.basic_info,regionalSchedule:r.regional_schedule,updatedAt:r.updated_at};
    });
    return true;
  }catch(e){
    console.warn('veg master load error',e);
    return false;
  }
}

/** @param {string|null|undefined} vegKey @returns {VegMasterEntry|null} マスタに確定済みの行が無ければnull */
export function getVegMaster(vegKey){
  return vegKey&&vegMasterStore[vegKey]?vegMasterStore[vegKey]:null;
}
