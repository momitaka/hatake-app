# 畑管理アプリ 引き継ぎドキュメント（v24時点）

## プロジェクト憲章（背景・目的）

**現状と課題（As-Is）**
- 週1日稼働の厳しい時間制約：基本的に週末（土曜日のみ）の週1回しか畑に行けないため、現地での一分一秒を無駄にせず、極めて効率よく迷いなく作業を消化する必要がある。
- 栽培管理の複雑化と手遅れリスク：複数の作物を大量に並行栽培しており、生育ステージが五月雨式に進行するため、いつ・何をすべきかのタスク管理が脳内だけで完結しなくなっている。週1日のタイミングを逃すと、対応が後手に回るリスク（ダウンタイム）が高い。
- 現地でのタイムロス：畑（現地）に行ってから野菜の状態を見て、その場で調べ物や対応策を考えているため、貴重な土曜日の作業時間が削られてしまっている。

**目指す姿（To-Be）**
- 「土曜日に畑に立った瞬間、3人のメンバー全員が迷わず最適な一手（作業）を打てる状態」の実現
- 記憶や判断の認知負荷を0にし、限られた時間の中で、農作業の細かいタスクや段取りが把握できて、スムーズに消化できる体制を作る。

**設計上の含意（Claude Code移行時に重要）**
- 「**3人のメンバー全員が**」迷わない状態が目標 → 現状のlocalStorage単体（端末ローカル保存）では複数人でのデータ共有ができない。平日に誰かが更新した内容が、土曜当日に全員の端末へ反映されている必要がある。**これがバックエンド/DB化を検討する一番の動機。**
- 「現地でのタイムロス削減」が目的 → 写真共有や軽い記録はアプリでやる必要はない（スコープアウト判断の根拠）。
- 「迷わず一手を打てる」が目的 → ロードマップ・タスク管理機能を最優先で磨き込む。装飾的な機能より判断支援を優先する。

---

## アプリ概要
ブラウザ上で動くプロトタイプ（HTML/JS単一ファイル）。データはlocalStorageに保存。キー名は `hatake_v21`（v21以降変更なし、互換性維持）。
野菜アイコンは38種をPNG画像（Base64埋め込み）化済み。イチゴ・スイカは絵文字のまま。

---

## v22での変更点
- 野菜アイコンを水彩イラスト画像（Base64埋め込み、`ICON_B64`定数）に差し替え（38種）
- `PRESET_VEGS`に`iconFile`フィールドを追加
- `vegIconHtml(veg, size)`ヘルパー関数を追加（imgタグ／絵文字フォールバック対応）
- グリッドセル・登録済みリスト・管理画面ヘッダー・ロードマップタイトル・マスタ画面のアイコン表示を更新

## v23での変更点

### FB1：文言修正
- 区画登録ダイアログの「植え付け日」→「**作業開始日**」
- 管理画面ヘッダーの日付サフィックス「○○植え付け」→「○○**開始**」
- 内部の変数名・データキー（`plantDate`）は維持（互換性のため）

### FB2：野菜マスタの育成方法分岐
- 「野菜を追加」ダイアログに**育成方法セレクト**を追加（`苗から` / `種（ポット）から` / `種（地植え）から`、値は`seedling`/`seed_pot`/`seed_ground`）
- 「野菜を追加」ダイアログに**参考URL入力欄**を追加（任意項目）
- `vegMaster[id]` データ構造に `growMethod` と `referenceUrl` フィールドを追加
- マスタ詳細画面に「栽培設定」ブロックを新設
- 「AIで生成」ボタンは現状モック（育成方法は反映済み、`referenceUrl`は保存のみで未使用）

## v24での変更点（今回のFB対応：完了機能の実装）

