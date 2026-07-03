-- ================================================================
-- v25 マーケットプレイス型課金モデル（シナリオ2）対応
-- 2026-07-02（20260701版を、課金モデル見直しに伴い設計変更）
--
-- 【シナリオ2の課金モデル】
-- - 栽培管理：サブスク 150円/月・1ヶ月無料・運営100%
-- - レシピ：監修者ごとの買い切り 300円/本・監修者70%／運営30%
--
-- 【方針】
-- - 既存の app_data テーブルは一切変更しない（個人版を保護）
-- - サービスイン前でテストユーザーのみのため、20260628/20260701版の
--   未実行テーブルは一度DROPしてこの内容で作り直す（実データの移行は不要）
-- - ?config= によるチャンネル専用スキンは廃止。creators テーブルを新設し、
--   複数監修者のレシピを横断表示するマーケットプレイスUIに対応する
-- - ユーザーは「ログイン＝会員＝サブスク」の1状態のみとし、
--   解約（退会）すると購入レシピも含めて全データを削除する
--   （解約操作は即時ではなく、支払い済み期間の終了時に反映する）
-- ================================================================

DROP TABLE IF EXISTS user_recipes CASCADE;
DROP TABLE IF EXISTS recipe_purchases CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS user_records CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS creators CASCADE;

