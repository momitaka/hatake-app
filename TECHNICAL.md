# 畑管理アプリ v24 — Technical Reference

## 概要

Single-file SPA（`hatake_v24.html`）。ビルドシステム・フレームワーク不使用。  
GitHub Pages でホスティングし、Supabase をリモートDB として使用する。

- **URL**: `https://momitaka.github.io/hatake-app/hatake_files_v24/hatake_v24.html`
- **総行数**: 約1,660行
- **関数数**: 約78関数

---

## スタック

| レイヤー | 技術 |
|---|---|
| UI | Vanilla HTML/CSS/JS（フレームワークなし） |
| アイコン | Tabler Icons（CDN webfont） |
| フォント | Noto Serif JP（Google Fonts、農園名のみ） |
| ストレージ | localStorage（プライマリ）+ Supabase（リモート同期） |
| ホスティング | GitHub Pages（`main` ブランチ push で自動デプロイ） |
| AI生成 | Claude API（`claude-opus-4-5`）、`aiGenerate()` 内で直接 fetch |

---

## 画面構成

```
splash-screen        スプラッシュ（月別イラスト・名言・農園名）
└─ screen-register   グリッド画面（メイン）
   ├─ screen-manage  区画管理（タスク・収量・作業ログ・基礎知識）
   ├─ screen-master  野菜マスタ（ロードマップ編集・AI生成）
   └─ screen-archive 過去データ（アーカイブ閲覧・スナップショット）
```

画面切り替えは CSS クラス `.active` の付け外しで制御。ルーターなし。

---

## データモデル

### localStorage キー

| キー | 内容 |
|---|---|
| `hatake_v21` | アプリ全状態（JSON） |
| `hatake_v21_icons` | カスタムアイコン（base64 PNG） |
| `hatake_admin` | `'1'` で管理者モード |

### `hatake_v21` の構造

```js
{
  COLS: number,           // グリッド列数（デフォルト8）
  ROWS: number,           // グリッド行数（デフォルト6）
  farmName: string,       // 農園名

  cells: {                // グリッドセル
    "row,col": {
      segId: string,      // "s_{row}_{col}_{timestamp}"
      crop: string,       // vegMaster のキー
      plantDate: string,  // "YYYY-MM-DD"
    }
  },

  vegMaster: {            // 野菜マスタ
    [vegId]: {
      id, name, emoji, iconFile,
      family, variety, growMethod,  // "seedling" | "seed" | "other"
      referenceUrl,                 // YouTube URL等（AI生成・基礎知識タブ埋め込みに使用）
      basicInfo: { ... },           // AI生成の基礎知識
      phases: [{                    // ロードマップ
        name, majorStatus,
        tasks: [{
          id, name, desc, day, url, milestone
        }]
      }]
    }
  },

  segTasks: {             // タスク記録
    [segId]: {
      [taskId]: {
        done: boolean,
        skip: boolean,
        doneDates: string[]   // ["MM/DD", ...]
      }
    }
  },

  harvestLogs: {          // 収穫記録
    [segId]: [{ id, date, amount, unit, memo }]
  },

  segSummaryMemo: {       // 区画メモ
    [segId]: string
  },

  actionLogs: {           // 作業ログ（現在は読み取りのみ・書き込み未使用）
    [segId]: [{ id, date, type, task, cropId }]
  },

  archivedSegs: {         // 完了済み区画スナップショット
    [segId]: {
      segId, cropId, plantDate, completedDate,
      vegSnapshot, taskSnapshot, harvestSnapshot
    }
  }
}
```

---

## 永続化・同期

```
saveLS()
  └─ localStorage.setItem('hatake_v21', JSON)   // 即時・同期
  └─ saveToDB(data)                              // 非同期・Supabase

loadFromDB()
  └─ Supabase から取得
  └─ cells / vegMaster が空でない場合のみ上書き（マージなし・全置換）
  └─ 完了後 splash-farm-name を再更新
```

**注意**: Supabase は全フィールド上書きで差分マージなし。  
`vegMaster` は常に全体オブジェクトで保存・上書きされる。

### Undo スタック

- `pushUndo()` で JSON スナップショットをスタックに積む（最大 `MAX_UNDO` 件）
- `doUndo()` でスタックから pop し状態を復元・再描画

---

## 権限モデル

| 操作 | 全ユーザー | 管理者のみ |
|---|---|---|
| タスク記録・チェック | ✓ | ✓ |
| 収穫追加 | ✓ | ✓ |
| 全体メモ編集 | ✓ | ✓ |
| 区画登録・編集 | — | ✓ |
| 野菜マスタ追加・編集・削除 | — | ✓ |
| AI生成 | — | ✓ |
| 設定変更・リセット | — | ✓ |
| 収穫削除・管理完了 | — | ✓ |

**判定**: `localStorage.getItem('hatake_admin') === '1'`  
**適用**: CSS クラス `.view-mode` を `body` に付与し `.admin-only` を `display:none`

---

## AI生成（`aiGenerate()`）

1. `vegMaster[vegId].referenceUrl`（YouTube等）と `growMethod` を読み取る
2. Claude API（`/v1/messages`）に JSON スキーマ付きプロンプトを送信
3. レスポンスの `basicInfo`（基礎知識）と `phases`（ロードマップ）を vegMaster に書き込み
4. `saveLS()` で保存

**再生成時の注意**: `phases` が差し替わると `taskId` が新規生成されるため `segTasks` の既存チェック状態は孤立（実質リセット）する。区画で使用中の野菜を再生成する場合は確認ダイアログを表示。

---

## セグメント（区画）の構築

`buildSegs()` が `cells` を走査して `segs` オブジェクトを構築する。  
`cells` は `"row,col"` キーで管理され、同一 `segId` を持つセルを 1 つのセグメントとして集約する。

```js
segs[sid] = {
  id: sid,
  row: number,
  cols: number[],    // 連続する列番号の配列
  crop: string,
  plantDate: string
}
```

セグメントは **横方向のみ**（1行・複数列）。縦連結は未対応。

---

## 主要関数マップ

| 関数 | 役割 |
|---|---|
| `renderGrid()` | グリッド・作物リスト再描画 |
| `buildSegs()` | cells → segs 変換 |
| `renderManage()` | 区画管理画面（タブ切り替え含む） |
| `renderRoadmapTab()` | ロードマップ描画 |
| `renderBasicTab()` | 基礎知識描画（YouTube埋め込み含む） |
| `renderMasterDetail()` | 野菜マスタ詳細描画 |
| `aiGenerate()` | Claude API 呼び出し・vegMaster 更新 |
| `executeComplete()` | 区画をアーカイブ化してグリッドから解放 |
| `saveLS()` | localStorage + Supabase に保存 |
| `loadFromDB()` | Supabase から読み込み（非同期） |
| `calcProgress()` | タスク進捗率・フェーズ計算 |
| `getMergedLogsByDate()` | segTasks.doneDates から作業ログ生成 |
| `youtubeVideoId()` | URL から YouTube 動画ID を抽出 |

---

## CSS 設計

- CSS 変数で全色定義（`--color-*`）
- ダークモード未対応（変数は宣言のみ）
- `.toolbar` に `position:sticky; top:0` で全画面ヘッダー固定
- グリッドは `<table>` で実装（CSS Grid 未使用）
- スプラッシュは `position:fixed; inset:0`

---

## デプロイフロー

```bash
# 変更 → コミット → プッシュ で GitHub Pages に自動反映
git add hatake_v24.html
git commit -m "..."
git push origin main
# 約30〜60秒で本番反映
```

ローカル確認は `python3 -m http.server 8765` で可。