### 1. 完了機能を実装
**要件確認の経緯（チャットでの合意事項）**：
- 未完了タスクが残っていても**ブロックしない**。警告も出さない。理由：育成失敗・病気・台風被害などで途中撤収するケースが実態として多く、全タスク完了を条件にすると現実の運用に合わない。未完了タスクはそのまま記録として残る（後から「どこで力尽きたか」を振り返る材料にもなる）。
- 誤操作防止は「完了ボタンを2段階にする」「最終確認ダイアログを挟む」ことで担保する。

**実装したUIフロー**：
1. 管理画面ヘッダー行（「グリッドへ戻る」と同じ行）の右端に「管理の完了」ボタンを設置（`#btn-complete-manage`）
2. 押下すると作業ログタブ（`currentTab='log'`）が自動的に開く
3. 作業ログタブの冒頭に案内文を表示：「管理を完了する場合は内容を確認して下部の『この野菜の管理を完了』を押下してください。」（`.complete-notice`）
4. 既存の作業ログ内容（サマリー統計・全体メモ編集欄・作業履歴一覧）はそのまま表示。全体メモはこの画面で編集・保存可能（総括コメントとして機能）
5. タブ最下部に「この野菜の管理を完了」ボタンを設置（`.btn-complete-final`）
6. 押下すると確認ダイアログ（`#dlg-complete-confirm`）を表示。内容は以下の3点を明記：
   - 取り消せない
   - グリッドから消える（枠は未登録状態に戻る）
   - アーカイブに保存される
7. 「実行」（`#btn-complete-execute`）で確定処理。「キャンセル」または背景クリックで閉じる

**確定処理（`executeComplete(sid)`）の内容**：
- `pushUndo()`でUndoスタックに積む（Ctrl+Zで取り消し可能）
- `archivedSegs[segId]` にスナップショットを保存（下記データ構造参照）
- `cells` から該当区画の全セルを削除（`segId`が一致するキーを走査して削除）→ グリッドが未登録状態に解放される
- `actionLogs` / `harvestLogs` / `segSummaryMemo` / `segTasks` は**削除しない**。`segId`をキーとしたまま100%保持（完了済み一覧画面の実装時に`archivedSegs`経由でこれらを参照する設計）
- `saveLS()` でlocalStorageに保存後、`goBack()`でグリッド画面に戻る

**動作検証**：jsdomで以下を確認済み
- 完了実行でarchivedSegsにスナップショットが保存され、cellsから該当セルが消える
- actionLogs/harvestLogs/segSummaryMemoは削除されず保持される
- 未完了タスクが残っていてもブロックされず完了できる
- キャンセルでは何も変更されない
- Ctrl+Z（Undo）で完了操作そのものを取り消せる
- localStorageにarchivedSegsが正しく永続化される

### 2. 写真タブ → スコープアウト実施
- タブ一覧（`renderManage`内の`tabs`配列）から「写真」タブを削除済み
- `currentTab`が不正な値になった場合は`'roadmap'`にフォールバックする防御コードを追加

### 3. 既知の軽微な見た目の課題（今回は未対応、Code移行後に対応予定）
チャットでのFB（スクリーンショットで確認）：
- 「管理の完了」「この野菜の管理を完了」ボタンの先頭アイコン（Tabler Icons `ti-flag-check`）が、CDN読み込み失敗により**四角（tofu文字）として表示される**環境がある
- 同様に管理画面タブメニュー（ロードマップ・作業ログ・収量）のアイコンも同じ理由で四角表示になる
- 作業ログタブ冒頭の案内文（青枠・水色背景）は「認識レベルを下げたい」というFBがあり、枠なしのシンプルなテキスト表示が望ましい
- **対応方針**：Tabler Iconsのwebfont CDN依存はプロトタイプ環境固有の問題であり、コードの品質課題ではない。Claude Code移行時にアイコン表示方式（SVGインライン化、ローカルバンドル等）を抜本的に見直す際にまとめて対応する。今回（v24）は意図的にノータッチとした。

---

## 既知の課題・Claude Code移行時の実装事項