-- ① 監修者（チャンネル）テーブル
-- 旧 config/*.json のチャンネル情報をDB化したもの。?config= スキン廃止に伴い新設。
CREATE TABLE creators (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT UNIQUE NOT NULL,   -- 'kagaku-jikyu' 等。URL・内部識別用（表示名ではない、後から変更してもFK参照には影響しない）
  name                TEXT NOT NULL,          -- 画面表示名。例：「科学的に楽しく自給自足ch」
  youtube_channel_id  TEXT,
  avatar_emoji        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX creators_slug_idx ON creators(slug);

-- ② ユーザー管理テーブル
-- channel_id スコープを廃止し、1ユーザー=1グローバルアカウントにする
-- （旧設計は auth_uid がテーブル全体でUNIQUEなのに channel_id ごとに別レコードを
-- 作ろうとする矛盾があった。channel_id を削除したことでこの矛盾は解消される）
-- 「ログイン＝会員＝サブスク」なので、end_user のレコードが存在する＝サブスク中。
-- 無料お試しユーザーはレコードを作らずセッションのみで動作する。
-- cancel_at は解約予約日時（Stripeの支払い済み期間終了日）。到達したらWebhookを
-- 受けて本人のレコードごと削除する（購入レシピ・栽培データも含めて全消去）。
CREATE TABLE users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid                UUID UNIQUE,        -- Supabase Auth と紐付け
  role                    TEXT NOT NULL DEFAULT 'end_user'
    CHECK (role IN ('platform_admin', 'youtuber_supervisor', 'end_user')),
  creator_id              UUID REFERENCES creators(id),
    -- youtuber_supervisor の場合のみ、担当チャンネルを設定する
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  cancel_at               TIMESTAMPTZ,        -- 解約予約日時。NULLなら解約予定なし
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (role = 'youtuber_supervisor' OR creator_id IS NULL)
);

CREATE INDEX users_auth_uid_idx ON users(auth_uid);
CREATE INDEX users_creator_id_idx ON users(creator_id);
CREATE INDEX users_stripe_customer_idx ON users(stripe_customer_id);
CREATE INDEX users_stripe_subscription_idx ON users(stripe_subscription_id);

-- ③ レシピテーブル（監修者が管理する共有マスター）
-- platform_admin が生成、youtuber_supervisor が編集。end_user は購入するまで中身を見られない。
-- reference_video_url は公開レシピの必須項目（マーケットプレイスのカードは動画サムネイルが主役のため）。
-- price_jpy / creator_share_percent はレシピ単位で調整可能（全レシピ一律ではない）。
-- sale_* はセール管理用。決済画面生成時に自社DB側で有効な価格を判定してStripeに渡す。
CREATE TABLE recipes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id             UUID NOT NULL REFERENCES creators(id),
  veg_key                TEXT NOT NULL,       -- 'tomato' 等、アイコン・科の判定用（旧idを流用）
  name                   TEXT NOT NULL,
  family                 TEXT,
  emoji                  TEXT,
  grow_method            TEXT,                -- 'seedling'（苗）/ 'seed_pot'（種・ポット）/ 'seed_ground'（種・地植え）
  season                 TEXT,                -- 'spring' / 'autumn' / 'spring_autumn' / 'year_round'
  phases                 JSONB,               -- 工程表（tasks[] を含む）
  basic_info             JSONB,               -- 基礎知識
  reference_video_url    TEXT,                -- 監修動画URL。公開時は必須（下のCHECK制約参照）
  price_jpy              INTEGER NOT NULL DEFAULT 300,
  creator_share_percent  INTEGER NOT NULL DEFAULT 70,
  sale_price_jpy         INTEGER,             -- セール価格。NULLならセール中でない
  sale_starts_at         TIMESTAMPTZ,
  sale_ends_at           TIMESTAMPTZ,
  created_by             UUID REFERENCES users(id),
  is_published           BOOLEAN NOT NULL DEFAULT false,  -- 公開フラグ（下書き管理）
  published_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (is_published = false OR reference_video_url IS NOT NULL)
);

CREATE INDEX recipes_creator_id_idx ON recipes(creator_id);
CREATE INDEX recipes_is_published_idx ON recipes(is_published);

-- ④ レシピ購入・収益分配台帳（台帳方式。Stripe Connectは導入しない）
-- Stripe決済1回につき1行。creator_share_jpy / platform_share_jpy は
-- 実際の支払額（price_paid_jpy。セール中は割引後の額）を基準に按分計算する
-- （セールの値引き分は運営・監修者の双方で按分負担する）。
-- 実際の監修者への送金はここでは行わず、月次で手動振込する運用とする。
CREATE TABLE recipe_purchases (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id                 UUID NOT NULL REFERENCES recipes(id),
  price_paid_jpy            INTEGER NOT NULL,
  creator_share_jpy         INTEGER NOT NULL,
  platform_share_jpy        INTEGER NOT NULL,
  stripe_payment_intent_id  TEXT,
  purchased_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipe_id)  -- 同じレシピの二重購入を防止
);

CREATE INDEX recipe_purchases_user_id_idx ON recipe_purchases(user_id);
CREATE INDEX recipe_purchases_recipe_id_idx ON recipe_purchases(recipe_id);

-- ⑤ ユーザーのマイレシピ（購入時に recipes の内容をコピーしたもの）
-- コピー後はマスター(recipes)と完全に独立し、全項目をユーザーが自由に編集できる
-- （grow_method 等が「マスターから引き継ぎ・編集不可」だった旧仕様は廃止。
-- 　種から→苗から等、自分の栽培環境に合わせた調整を認める）。
-- マスターの改訂は自動同期しない。監修者が内容を改訂したい場合は、
-- recipes に新しいレシピとして別途追加・別売りする（本の新版と同じ考え方）。
CREATE TABLE user_recipes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_recipe_id     UUID REFERENCES recipes(id),  -- コピー元。購入時に設定
  name                 TEXT NOT NULL,
  emoji                TEXT,
  family               TEXT,
  grow_method          TEXT,
  season               TEXT,
  phases               JSONB,
  basic_info           JSONB,
  reference_video_url  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_recipes_user_id_idx ON user_recipes(user_id);
CREATE INDEX user_recipes_source_idx ON user_recipes(source_recipe_id);

-- ⑥ ユーザーの栽培データ（区画・作業ログ・手入力レシピ）
-- channel_id を削除し、1ユーザー1行に統一。従来のapp_data.dataと同じJSON構造を踏襲する。
CREATE TABLE user_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- テーブル用途まとめ
-- app_data          （既存・変更なし）：個人版(default)が使用・触らない
-- creators                  ：監修者（チャンネル）情報。旧config/*.jsonのDB化
-- users                     ：会員アカウント。ログイン＝会員＝サブスク。
--                              cancel_at到達時にレコードごとCASCADE削除
-- recipes                   ：監修者が管理する共有マスターレシピ
-- recipe_purchases          ：レシピ購入履歴・収益分配台帳（台帳方式）
-- user_recipes              ：購入時にコピーした、ユーザー自身が自由編集できるレシピ
-- user_records              ：ユーザーの畑データ（区画・作業ログ・手入力レシピ含む）
-- ================================================================
