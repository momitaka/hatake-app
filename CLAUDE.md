> **このセッションは「私の畑アプリ」の開発作業です。農業・畑管理以外の話題・別プロジェクトの相談は、別チャットで行ってください。**

> **セッションタイトルは必ず日本語でつけること。**
> **セッション開始時、開発ログDB（データソースID: `724aa09b-932b-4384-85d2-d699dbce8230`）を「日付」降順で1件取得し、そこに入っている「セッション番号」（自動採番プロパティ）の値+1を、セッションタイトル冒頭に `#060` のようにゼロ埋め3桁で付与すること（引用・参照を楽にするための通し番号。Notionタスク管理DBの管理番号（TSK-1等）とは別物）。**

# 畑管理アプリ「私の畑」— 開発ガイド

## プロジェクト概要

家庭菜園の区画・作業タスク・収穫を一元管理するスマートフォン向け Web アプリ。
複数監修者のレシピを横断販売するマーケットプレイス型マルチテナント版（v26）を開発中。

**現バージョン**: v26（メイン開発対象）  
**ビジネスモデル（シナリオ2）**: 栽培管理サブスク 150円/月（1ヶ月無料・運営100%）＋ レシピ買い切り 300円/本（監修者70%・運営30%、レシピ単位で価格調整可）。詳細は Notion の関連ページ参照。

### バージョン番号を上げる基準
コードの見た目や機能追加ではなく、**ビジネスモデル／アーキテクチャの根本転換**があった時のみ上げる。
- 例：v24→v25（個人版→YouTuberコラボ版）、v25→v26（チャンネル専用スキン→複数監修者マーケットプレイス）
- 判断基準：「旧バージョンの設計書を読んだ人が、現在の仕組みについて“機能が足りない”ではなく“根本的に誤解する”か」。誤解するなら上げる、単なる機能追加なら上げない
- 該当しそうな変更を検討・提案する際は、Claude からもバージョンアップの要否を都度提案する

## インフラ構成

| サービス | 用途 | URL |
|---|---|---|
| GitHub | コード管理 | https://github.com/momitaka/hatake-app |
| Vercel | ホスティング（メイン） | https://hatake-app-nu.vercel.app/hatake_v26.html |
| Supabase | DB・Auth | https://rkubnugczjlsxskomknm.supabase.co |
| Stripe | サブスク決済 | 未設定（将来） |

## 重要ファイル

```
hatake_app/
├── hatake_files_v24/
│   ├── hatake_v26.html         ← メインHTML（骨格のみ。詳細ロジックはjs/配下に分割済み）
│   ├── js/                     ← ネイティブESモジュール22ファイル（バンドラー無し）。詳細は下記「アーキテクチャ」参照
│   ├── config/default.json     ← 個人版「私の畑」設定（触らない）
│   └── config/market.json      ← マーケットプレイス版 共通設定
├── tsconfig.json                ← tsc --checkJs設定（js/**/*.jsが対象）
├── .githooks/pre-commit          ← コミット時に自動typecheck（`npm install`で有効化）
├── .github/workflows/typecheck.yml ← push時にGitHub Actionsで型チェック
├── supabase/
│   ├── functions/generate-roadmap/  ← AI生成 Edge Function
│   ├── functions/purchase-recipe/   ← レシピ購入処理 Edge Function（Stripe未連携・即時成立の暫定版）
│   └── migrations/
│       ├── 20260702_v25_scenario2_marketplace.sql ← 実行済み（creators/users/recipes/recipe_purchases/user_recipes/user_records）
│       ├── 20260703_v25_scenario2_rls.sql         ← 実行済み（RLS最小構成）
│       ├── 20260703_v25_user_recipes_veg_key.sql  ← 実行済み
│       ├── 20260703_v25_veg_basic_info_defaults.sql ← 実行済み
│       └── archived/                              ← 廃止済み旧設計（channel_id方式）。実行しないこと
└── CLAUDE.md                   ← このファイル
```

## アーキテクチャ（2026-07-06 時点の最新仕様）

### モジュール構成
`hatake_v26.html`（旧2730行）は骨格（約840行）のみを残し、22セクションを`hatake_files_v24/js/`配下にネイティブESモジュール（`<script type="module">`、バンドラー無し）として分割済み。

- **ファイル一覧**: `state.js`（カーネル：状態オブジェクト定義・定数）, `date-utils.js`, `dialogs.js`, `splash.js`, `helpers.js`, `permissions.js`, `db.js`, `storage.js`, `settings-dialog.js`, `segments.js`, `registration-dialog.js`, `complete.js`, `add-veg.js`, `data-loading.js`, `grid.js`, `archive.js`, `manage.js`, `grid-settings.js`, `marketplace.js`, `master-recipes.js`, `basic-tab.js`, `auth.js`
- **ファイル間の相互依存**: 基本は`import`/`export`。2〜3ファイルの循環依存が発生する箇所のみ、意図的に`window.foo=foo`のブリッジで解決（コメントで「一時的な抽出待ち」か「循環回避のための恒久設計」かを明記）
- バンドラー（Vite等）の導入は、TypeScript構文への本格移行やCDN未対応npmパッケージが必要になるまで保留

