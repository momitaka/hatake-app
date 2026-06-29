# 畑管理アプリ プロジェクト現状メモ
最終更新: 2026-06-30

---

## サービス一覧

| サービス | 用途 | URL / 識別情報 |
|---|---|---|
| **GitHub** | コード管理・中継 | https://github.com/momitaka/hatake-app |
| **Supabase** | DB・Auth・Edge Function | https://rkubnugczjlsxskomknm.supabase.co |
| **Vercel** | ホスティング・公開 | https://hatake-app-nu.vercel.app/hatake_v25.html ✅ |
| **Stripe** | サブスク決済 | 未設定（将来） |

---

## ファイル構成

```
hatake_app/
├── hatake_files_v24/
│   ├── hatake_v25.html     ← メインアプリ（現行最新）
│   ├── config/
│   │   ├── default.json    ← 個人版「私の畑」設定
│   │   └── kagaku-jikyu.json ← 科学的自給自足ch版設定
│   ├── data/               ← 野菜アイコン・プリセットデータ
│   └── images/             ← スプラッシュ・イラスト画像
├── supabase/
│   ├── functions/generate-roadmap/ ← AI生成 Edge Function
│   └── migrations/20260628_v25_collab_tables.sql ← 未実行
└── .gitignore              ← .env等を除外
```

---

## Supabase テーブル

| テーブル | 状態 | 用途 |
|---|---|---|
| `app_data` | ✅ 既存・稼働中 | 個人版データ（触らない） |
| `users` | ⬜ 未作成 | ユーザー・ロール管理 |
| `recipes` | ⬜ 未作成 | YouTuberレシピ |
| `user_records` | ⬜ 未作成 | コラボ版ユーザーデータ |

→ `supabase/migrations/20260628_v25_collab_tables.sql` をSupabase SQL Editorで実行すれば3テーブル作成される

---

## アプリのURL（ローカル確認用）

```bash
# サーバー起動
cd /Users/momi/claude/hatake_app/hatake_files_v24
python3 -m http.server 8080

# 個人版
http://localhost:8080/hatake_v25.html

# コラボ版（科学的自給自足ch）
http://localhost:8080/hatake_v25.html?config=kagaku-jikyu
```

---

## バージョン履歴

| バージョン | 内容 |
|---|---|
| v24 | 個人版・安定稼働中（hatake_v24.html） |
| v25 | YouTuberコラボ対応・Supabase Auth実装（hatake_v25.html） |

---

## 残タスク（優先順）

- [ ] Supabase Dashboard設定（SQL実行・リダイレクトURL）
- [ ] 3ロール化（admin / member / guest）※コラボ版
- [ ] 工程表AI生成プロンプトの精度改善
- [ ] Stripe連携（サブスク決済）
- [ ] 利用規約・プライバシーポリシー（別チャットで）
- [ ] YouTuberとの契約書（別チャットで）

---

## ビジネスモデル（確定事項）

- チャンネル単位のサブスク：月額400円
- 未登録：セッション限定で全機能体験（閉じると消える）
- 登録後：データ永続保存・全機能フル利用
- YouTuberに収益分配：初期は送客メリットのみ・要交渉

---

## 開発ログ

### 2026-06-29
- GitHub → Vercel デプロイ環境構築（push自動デプロイ）
- 管理画面レイアウト変更（タイトル→グリーンベルト→タブ→コンテンツ）
- 収穫の追加・削除を全ユーザー可能に・削除確認ダイアログ追加
- スプラッシュ2秒自動スキップ
- 用語統一：ロードマップ→工程表、収量→収穫、野菜マスタ→栽培レシピ

### 2026-06-30
- グリッドセルに作業開始日表示（タスク完了日フォールバック含む）
- リストに収穫量「計 19本」表示
- 作業開始日の編集をヘッダーから作業ログタブ「作業期間」に移動
- 作業期間を「06/25〜（5日経過）」表示に変更
- 作業ログに種まき→発芽→定植→収穫のマイルストーン日数表示
- 工程表タスク日数を定植/種まきを0日とした相対表示（-N日・0日・+N日）
- 工程表の基準日（0日）を太字強調
- 栽培レシピ画面に目安日数の説明文追加

---

## 次のチャットに渡すときのひと言

「畑管理アプリv25の開発中。GitHubはmomitaka/hatake-app。
Vercelは https://hatake-app-nu.vercel.app/hatake_v25.html。
ローカルは /Users/momi/claude/hatake_app/。
PROJECT_STATUS.md に現状まとめてあります。」
