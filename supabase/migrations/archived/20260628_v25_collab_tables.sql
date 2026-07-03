-- ================================================================
-- [廃止済み・アーカイブ] このマイグレーションは実行しないこと。
-- channel_idでチャンネルごとにデータを分離する旧設計。
-- 20260702_v25_scenario2_marketplace.sql の DROP TABLE により
-- 該当テーブルは作り直され、現在のDBスキーマには存在しない。
-- 履歴として残すためarchived/に移動（2026-07-04）。
-- ================================================================
-- v25 YouTuberコラボモデル対応 テーブル追加
-- 2026-06-28
--
-- 【方針】
-- - 既存の app_data テーブルは一切変更しない（個人版を保護）
-- - 新テーブルはコラボ版専用（channel_id で分離）
-- - 個人版(default)は引き続き app_data を使用
-- ================================================================

-- ① ユーザー管理テーブル
-- サブスク加入時にアカウントを作成する（未加入はレコードなし）
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid         UUID UNIQUE,          -- Supabase Auth と紐付け（ログイン実装時に使用）
  channel_id       TEXT NOT NULL,        -- 'kagaku-jikyu' 等 config と一致させる
  role             TEXT NOT NULL DEFAULT 'end_user',
    -- 'platform_admin' / 'youtuber_supervisor' / 'end_user'
  subscription_status TEXT NOT NULL DEFAULT 'free',
    -- 'free' / 'active' / 'cancelled'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_channel_id_idx ON users(channel_id);
CREATE INDEX IF NOT EXISTS users_auth_uid_idx ON users(auth_uid);

-- ② レシピテーブル（野菜マスタ＋ロードマップ　ch単位）
-- platform_admin が生成・管理、youtuber_supervisor が編集
CREATE TABLE IF NOT EXISTS recipes (
  id               TEXT NOT NULL,        -- 'tomato' 等 vegMaster の id と一致
  channel_id       TEXT NOT NULL,        -- どの ch のレシピか
  name             TEXT NOT NULL,
  family           TEXT,
  emoji            TEXT,
  phases           JSONB,                -- ロードマップ（tasks[] を含む）
  basic_info       JSONB,               -- 基礎情報（basicInfo）
  reference_video_url TEXT,             -- YouTuber 指定の参考動画 URL
  created_by       TEXT,               -- 'platform_admin' / 'youtuber_supervisor'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, channel_id)
);

CREATE INDEX IF NOT EXISTS recipes_channel_id_idx ON recipes(channel_id);

-- ③ ユーザー栽培記録テーブル（サブスクユーザーのデータ永続保存先）
-- 無料ユーザーはここに書かない（sessionStorage のみ）
-- サブスク加入時に sessionStorage のデータをここへ移行する
CREATE TABLE IF NOT EXISTS user_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL,        -- 暫定: 'main' / 将来: auth UUID
  channel_id       TEXT NOT NULL,        -- どの ch のアプリか
  data             JSONB NOT NULL,       -- 既存の app_data.data と同一構造（移行コスト最小）
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS user_records_user_id_idx ON user_records(user_id);
CREATE INDEX IF NOT EXISTS user_records_channel_id_idx ON user_records(channel_id);

-- ================================================================
-- 備考
-- app_data テーブル（既存）：個人版(default)が引き続き使用
-- user_records テーブル（新規）：コラボ版サブスクユーザーが使用
-- 両テーブルの data カラムは同一 JSON 構造なので移行は JSONB コピーのみ
-- ================================================================