### 1. AIロードマップ生成のAPI実装
**現状**：`aiGenerate(vegId)` 関数はモック（`TOMATO_SAMPLE`をベースに改変するだけ）

**Claude Code移行後の実装方針**：
- サーバーサイド（Node.js等）からAnthropic APIを呼び出す形に変更
- 入力パラメータ：`veg.name`, `veg.family`, `veg.growMethod`, `veg.referenceUrl`
- 出力：`phases[]`配列（`majorStatus`/`name`/`period`/`tasks[]`）
- 種から育てる場合は「種まき」タスク（milestone空）＋「発芽確認」タスク（`milestone:'germination'`）を含める
- 苗から育てる場合は「定植」タスク（`milestone:'planting'`）を含める
- **教訓**：claude.ai Artifact内でのブラウザfetch→Anthropic APIは、システムプロンプトの渡し方やレスポンスのJSON切断（max_tokens不足等）で不安定。Claude Code側（バックエンド経由）であれば streaming や リトライ処理も組み込めるので、そちらでの実装が望ましい。

**参考：v23で試作したプロンプト骨子**
```
野菜名: {name}
科: {family}
育成方法: {苗から/種(ポット)から/種(地植え)から}
参考URL: {referenceUrl}

→ JSON形式でphases[]を生成
　- majorStatus: ready/growing/harvesting/done
  - 種の場合: 種まき(milestone無し) + 発芽確認(milestone:germination)
  - 苗の場合: 定植(milestone:planting)
  - フェーズ3〜5個、各タスク2〜5個
```

### 2. 写真タブ → スコープアウト確定（v24で対応済み）
- 写真機能はアプリのスコープから外す方針に確定。写真共有はグループLINEで運用する。
- v24でタブ一覧から削除済み。コード自体（`renderManage`内の旧photo分岐）は安全のためフォールバックとして簡略化した形で残っている程度で、実害はない。

### 3. 完了済み一覧画面の実装（次の実装対象。Claude Code移行後に着手）
**方針**：チャットで「Claude Code移行後の方が良い」と合意。理由は、完了機能（v24）でデータ構造（`archivedSegs`）が固まったため、ここで一区切りとしてCode移行し、安定した土台の上で実装するのが手戻りが少ないため。アイコン表示方式の見直しもこのタイミングで合わせて対応する。

**要件**：
- 導線：設定ボタンの**右横**に新規ボタンを配置（例：「完了済み一覧」）
- 一覧画面の内容：作業ログタブと同等のサマリー情報をリスト表示（`archivedSegs`の各エントリから）
- 一覧の各項目をタップ → 作業ログタブと同じ内容を**読み取り専用**で表示（`actionLogs[segId]`・`harvestLogs[segId]`・`segSummaryMemo[segId]`を`archivedSegs[segId].segId`経由で参照）
- ソート機能：作物順 / 作業開始日順、それぞれ昇順・降順を切替可能

**実装メモ**：
- `archivedSegs[segId]` には現状以下のフィールドを保持済み（v24実装）：
  `segId, cropId, cropName, family, variety, plantDate, completedDate, lastLogDate, workCount, harvestTotal, row, cols`
- 読み取り専用表示は、既存の`renderLogTab`をベースに、編集系のイベントリスナー（メモ保存・完了ボタン等）を外したバリエーションを作るのが効率的
- ソートは`archivedSegs`を配列化してから`cropName`または`plantDate`で`localeCompare`/文字列比較すればよい

### 4. アイコン表示方式の見直し（Claude Code移行後に着手）
- Tabler Iconsのwebfont（CDN経由）が環境によって読み込めず、アイコンが四角（tofu文字）で表示される事象を確認（v24完了機能のボタン・タブで発覚）
- 対応候補：SVGインライン化、アイコンのローカルバンドル、絵文字への統一など
- 範囲：今回FBがあった完了ボタン・タブメニューに限らず、設定・削除ボタン等アプリ全体のアイコンが同じCDN依存をしているため、見直す場合は全体方針として整理するのが望ましい

