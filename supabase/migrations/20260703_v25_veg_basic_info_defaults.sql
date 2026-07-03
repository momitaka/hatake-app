-- ================================================================
-- 品種ごとの基礎知識デフォルト値（AI生成内容の重複・不一致を防ぐ）
-- 2026-07-03
--
-- 【背景】
-- 基礎知識（発芽適温・耐寒性など）はレシピ単位でAIに生成させており、
-- 同じ品種（veg_key）でも監修者ごとに毎回別の内容が生成されうる。
-- 公的機関含め統一された正解ソースが存在しないため「正しい値」を
-- マスター化することはできない。代わりに「その品種で最初に生成された
-- 内容を既定値として使い回し、以後は監修者が各レシピ内で自由に
-- 上書き編集できる」運用にする。上書きは各レシピ（recipes.basic_info /
-- ローカルのvegMaster）側のみに反映され、この既定値テーブルは変更しない。
--
-- 書き込み・参照は generate-roadmap Edge Function が service_role で
-- 行う想定。クライアントからの直接アクセスは想定しないため、
-- 公開ポリシーは設けない（RLSはservice_roleをバイパスするため問題ない）。
-- ================================================================

CREATE TABLE veg_basic_info_defaults (
  veg_key     TEXT PRIMARY KEY,
  basic_info  JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE veg_basic_info_defaults ENABLE ROW LEVEL SECURITY;
-- 公開ポリシーなし（service_roleのみアクセス可）
