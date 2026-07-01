> **このセッションは「私の畑アプリ」の開発作業です。農業・畑管理以外の話題・別プロジェクトの相談は、別チャットで行ってください。**

# 畑管理アプリ「私の畑」— 開発ガイド

## プロジェクト概要

家庭菜園の区画・作業タスク・収穫を一元管理するスマートフォン向け Web アプリ。
YouTuber コラボ対応のマルチテナント版（v25）を開発中。

**現バージョン**: v25（メイン開発対象）  
**ビジネスモデル**: チャンネル単位サブスク・月額 400 円（YouTuber 送客モデル）

## インフラ構成

| サービス | 用途 | URL |
|---|---|---|
| GitHub | コード管理 | https://github.com/momitaka/hatake-app |
| Vercel | ホスティング（メイン） | https://hatake-app-nu.vercel.app/hatake_v25.html |
| Supabase | DB・Auth | https://rkubnugczjlsxskomknm.supabase.co |
| Stripe | サブスク決済 | 未設定（将来） |

## 重要ファイル

```
hatake_app/
├── hatake_files_v24/
│   ├── hatake_v25.html         ← メインアプリ（現行最新）
│   ├── config/default.json     ← 個人版「私の畑」設定
│   └── config/kagaku-jikyu.json← 科学的自給自足ch版設定
├── supabase/
│   ├── functions/generate-roadmap/  ← AI生成 Edge Function
│   └── migrations/20260628_v25_collab_tables.sql ← 未実行
└── CLAUDE.md                   ← このファイル
```

## よく使うコマンド

```bash
# ローカルサーバー起動
cd /Users/momi/claude/hatake_app/hatake_files_v24
python3 -m http.server 8080
# 個人版: http://localhost:8080/hatake_v25.html
# コラボ版: http://localhost:8080/hatake_v25.html?config=kagaku-jikyu

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
- **コラボ版** = `?config=kagaku-jikyu` を付けた URL
- **個人版** = デフォルトの「私の畑」版

## Supabase テーブル

| テーブル | 状態 | 用途 |
|---|---|---|
| `app_data` | ✅ 稼働中 | 個人版データ（**触らない**） |
| `users` | ⬜ 未作成 | ユーザー・ロール管理 |
| `recipes` | ⬜ 未作成 | YouTuber レシピ |
| `user_records` | ⬜ 未作成 | コラボ版ユーザーデータ |

→ `supabase/migrations/20260628_v25_collab_tables.sql` を Supabase SQL Editor で実行すれば 3 テーブル作成される

## Notion

| 用途 | URL |
|---|---|
| 開発ログ | https://app.notion.com/p/d915bf3e5a574947bedb0822489ef2bd |
| タスク管理 | https://app.notion.com/p/fdcec444991341cc887793e92febf09d |

セッション終了時に `dev-log` スキルで開発ログを自動記録。
