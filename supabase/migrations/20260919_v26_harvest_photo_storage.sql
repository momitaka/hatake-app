-- ================================================================
-- TSK-58: 収穫ログ写真保存機能 - Supabase Storageバケット・RLS設定
-- 2026-09-19
--
-- 【テーブルのスキーマ変更は無し】
-- app_data・user_recordsともにdataカラムがJSONBで、区画データ全体を丸ごと
-- 保存する設計（segData.harvestLogs等をそのままJSON化）。収穫記録エントリに
-- photoPath（Storageオブジェクトパス）を追加してもJSON内の1フィールドが
-- 増えるだけで、テーブル定義側の変更は不要（既存データとも後方互換）。
--
-- 【バケット構成】
-- 非公開バケット harvest-photos に、以下のパス規則でオブジェクトを保存する。
--   個人版　　　  : app_data/{DB_ID}/{代表segId}/{harvestLogId}.jpg
--   マーケット版  : user_records/{users.id}/{代表segId}/{harvestLogId}.jpg
-- （DB_IDは?dev=1時 'main_dev'、本番は'main'。本番/検証データを自動で分離する）
--
-- 【RLSの考え方】
-- - マーケット版：Supabase Authでログインしているため、auth.uid()からusers.idを
--   引いてパス2階層目と一致するかで本人確認できる（authenticatedロールに限定）
-- - 個人版：db.js/state.jsの設計上そもそもSupabase Authを使わずanonキーのみで
--   動作する（app_dataテーブル自体もauth.uid()による行単位のRLSを持たず、
--   DB_IDの非公開性のみに依存する設計）。このバケットのapp_data/配下も同じ
--   信頼モデルに揃え、anonロールに読み書き削除を許可する
--   （既存のapp_data保存の安全性を後退させるものではなく、同等の水準）
-- ================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('harvest-photos', 'harvest-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 個人版：app_data/ 配下はanonロールに読み書き削除を許可
CREATE POLICY "harvest photos: app_data anon rw"
  ON storage.objects FOR ALL
  TO anon
  USING (bucket_id = 'harvest-photos' AND (storage.foldername(name))[1] = 'app_data')
  WITH CHECK (bucket_id = 'harvest-photos' AND (storage.foldername(name))[1] = 'app_data');

-- マーケット版：user_records/{自分のusers.id}/ 配下のみ本人に許可
CREATE POLICY "harvest photos: user_records own rw"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'harvest-photos'
    AND (storage.foldername(name))[1] = 'user_records'
    AND (storage.foldername(name))[2] = (SELECT id::text FROM users WHERE auth_uid = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'harvest-photos'
    AND (storage.foldername(name))[1] = 'user_records'
    AND (storage.foldername(name))[2] = (SELECT id::text FROM users WHERE auth_uid = auth.uid())
  );
