-- ================================================================
-- v25 シナリオ2 マーケットプレイス テーブルへのRLSポリシー（最小構成）
-- 2026-07-03
--
-- 【方針】
-- - 20260702マイグレーションでテーブルを作り直した際、RLSポリシーは
--   一度消えている（DROP TABLEでポリシーごと消える）。プロジェクト側の
--   デフォルト設定でRLS自体は有効化されており「全員拒否」の状態だった。
-- - ここでは「幹線フロー」（マーケットプレイス閲覧・ログイン・畑データ保存・
--   購入済みレシピの参照）が動くために最低限必要なポリシーのみ追加する。
-- - recipes/creators への書き込み（監修者による編集・公開）のポリシーは、
--   監修者用CMS画面を作る際に別途追加する（今回はスコープ外）。
-- - recipe_purchases / user_recipes への書き込みは、購入処理を行う
--   purchase-recipe Edge Function が service_role キーで行うため、
--   一般ユーザー向けの書き込みポリシーは用意しない。
-- - app_data テーブルは対象外（個人版・変更なし）。
-- ================================================================

ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_records ENABLE ROW LEVEL SECURITY;

-- creators：監修者名表示のため誰でも閲覧可
CREATE POLICY "creators are publicly readable"
  ON creators FOR SELECT
  USING (true);

-- recipes：公開済み(is_published=true)のもののみ誰でも閲覧可
CREATE POLICY "published recipes are publicly readable"
  ON recipes FOR SELECT
  USING (is_published = true);

-- users：本人のレコードのみ閲覧可（ログイン時の会員確認に使用）
CREATE POLICY "users can read own row"
  ON users FOR SELECT
  USING (auth.uid() = auth_uid);

-- user_records：本人のレコードのみ閲覧・作成・更新可（畑データの保存・読込に使用）
CREATE POLICY "users can select own records"
  ON user_records FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid()));

CREATE POLICY "users can insert own records"
  ON user_records FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid()));

CREATE POLICY "users can update own records"
  ON user_records FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid()));

-- user_recipes：本人が購入したレシピのみ閲覧可（「野菜を追加」のプリセット一覧に使用）
CREATE POLICY "users can select own user_recipes"
  ON user_recipes FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid()));

-- recipe_purchases：本人の購入履歴のみ閲覧可
CREATE POLICY "users can select own purchases"
  ON recipe_purchases FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid()));