### 状態管理
かつて44個あったグローバル変数は、7つの状態オブジェクトに集約済み（`state.js`で定義）。

| オブジェクト | 内容 |
|---|---|
| `permState` | 権限（管理者/監修者判定） |
| `dragState` | グリッドのドラッグ選択の一時状態 |
| `addVegState` | 野菜追加フォームの一時状態 |
| `navState` | 画面遷移状態（現在の区画・タブ等） |
| `farmMeta` | 農園設定（名前・フォント・アイコン） |
| `gridState` | グリッド物理構造（セル・行列数・通路） |
| `segData` | 区画データ（タスク・作業ログ・収穫ログ・アーカイブ） |
| `masterData` | 栽培レシピマスタ・カスタムアイコン |

保存データ（localStorage/Supabase）やUndoスナップショットの外部JSONキー名は、内部のオブジェクト化前と変えていない（互換性維持）。

### 型チェック（tsc --checkJs）
`js/**/*.js`全ファイルに`@ts-check`＋JSDoc型注釈を付与し、`tsconfig.json`で`allowJs`+`checkJs`を有効化。`hatake_files_v24/js/globals.d.ts`で`PRESET_VEGS`/`ICON_B64`/`supabase`等の非moduleグローバルと`window.*`カスタムプロパティを型宣言している。

```bash
npm run typecheck   # tsc --noEmit
```

- **pre-commit**: `.githooks/pre-commit`が`npm run typecheck`を実行し、型エラーがあればコミットを中止する。`npm install`時に`package.json`の`prepare`スクリプトが`git config core.hooksPath .githooks`を自動設定
- **CI**: `.github/workflows/typecheck.yml`がmainへのpush・PR時に同じチェックを実行
- 新しいJSファイルを追加する際は先頭に`@ts-check`を付け、`document.getElementById`等のDOM API呼び出しはJSDocキャスト（`/** @type {HTMLInputElement} */ (...)`）で型を明示する

## よく使うコマンド

```bash
# ローカルサーバー起動
cd /Users/momi/claude/hatake_app/hatake_files_v24
python3 -m http.server 8080
# 個人版: http://localhost:8080/hatake_v26.html
# マーケットプレイス版: http://localhost:8080/hatake_v26.html?config=market

# デプロイ（push で Vercel 自動デプロイ）
git add .
git commit -m "変更内容"
git push origin main
```

## 用語・仕様（齟齬防止）

| 使う言葉 | 使わない言葉 |
|---|---|
| 工程表 | ~~ロードマップ~~ |
| 収穫 | ~~収量~~ |
| 栽培レシピ | ~~野菜マスタ~~、~~栽培計画~~ |

- **管理画面** = 区画の詳細管理画面（野菜管理画面）
- **グリッド画面** = トップの畑マップ画面
- **マーケットプレイス版** = `?config=market` を付けた URL
- **個人版** = デフォルトの「私の畑」版
- ~~コラボ版~~（`?config=kagaku-jikyu` 等のチャンネル専用スキン）はv26で廃止済み。複数監修者のレシピを横断表示するマーケットプレイス版に統合された

## Supabase テーブル

| テーブル | 状態 | 用途 |
|---|---|---|
| `app_data` | ✅ 稼働中 | 個人版データ（**触らない**） |
| `creators` | ✅ 稼働中 | 監修者（チャンネル）情報 |
| `users` | ✅ 稼働中 | 会員アカウント・ロール管理（ログイン＝会員＝サブスク） |
| `recipes` | ✅ 稼働中 | 監修者が管理する共有マスターレシピ |
| `recipe_purchases` | ✅ 稼働中 | レシピ購入履歴・収益分配台帳 |
| `user_recipes` | ✅ 稼働中 | 購入時にコピーした、ユーザーが自由編集できるレシピ |
| `user_records` | ✅ 稼働中 | マーケットプレイス版ユーザーの畑データ |

→ `supabase/migrations/20260702_v25_scenario2_marketplace.sql` で作成（channel_id方式の旧設計は`supabase/migrations/archived/`に移動済み・現行DBには存在しない）

## Notion

### 構成方針

全ページは「🌱 私の畑アプリ開発」をルートに格納する。

```
🌱 私の畑アプリ開発（ルート）
　├── 📋 タスク管理DB
　├── 📝 開発ログDB
　├── 💡 ビジネス設計/
　├── 🏗️ 技術設計/
　└── 🎨 UI/UX/
```

### 主要URL

| 用途 | URL |
|---|---|
| ルートページ | https://app.notion.com/p/391e151fa4b48133bb79d81943f2bc1f |
| 開発ログDB | https://app.notion.com/p/d915bf3e5a574947bedb0822489ef2bd |
| タスク管理DB | https://app.notion.com/p/fdcec444991341cc887793e92febf09d |
| ビジネス検討資料 | https://app.notion.com/p/390e151fa4b481e3961dc3b24db92213 |

### Claude との連携ルール

- **セッション終了時**：`dev-log` スキルで開発ログDBに自動記録
- **新規ドキュメント作成時**：ルートページ配下に格納（ワークスペース直下に作らない）
- **ビジネス・設計メモ**：Claudeが直接Notionに作成・更新してよい
- **タスク管理**：開発タスクはタスク管理DBで管理する
