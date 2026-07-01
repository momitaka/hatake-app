-- ================================================================
-- v25 YouTuberコラボモデル対応 テーブル追加
-- 2026-07-01（2026-06-28版を設計見直しにより更新）
--
-- 【方針】
-- - 既存の app_data テーブルは一切変更しない（個人版を保護）
-- - 新テーブルはコラボ版専用（channel_id で分離）
-- - 個人版(default)は引き続き app_data を使用
-- ================================================================

-- ① ユーザー管理テーブル
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid            UUID UNIQUE,          -- Supabase Auth と紐付け
  channel_id          TEXT NOT NULL,        -- 'kagaku-jikyu' 等 config と一致
  role                TEXT NOT NULL DEFAULT 'end_user',
    -- 'platform_admin' / 'youtuber_supervisor' / 'end_user'
  subscription_status TEXT NOT NULL DEFAULT 'free',
    -- 'free' / 'active' / 'cancelled'
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_channel_id_idx ON users(channel_id);
CREATE INDEX IF NOT EXISTS users_auth_uid_idx ON users(auth_uid);

-- ② レシピテーブル（YouTuberマスターレシピ）
-- platform_admin が生成・管理、youtuber_supervisor が編集
-- end_user は閲覧のみ・転写して user_recipes に保存して使う
CREATE TABLE IF NOT EXISTS recipes (
  id                  TEXT NOT NULL,        -- 'tomato' 等 vegMaster の id と一致
  channel_id          TEXT NOT NULL,        -- どの ch のレシピか
  name                TEXT NOT NULL,
  family              TEXT,
  emoji               TEXT,
  grow_method         TEXT,                 -- 'seedling'（苗）/ 'seed_pot'（種・ポット）/ 'seed_ground'（種・地植え）
  season              TEXT,                 -- 'spring' / 'autumn' / 'spring_autumn' / 'year_round'
  phases              JSONB,                -- 工程表（tasks[] を含む）
  basic_info          JSONB,                -- 基礎情報
  reference_video_url TEXT,                 -- YouTuber 指定の参考動画 URL（end_user は編集不可）
  created_by          TEXT,                 -- 'platform_admin' / 'youtuber_supervisor'
  is_published        BOOLEAN NOT NULL DEFAULT false,  -- 公開フラグ（下書き管理）
  published_at        TIMESTAMPTZ,          -- 公開日時
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, channel_id)
);

CREATE INDEX IF NOT EXISTS recipes_channel_id_idx ON recipes(channel_id);
CREATE INDEX IF NOT EXISTS recipes_is_published_idx ON recipes(is_published);

-- ③ ユーザーのマイレシピテーブル
-- YouTuberマスターレシピを転写してユーザーが編集・使用する
-- grow_method / reference_video_url はマスターから引き継ぎ・編集不可（アプリ側で制御）
CREATE TABLE IF NOT EXISTS user_recipes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_recipe_id    TEXT,                 -- 元のマスターレシピ id（手入力の場合は NULL）
  source_channel_id   TEXT,                 -- 元のマスターレシピ channel_id
  channel_id          TEXT NOT NULL,        -- 使用中の ch
  name                TEXT NOT NULL,
  emoji               TEXT,
  grow_method         TEXT,                 -- マスターから引き継ぎ・編集不可
  season              TEXT,                 -- マスター初期値・ユーザー変更可
  phases              JSONB,                -- マスターから転写・ユーザー編集可
  reference_video_url TEXT,                 -- マスターから引き継ぎ・編集不可
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_recipes_user_id_idx ON user_recipes(user_id);
CREATE INDEX IF NOT EXISTS user_recipes_channel_id_idx ON user_recipes(channel_id);
CREATE INDEX IF NOT EXISTS user_recipes_source_idx ON user_recipes(source_recipe_id, source_channel_id);

-- ④ ユーザー栽培記録テーブル（サブスクユーザーのデータ永続保存先）
-- 無料ユーザーはここに書かない（sessionStorage のみ）
-- サブスク加入時に sessionStorage のデータをここへ移行する
CREATE TABLE IF NOT EXISTS user_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,        -- 暫定: 'main' / 将来: auth UUID
  channel_id  TEXT NOT NULL,        -- どの ch のアプリか
  data        JSONB NOT NULL,       -- 既存の app_data.data と同一構造（移行コスト最小）
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS user_records_user_id_idx ON user_records(user_id);
CREATE INDEX IF NOT EXISTS user_records_channel_id_idx ON user_records(channel_id);

-- ================================================================
-- テーブル用途まとめ
-- app_data        （既存）: 個人版(default)が使用・触らない
-- users                   : ロール・サブスク状態管理
-- recipes                 : YouTuberマスターレシピ（platform_admin / youtuber_supervisor が管理）
-- user_recipes            : ユーザーのマイレシピ（マスターから転写・ユーザー編集可）
-- user_records            : ユーザーの畑データ（区画・作業ログ・収穫ログ等）
-- ================================================================
