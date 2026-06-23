# 🌱 畑管理アプリ

家庭菜園の区画・作業タスク・収穫を一元管理するスマートフォン向けWebアプリです。

**[→ アプリを開く](https://momitaka.github.io/hatake-app/hatake_files_v24/hatake_v24.html)**

---

## できること

- **グリッドで畑を可視化** — 区画ごとに野菜を登録してひと目で管理
- **ロードマップ** — AIが種まきから収穫まで作業タスクを自動生成
- **タスク記録** — チェックするだけで実施日を記録、進捗が自動計算
- **収穫ログ** — 数量・単位を記録して累計を集計
- **基礎知識** — AIが生成した栽培情報と参考動画をタブで確認
- **アーカイブ** — 完了した区画の記録をスナップショットで保存・閲覧
- **共有** — URLを送るだけで複数人が閲覧・記録できる

---

## 使い方

1. ブラウザでアプリURLを開く
2. 管理者パスワードでログイン（設定 → 管理者ログイン）
3. グリッドをドラッグして区画を選択 → 野菜を登録
4. 区画をタップして管理画面へ

詳しくは [USER_GUIDE.md](USER_GUIDE.md) を参照してください。

---

## 技術スタック

| | |
|---|---|
| 構成 | Single HTML file（フレームワーク不使用） |
| ホスティング | GitHub Pages |
| DB | Supabase（リモート同期） |
| AI | Claude API（ロードマップ・基礎知識の自動生成） |

エンジニア向けの詳細は [TECHNICAL.md](TECHNICAL.md) を参照してください。

---

## セットアップ（自分でホストする場合）

### 1. リポジトリをクローン

```bash
git clone https://github.com/momitaka/hatake-app.git
cd hatake-app/hatake_files_v24
```

### 2. Supabase の準備

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. 以下のテーブルを作成：

```sql
create table hatake_data (
  id text primary key,
  data jsonb
);
```

3. `hatake_v24.html` 内の Supabase URL・APIキーを自分のものに書き換える

### 3. Claude API キーの設定

`hatake_v24.html` 内の `CLAUDE_API_KEY` を自分のキーに書き換える

### 4. 管理者パスワードの変更

`hatake_v24.html` 内の `ADMIN_PASSWORD` を任意の文字列に変更する

### 5. デプロイ

GitHub Pages、またはローカルで確認：

```bash
python3 -m http.server 8765
# → http://localhost:8765/hatake_v24.html
```

---

## ライセンス

個人・非商用利用はご自由にどうぞ。  
商用利用・再配布の際は作者にご連絡ください。

---

Crafted with care by [momitaka](https://github.com/momitaka)
