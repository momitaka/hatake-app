const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Header, Footer, PageBreak
} = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, font: 'Arial' })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, font: 'Arial' })]
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, font: 'Arial' })]
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: 'Arial', ...opts })]
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })]
  });
}
function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 4 } },
    spacing: { before: 200, after: 200 },
    children: []
  });
}
function tableHeader(texts, widths) {
  return new TableRow({
    tableHeader: true,
    children: texts.map((t, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      margins: cellMargins,
      shading: { fill: 'EAF3DE', type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 20, font: 'Arial' })] })]
    }))
  });
}
function tableRow(cells, widths) {
  return new TableRow({
    children: cells.map((t, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      margins: cellMargins,
      children: [new Paragraph({ children: [new TextRun({ text: t, size: 20, font: 'Arial' })] })]
    }))
  });
}
function tbl(headers, rows, widths) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: [tableHeader(headers, widths), ...rows.map(r => tableRow(r, widths))]
  });
}

const doc = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 600, hanging: 300 } } } }]
    }]
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, color: '2E7A28', font: 'Arial' },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, color: '3B6D11', font: 'Arial' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, color: '27500A', font: 'Arial' },
        paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 4 } },
          children: [
            new TextRun({ text: '畑管理アプリ（hatake）', size: 18, font: 'Arial', color: '888780' }),
            new TextRun({ text: '\tユーザー仕様書 v0.1（案）', size: 18, font: 'Arial', color: '888780' }),
          ],
          tabStops: [{ type: 'right', position: 9026 }]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: '- ', size: 18, font: 'Arial', color: '888780' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial', color: '888780' }),
            new TextRun({ text: ' -', size: 18, font: 'Arial', color: '888780' }),
          ]
        })]
      })
    },
    children: [

      // ── Title ──────────────────────────────────────────
      new Paragraph({
        spacing: { before: 480, after: 80 },
        children: [new TextRun({ text: '畑管理アプリ（hatake）', bold: true, size: 52, font: 'Arial', color: '2E7A28' })]
      }),
      new Paragraph({
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: 'ユーザー仕様書 v0.1（案）', size: 28, font: 'Arial', color: '5aad4e' })]
      }),
      new Paragraph({
        spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: '2026年6月　作成', size: 20, font: 'Arial', color: '888780' })]
      }),
      divider(),

      // ── 1. アプリ概要 ──────────────────────────────────
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('1. アプリ概要')] }),
      p('家庭菜園の栽培管理を一元化するモバイルWebアプリ。グリッド形式の畑レイアウトで区画ごとに作物を登録し、ロードマップタスク・収量・作業ログを管理できる。管理者と閲覧者の権限分離により、家族・パートナーとのデータ共有にも対応する。'),
      new Paragraph({ spacing: { before: 120, after: 60 }, children: [] }),
      tbl(
        ['項目', '内容'],
        [
          ['プラットフォーム', 'モバイルWeb（PWA非対応、ブラウザのみ）'],
          ['技術スタック', 'シングルHTMLファイル（SPA）/ Supabase（DB）/ GitHub Pages（ホスティング）'],
          ['対象デバイス', 'スマートフォン優先（iPhone Safari / Android Chrome）'],
          ['オフライン', '非対応（要ネット接続）'],
          ['バージョン', 'v24（現行）'],
        ],
        [3000, 6026]
      ),
      new Paragraph({ spacing: { before: 240 }, children: [] }),

      // ── 2. 対象ユーザー ────────────────────────────────
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('2. 対象ユーザー')] }),
      tbl(
        ['ユーザー種別', '説明', '権限'],
        [
          ['管理者', '畑のオーナー。データ登録・編集・削除が可能', '全機能'],
          ['閲覧者', '家族・パートナーなど。データの参照のみ', '読み取り専用'],
        ],
        [2400, 4800, 1826]
      ),
      new Paragraph({ spacing: { before: 120, after: 80 }, children: [] }),
      p('管理者認証はパスワード入力により localStorage に管理者フラグを保持する。認証情報はサーバーに送信されない。'),
      new Paragraph({ spacing: { before: 240 }, children: [] }),

      // ── 3. 画面構成 ────────────────────────────────────
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('3. 画面構成')] }),
      tbl(
        ['画面ID', '画面名', '概要'],
        [
          ['screen-register', 'TOP / グリッド画面', '畑のグリッドと管理中の作物リストを表示するホーム画面'],
          ['screen-manage', '管理画面', '選択した区画の詳細（タブ切り替え）を表示'],
          ['screen-master', '野菜マスタ画面', '登録済み野菜の一覧と詳細・タスク編集'],
          ['screen-archive', 'アーカイブ画面', '管理完了した作物の履歴一覧'],
          ['screen-settings', '設定画面', 'グリッドサイズ・農場名・管理者認証'],
        ],
        [2200, 2600, 4226]
      ),
      new Paragraph({ spacing: { before: 240 }, children: [] }),

      // ── 4. 機能仕様 ────────────────────────────────────
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('4. 機能仕様')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.1 グリッド管理')] }),
      bullet('最大20行×20列のグリッドで畑レイアウトを可視化'),
      bullet('区画をドラッグ選択して作物・品種・作業開始日を登録'),
      bullet('複数セルをまたぐセグメント（畝）に対応'),
      bullet('通路行・列の設定が可能'),
      bullet('ステータスは自動算出（準備中 / 生育中 / 収穫中 / 完了）'),
      new Paragraph({ spacing: { before: 120 }, children: [] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.2 管理中の作物リスト（TOPリスト）')] }),
      bullet('全管理中区画をカード形式で一覧表示'),
      bullet('各カード：作物名・ステータスチップ・進捗バー・ネクストアクション・作業開始日'),
      bullet('ネクストアクション：最後に完了したタスクの次の未完了タスクを自動表示'),
      bullet('作業開始日：plantDate 優先、未設定の場合は最古のタスク完了日にフォールバック'),
      new Paragraph({ spacing: { before: 120 }, children: [] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.3 管理画面（区画詳細）')] }),
      p('タブ構成：基礎知識 / ロードマップ / 収量 / 作業ログ'),
      new Paragraph({ spacing: { before: 80 }, children: [] }),
      tbl(
        ['タブ', '機能'],
        [
          ['基礎知識', '野菜ごとの栽培知識・品種メモ・マイルストーン日付（発芽・初収穫）を表示'],
          ['ロードマップ', 'フェーズ別タスク一覧。チェックで完了記録、日付チップで実施日管理'],
          ['収量', '収穫量の記録・一覧（日付・量・単位）'],
          ['作業ログ', 'タスク完了日・収穫記録をタイムライン表示。管理完了・削除操作'],
        ],
        [2000, 7026]
      ),
      new Paragraph({ spacing: { before: 120, after: 80 }, children: [] }),
      bullet('ヘッダーに作業開始日チップを表示（管理者のみタップ編集可能）'),
      bullet('undo（取り消し）機能を1段階サポート'),
      new Paragraph({ spacing: { before: 120 }, children: [] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.4 野菜マスタ')] }),
      bullet('登録済み野菜の一覧をサイドリストで表示'),
      bullet('詳細エリアにフェーズ・タスク（名称・説明・日数・メモ・参考URL）を表示'),
      bullet('管理者はタスク内容・日数を編集可能（カスタマイズ対応）'),
      bullet('野菜の新規追加・削除（管理者のみ）'),
      new Paragraph({ spacing: { before: 120 }, children: [] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.5 アーカイブ')] }),
      bullet('管理完了した作物を自動保存'),
      bullet('完了時のグリッドスナップショット・統計（栽培期間・収量）を表示'),
      bullet('アーカイブからの詳細閲覧に対応'),
      new Paragraph({ spacing: { before: 240 }, children: [] }),

      // ── 5. ステータス仕様 ──────────────────────────────
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('5. ステータス仕様')] }),
      p('ステータスはロードマップのフェーズ進捗から自動算出される。手動変更は不可。'),
      new Paragraph({ spacing: { before: 80 }, children: [] }),
      tbl(
        ['ステータス', '背景色', 'テキスト色', 'コントラスト比', '条件'],
        [
          ['準備中', '#FAEEDA', '#854F0B', '5.4:1（AA合格）', '準備フェーズが進行中'],
          ['生育中', '#d4f0b8', '#27500A', '7.2:1（AA合格）', '生育・誘引フェーズが進行中'],
          ['収穫中', '#fdf5b0', '#633806', '5.1:1（AA合格）', '着果・収穫フェーズが進行中'],
          ['完了', '#F1EFE8', '#444441', '7.8:1（AA合格）', '撤収フェーズ完了'],
        ],
        [1400, 1600, 1600, 2200, 2226]
      ),
      new Paragraph({ spacing: { before: 80 }, children: [] }),
      p('※ WCAG 2.1 AA基準（4.5:1以上）に準拠', { color: '888780', italics: true }),
      new Paragraph({ spacing: { before: 240 }, children: [] }),

      // ── 6. 権限マトリクス ──────────────────────────────
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('6. 権限マトリクス')] }),
      tbl(
        ['機能', '管理者', '閲覧者'],
        [
          ['グリッド閲覧', '○', '○'],
          ['区画登録・削除', '○', '×'],
          ['タスク完了・日付記録', '○', '×'],
          ['収量記録', '○', '×'],
          ['作業開始日の編集', '○', '×'],
          ['野菜マスタ編集', '○', '×'],
          ['管理完了・アーカイブ', '○', '×'],
          ['設定変更（農場名・グリッドサイズ）', '○', '×'],
          ['アーカイブ閲覧', '○', '○'],
        ],
        [5000, 2000, 2026]
      ),
      new Paragraph({ spacing: { before: 240 }, children: [] }),

      // ── 7. データ設計（概要） ──────────────────────────
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('7. データ設計（概要）')] }),
      p('データは Supabase（PostgreSQL）に保存され、localStorage をキャッシュとして使用する。データは1ユーザー1農場（シングルテナント）。'),
      new Paragraph({ spacing: { before: 80 }, children: [] }),
      tbl(
        ['データ種別', '内容'],
        [
          ['cells', 'グリッドの各セル情報（作物ID・segId・作業開始日）'],
          ['segTasks', '区画×タスクの完了状態・実施日履歴'],
          ['harvestLogs', '区画ごとの収穫記録（日付・量・単位）'],
          ['actionLogs', '作業ログ（タイムライン表示用）'],
          ['vegMaster', 'カスタム野菜マスタ（プリセット＋ユーザー追加）'],
          ['archivedSegs', '管理完了した区画のスナップショット'],
          ['farmName / farmIcon', '農場名・アイコン設定'],
        ],
        [2400, 6626]
      ),
      new Paragraph({ spacing: { before: 240 }, children: [] }),

      // ── 8. UI/UXガイドライン ───────────────────────────
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('8. UI/UXガイドライン')] }),
      tbl(
        ['項目', '仕様'],
        [
          ['フォントサイズ変数', '--fs-xs:10px / --fs-sm:12px / --fs-base:14px / --fs-md:16px / --fs-lg:20px'],
          ['背景色', '#f5faed（薄グリーン）'],
          ['メインカラー', '#5aad4e（グリーン帯・ボタン）'],
          ['角丸', 'border-radius 変数で統一（md:8px / lg:12px）'],
          ['モバイル高さ', 'height:100dvh（動的ビューポート対応）'],
          ['アクセシビリティ', 'ステータスチップ色はWCAG AA基準準拠'],
          ['入力ズーム防止', 'input font-size:16px !important（iOS Safari対策）'],
        ],
        [3000, 6026]
      ),
      new Paragraph({ spacing: { before: 240 }, children: [] }),

      // ── 9. 今後の課題（TBD） ───────────────────────────
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('9. 今後の課題（TBD）')] }),
      bullet('マルチユーザー対応（現在はシングルテナント）'),
      bullet('プッシュ通知（タスクリマインダー）'),
      bullet('PWA対応（オフラインキャッシュ）'),
      bullet('写真添付機能（作業ログへの画像追加）'),
      bullet('天気API連携'),
      bullet('データエクスポート（CSV / PDF）'),
      new Paragraph({ spacing: { before: 240 }, children: [] }),

      // ── PAGE BREAK ─────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),

      // ── 10. プロジェクト検証（TBD） ────────────────────
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('10. プロジェクト憲章')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('10.1 現状と課題（As-Is）')] }),
      bullet('週1日稼働の厳しい時間制約：基本的に週末（土曜日のみ）の週1回しか畑に行けないため、現地での一分一秒を無駄にせず、極めて効率よく迷いなく作業を消化する必要がある。'),
      bullet('栽培管理の複雑化と手遅れリスク：複数の作物を大量に並行栽培しており、生育ステージが五月雨式に進行するため、いつ・何をすべきかのタスク管理が脳内だけで完結しなくなっている。週1日のタイミングを逃すと、対応が後手に回るリスク（ダウンタイム）が高い。'),
      bullet('現地でのタイムロス：畑（現地）に行ってから野菜の状態を見て、その場で調べ物や対応策を考えているため、貴重な土曜日の作業時間が削られてしまっている。'),
      new Paragraph({ spacing: { before: 120 }, children: [] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('10.2 目指す姿（To-Be）')] }),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: '5aad4e', space: 8 } },
        indent: { left: 400 },
        children: [new TextRun({ text: '「土曜日に畑に立った瞬間、3人のメンバー全員が迷わず最適な一手（作業）を打てる状態」の実現', bold: true, size: 22, font: 'Arial', color: '27500A' })]
      }),
      bullet('記憶や判断の認知負荷を0にし、限られた時間の中で、農作業の細かいタスクや段取りが把握できて、スムーズに消化できる体制を作る。'),
      new Paragraph({ spacing: { before: 120 }, children: [] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('10.3 スコープ')] }),
      tbl(
        ['区分', '内容', '判断根拠'],
        [
          ['対象（In）', 'グリッド管理・ロードマップ・タスク記録・収量記録・作業ログ', '認知負荷軽減・判断支援に直結'],
          ['対象外（Out）', '写真共有・軽い現地記録', '「タイムロス削減」目的からスコープアウト。写真はグループLINEで運用'],
        ],
        [1600, 4200, 3226]
      ),
      new Paragraph({ spacing: { before: 120 }, children: [] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('10.4 ステークホルダー')] }),
      tbl(
        ['役割', '人数', '利用シーン'],
        [
          ['管理者（オーナー）', '1名', 'データ登録・編集・管理全般。平日の更新も担う'],
          ['閲覧者（メンバー）', '2名', '土曜日の現地作業前の確認・ネクストアクション把握'],
        ],
        [2400, 1600, 5026]
      ),
      new Paragraph({ spacing: { before: 120 }, children: [] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('10.5 設計上の重要判断')] }),
      tbl(
        ['判断', '内容'],
        [
          ['マルチデバイス共有の必須化', '「3人全員が」迷わない状態が目標のため、localStorage単体では不十分。平日の更新が土曜当日に全端末へ反映される必要がある。これがSupabase（DB）化を採用した最大の動機。'],
          ['写真機能のスコープアウト', '「現地タイムロス削減」が目的であり、写真共有はアプリに求めない。グループLINEで代替運用。'],
          ['ロードマップ・タスク管理の優先', '「迷わず一手を打てる」が目的のため、装飾的な機能より判断支援機能を最優先で磨き込む。'],
          ['途中撤収を許容する設計', '育成失敗・病気・台風被害などの途中撤収が実態として多い。全タスク完了を完了条件にしない。'],
        ],
        [2800, 6226]
      ),
      new Paragraph({ spacing: { before: 240 }, children: [] }),

      // ── PAGE BREAK ─────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),

      // ── 11. WBS（TBD） ─────────────────────────────────
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('11. WBS（後付け予定）')] }),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'FAC775', space: 4 },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'FAC775', space: 4 },
          left: { style: BorderStyle.SINGLE, size: 4, color: 'FAC775', space: 4 },
          right: { style: BorderStyle.SINGLE, size: 4, color: 'FAC775', space: 4 },
        },
        children: [new TextRun({ text: '📋 このセクションは別途追加予定です。想定記載内容：フェーズ別タスク・担当・期限・依存関係', size: 20, font: 'Arial', color: '854F0B' })]
      }),
      new Paragraph({ spacing: { before: 80 }, children: [] }),
      tbl(
        ['フェーズ', '主なタスク', '状況'],
        [
          ['フェーズ1\nコア機能開発', 'グリッド管理・ロードマップ・収量記録・作業ログ', '完了'],
          ['フェーズ2\nUX改善', 'TOPリスト改善・野菜マスタ改善・アクセシビリティ対応', '完了'],
          ['フェーズ3\nマーケティング', '仕様書整備・LP作成・ユーザーテスト', '進行中'],
          ['フェーズ4\n機能拡張', '通知・写真・マルチユーザー・エクスポート', '未着手'],
        ],
        [2200, 4800, 2026]
      ),
      new Paragraph({ spacing: { before: 80 }, children: [] }),
      p('※ 詳細なタスク分解・スケジュール・担当割り当ては別途記載予定', { color: '888780', italics: true }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/Users/momi/Desktop/hatake_user_spec_v01.docx', buf);
  console.log('Done: hatake_user_spec_v01.docx');
});
