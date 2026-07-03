# 🌱 私の畑

家庭菜園の区画・作業タスク・収穫を一元管理するスマートフォン向け Web アプリです。

**[→ アプリを開く](https://hatake-app-nu.vercel.app/hatake_v26.html)**

---

## できること

- **グリッドで畑を可視化** — 区画ごとに野菜を登録してひと目で管理
- **工程表** — AI が種まきから収穫まで作業タスクを自動生成（定植/種まき基準の相対日数表示）
- **タスク記録** — チェックするだけで実施日を記録、進捗が自動計算
- **収穫ログ** — 数量・単位を記録して累計を集計
- **基礎知識** — AI が生成した栽培情報と参考動画をタブで確認
- **アーカイブ** — 完了した区画の記録をスナップショットで保存・閲覧
- **共有** — URL を送るだけで複数人が閲覧・記録できる

---

## 技術スタック

| | |
|---|---|
| 構成 | Single HTML file（フレームワーク不使用） |
| ホスティング | Vercel |
| DB | Supabase（リモート同期） |
| AI | Claude API（工程表・基礎知識の自動生成） |

---

## バージョン

| バージョン | 内容 |
|---|---|
| v24 | 個人版・安定稼働中 |
| v25 | YouTuber コラボ対応・Supabase Auth 実装（チャンネル専用スキン、廃止済み） |
| v26 | マーケットプレイス型課金モデル・複数監修者のレシピを横断販売（現行開発版） |

---

## ローカル開発

```bash
git clone https://github.com/momitaka/hatake-app.git
cd hatake-app/hatake_files_v24
python3 -m http.server 8080
# → http://localhost:8080/hatake_v26.html
```

デプロイは `git push origin main` で Vercel が自動実行します。

開発者向けの詳細は [CLAUDE.md](CLAUDE.md) を参照してください。

---

## ライセンス

個人・非商用利用はご自由にどうぞ。  
商用利用・再配布の際は作者にご連絡ください。

---

Crafted with care by [momitaka](https://github.com/momitaka)
