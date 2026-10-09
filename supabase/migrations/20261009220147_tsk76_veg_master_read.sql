-- ================================================================
-- TSK-76 第1段階: 野菜マスタ(veg_basic_info_defaults)をアプリから読めるようにする
-- 2026-10-09
--
-- 【背景】
-- 基礎知識(基本情報・栽培カレンダー等)は一般論なので、レシピの持ち物ではなく
-- 野菜キー(veg_key)単位のマスタとして管理し、表示時にマスタを直接読む方針。
-- 既存の veg_basic_info_defaults をそのままマスタとして正式化する。
-- 詳細はNotion「TSK-76 基礎知識を野菜単位のマスタに再設計する」参照。
--
-- 【この段階でやること】(アプリの表示はまだ変えない)
-- 1. 確定状態(status)・栽培カレンダー(regional_schedule)・更新履歴の列を追加
-- 2. 確定済み(published)の行だけ、誰でも読めるSELECTポリシーを追加
--
-- 【安全上の要点】
-- ・既存の行は全て status='draft'(確認前)になる。AI生成の未確認の値が
--   そのまま全員に見えることはない。運営が確認して 'published' にした行だけが対象。
-- ・個人版はログインなし(anonキー)で動くため、ポリシーは対象ロールを限定しない
--   (anon / authenticated の両方で読める)。
-- ・書き込み用のポリシーは作らない。書き込めるのは service_role(Edge Function、
--   Supabase画面)のみのまま。
-- ・テーブル名は変えない(デプロイ済みの generate-roadmap が3か所で参照しているため)。
--   名前の整理は generate-roadmap を再デプロイする子作業で行う。
-- ・generate-roadmap の既存の insert / select は列の既定値で動くので影響なし。
--
-- 【ロールバック(必要になった場合のみ手動で実行)】
-- DROP POLICY "published veg master is readable by everyone" ON veg_basic_info_defaults;
-- DROP TRIGGER trg_veg_basic_info_updated_at ON veg_basic_info_defaults;
-- DROP FUNCTION set_veg_basic_info_updated_at();
-- ALTER TABLE veg_basic_info_defaults
--   DROP CONSTRAINT veg_basic_info_defaults_status_check,
--   DROP COLUMN status, DROP COLUMN regional_schedule,
--   DROP COLUMN updated_at, DROP COLUMN updated_by;
-- ================================================================

ALTER TABLE veg_basic_info_defaults
  ADD COLUMN IF NOT EXISTS status            TEXT        NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS regional_schedule JSONB,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by        TEXT;

ALTER TABLE veg_basic_info_defaults
  ADD CONSTRAINT veg_basic_info_defaults_status_check
  CHECK (status IN ('draft', 'published'));

-- 既存行の更新日時は、列追加時刻ではなく作成日時に揃える
UPDATE veg_basic_info_defaults SET updated_at = created_at;

COMMENT ON COLUMN veg_basic_info_defaults.status IS
  'draft=確認前(アプリからは読めない) / published=運営が確認して確定(誰でも読める)';
COMMENT ON COLUMN veg_basic_info_defaults.regional_schedule IS
  '栽培カレンダー。recipes.regional_scheduleと同形(地域キー cool/middle/warm)を当面許容。年またぎ・複数期間への拡張は子作業3で確定';
COMMENT ON COLUMN veg_basic_info_defaults.updated_by IS
  '更新者のメモ。Supabase画面から直接編集した場合は空でよい';

-- updated_at を更新のたびに自動で書き換える
CREATE OR REPLACE FUNCTION set_veg_basic_info_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_veg_basic_info_updated_at
  BEFORE UPDATE ON veg_basic_info_defaults
  FOR EACH ROW
  EXECUTE FUNCTION set_veg_basic_info_updated_at();

-- 確定済みの行だけ、誰でも(未ログイン含む)読める。draftは対象外。
-- RLSは 20260703020000 で有効化済み。
CREATE POLICY "published veg master is readable by everyone"
  ON veg_basic_info_defaults FOR SELECT
  USING (status = 'published');
