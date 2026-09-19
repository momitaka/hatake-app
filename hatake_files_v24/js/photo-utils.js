// @ts-check
// ===== TSK-58: 収穫ログ写真の圧縮・Supabase Storageアップロード/削除 =====
// 個人版はanonキー、マーケット版はログインユーザーのアクセストークンで
// Supabase Storage REST APIを直接叩く（db.jsのfetch方式に合わせ、supabase-jsクライアントは使わない）。
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_TABLE, DB_ID } from './state.js';
import { marketAuth } from './db.js';

const BUCKET='harvest-photos';
const MAX_DIM=1280;
const JPEG_QUALITY=0.7;

/** @returns {string} このリクエストで使うBearerトークン */
function _authToken(){return SUPABASE_TABLE==='app_data'?SUPABASE_ANON_KEY:(marketAuth.accessToken||SUPABASE_ANON_KEY)}
/** @returns {string|null} バケット内の自分のスコープ（パス先頭2階層）。マーケット版で未ログインならnull */
function _scopePrefix(){
  if(SUPABASE_TABLE==='app_data')return `app_data/${DB_ID}`;
  if(!marketAuth.userId)return null;
  return `user_records/${marketAuth.userId}`;
}

/** @param {File} file @returns {Promise<Blob>} 長辺1280px程度・JPEG品質70%程度に圧縮する */
export function compressImage(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      let width=img.naturalWidth,height=img.naturalHeight;
      if(width>MAX_DIM||height>MAX_DIM){
        if(width>=height){height=Math.round(height*MAX_DIM/width);width=MAX_DIM;}
        else{width=Math.round(width*MAX_DIM/height);height=MAX_DIM;}
      }
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d');
      if(!ctx){reject(new Error('canvas context取得失敗'));return;}
      ctx.drawImage(img,0,0,width,height);
      canvas.toBlob(blob=>{blob?resolve(blob):reject(new Error('画像の圧縮に失敗しました'))},'image/jpeg',JPEG_QUALITY);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('画像の読み込みに失敗しました'));};
    img.src=url;
  });
}

/** @param {string} segKey 代表segId @param {string} harvestId @param {File} file 圧縮してアップロードし、保存先パスを返す（失敗時はnull） @returns {Promise<string|null>} */
export async function uploadHarvestPhoto(segKey,harvestId,file){
  const scope=_scopePrefix();if(!scope)return null;
  try{
    const blob=await compressImage(file);
    const path=`${scope}/${segKey}/${harvestId}.jpg`;
    const res=await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,{
      method:'POST',
      headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+_authToken(),'Content-Type':'image/jpeg','x-upsert':'true'},
      body:blob
    });
    if(!res.ok){console.error('harvest photo upload failed',res.status,await res.text().catch(()=>''));return null;}
    return path;
  }catch(e){console.error('harvest photo upload error',e);return null;}
}

/** @param {string} segKey 代表segId @param {string} entryId 工程実施記録のid @param {1|2} slot 実施前後を区別する枠番号 @param {File} file 圧縮してアップロードし、保存先パスを返す（失敗時はnull） @returns {Promise<string|null>} */
export async function uploadTaskPhoto(segKey,entryId,slot,file){
  const scope=_scopePrefix();if(!scope)return null;
  try{
    const blob=await compressImage(file);
    const path=`${scope}/${segKey}/${entryId}_${slot}.jpg`;
    const res=await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,{
      method:'POST',
      headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+_authToken(),'Content-Type':'image/jpeg','x-upsert':'true'},
      body:blob
    });
    if(!res.ok){console.error('task photo upload failed',res.status,await res.text().catch(()=>''));return null;}
    return path;
  }catch(e){console.error('task photo upload error',e);return null;}
}

/** @param {string} path @returns {Promise<string|null>} 表示用の期限付き署名URL（1時間有効） */
export async function getHarvestPhotoUrl(path){
  if(!path)return null;
  try{
    const res=await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`,{
      method:'POST',
      headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+_authToken(),'Content-Type':'application/json'},
      body:JSON.stringify({expiresIn:3600})
    });
    if(!res.ok)return null;
    const json=await res.json();
    return json.signedURL?`${SUPABASE_URL}/storage/v1${json.signedURL}`:null;
  }catch(e){console.error('harvest photo sign url error',e);return null;}
}

/** @param {string} path 写真を1枚削除する（存在しなくてもエラーにしない） */
export async function deleteHarvestPhoto(path){
  if(!path)return;
  try{
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,{
      method:'DELETE',
      headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+_authToken()}
    });
  }catch(e){console.error('harvest photo delete error',e);}
}

/** @param {string} segKey 代表segId配下の写真を一括削除する。区画の登録削除（連携なし）時のクリーンアップ用 */
export async function deleteHarvestPhotosForSeg(segKey){
  const scope=_scopePrefix();if(!scope)return;
  try{
    const listRes=await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`,{
      method:'POST',
      headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+_authToken(),'Content-Type':'application/json'},
      body:JSON.stringify({prefix:`${scope}/${segKey}/`})
    });
    if(!listRes.ok)return;
    const files=await listRes.json();
    const paths=(files||[]).map(/** @param {{name:string}} f */f=>`${scope}/${segKey}/${f.name}`);
    if(!paths.length)return;
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`,{
      method:'DELETE',
      headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+_authToken(),'Content-Type':'application/json'},
      body:JSON.stringify({prefixes:paths})
    });
  }catch(e){console.error('harvest photo bulk delete error',e);}
}