### 5. localStorageからDBへの移行
- Claude Code化のタイミングで本格的なバックエンド（DB）への移行を推奨
- 複数人（3名）での共有を実現するには必須（プロジェクト憲章参照）
- 現状の全データ構造はそのまま移植可能な設計（cells/segTasks/actionLogs/harvestLogs/segSummaryMemo/vegMaster/archivedSegs）

---

## データ構造（v24時点、localStorage）

```js
{
  cells: {
    "row,col": {
      segId: string,
      crop: string,      // vegMasterのID
      plantDate: string  // YYYY-MM-DD（表示ラベルは「作業開始日」、内部キー名は維持）
    }
  },
  COLS: number,
  ROWS: number,
  segTasks: { [segId]: { [taskId]: { done, skip, doneDates[], memo, url } } },
  actionLogs: { [segId]: [{ id, date, type:'task', task, cropId }] },
  harvestLogs: { [segId]: [{ id, date, amount, unit }] },
  segSummaryMemo: { [segId]: string },
  vegMaster: {
    [id]: {
      id, name, emoji, family, variety,
      iconFile,           // v22で追加（PNG画像ファイル名 or null）
      growMethod,         // v23で追加: 'seedling' | 'seed_pot' | 'seed_ground'
      referenceUrl,       // v23で追加: AI生成の参考URL（任意）
      phases: [{
        id, majorStatus, name, period,
        tasks: [{ id, name, desc, day, memo, url, milestone? }]
      }]
    }
  },
  archivedSegs: {          // v24で追加：完了済み区画のスナップショット
    [segId]: {
      segId: string,        // actionLogs/harvestLogs/segSummaryMemo/segTasksの参照キー（元のsegIdと同一）
      cropId: string,       // vegMasterのID
      cropName: string,
      family: string,
      variety: string,
      plantDate: string|null,
      completedDate: string,  // YYYY-MM-DD、完了操作を行った日
      lastLogDate: string|null,
      workCount: number,      // actionLogsの件数
      harvestTotal: string|null, // 例: "3個 / 500g"
      row: number,
      cols: number[]
    }
  }
}
```

---

## 今後の残タスク（優先順）
1. **Claude Codeへの移行** ← 次のステップ
2. 完了済み一覧画面の実装（Code移行後）
3. アイコン表示方式の見直し（Code移行後、webfont依存の解消）
4. AIで生成ボタンの本実装（Claude API呼び出し、育成方法・参考URL反映）
5. localStorageからDBへの移行（複数人共有のため必須）
6. 全野菜のロードマップ一括自動生成

---

## バージョン履歴メモ
- v1〜v9：グリッド基本機能・登録モード確立
- v10〜v15：管理画面・ロードマップ・作業ログ基盤
- v16〜v19：タブ整理・収量タブ・ログマージ
- v20〜v21：野菜マスタ画面・プリセット39種・設定パネル修正
- v22：野菜アイコンをPNG画像（Base64埋め込み）に差し替え（38種）
- v23：FB1（作業開始日への文言変更）／FB2（育成方法分岐・参考URL・AI生成モック改良）
- v24：完了機能を実装（archivedSegsへのスナップショット保存・グリッド解放）、写真タブのスコープアウト実施
- v25（見送り）：アイコン・注意書きの見た目FBが上がったが、Claude Code移行後にまとめて対応する方針となり今回はコード変更なし。v24が現行最新版。

---

## Claude Code移行時の運用Tips（過去の相談より）
- Chat（戦略・仕様議論）とCowork/Code（ファイル操作・実装）を使い分けるとトークン消費を抑えやすい
- 長くなった会話は適宜要約を依頼してコンテキストを圧縮するのが有効
- ファイル操作中心のタスクはSonnetで十分。Opusは複雑な設計判断が必要な場面に絞ると効率的
