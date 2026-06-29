const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Header, Footer, PageBreak, ExternalHyperlink
} = require('docx');
const fs = require('fs');

const W = 9026; // A4 content width
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cm = { top: 80, bottom: 80, left: 120, right: 120 };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: 'Arial', ...opts })]
  });
}
function sp() { return new Paragraph({ spacing: { before: 120 }, children: [] }); }
function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })]
  });
}
function callout(text, color = 'EAF3DE', borderColor = '5aad4e', textColor = '27500A') {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    border: { left: { style: BorderStyle.SINGLE, size: 16, color: borderColor, space: 8 } },
    indent: { left: 400 },
    children: [new TextRun({ text, bold: true, size: 24, font: 'Arial', color: textColor })]
  });
}
function tbl(headers, rows, widths) {
  const hrow = new TableRow({
    tableHeader: true,
    children: headers.map((t, i) => new TableCell({
      borders, width: { size: widths[i], type: WidthType.DXA }, margins: cm,
      shading: { fill: 'EAF3DE', type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 20, font: 'Arial' })] })]
    }))
  });
  const drows = rows.map(r => new TableRow({
    children: r.map((t, i) => new TableCell({
      borders, width: { size: widths[i], type: WidthType.DXA }, margins: cm,
      children: [new Paragraph({ children: [new TextRun({ text: t, size: 20, font: 'Arial' })] })]
    }))
  }));
  return new Table({ width: { size: widths.reduce((a,b)=>a+b,0), type: WidthType.DXA }, columnWidths: widths, rows: [hrow, ...drows] });
}

const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] },
    ]
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, color: '2E7A28', font: 'Arial' },
        paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C0DD97', space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, color: '3B6D11', font: 'Arial' },
        paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'C0DD97', space: 4 } },
        children: [
          new TextRun({ text: 'hatake（畑管理アプリ）', size: 18, font: 'Arial', color: '5aad4e', bold: true }),
          new TextRun({ text: '\tGemini向けブリーフィング資料', size: 18, font: 'Arial', color: '888780' }),
        ],
        tabStops: [{ type: 'right', position: W }]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: '- ', size: 18, font: 'Arial', color: '888780' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial', color: '888780' }),
          new TextRun({ text: ' -', size: 18, font: 'Arial', color: '888780' })]
      })] })
    },
    children: [

      // ── Title page ──────────────────────────────────────
      new Paragraph({ spacing: { before: 560, after: 80 },
        children: [new TextRun({ text: 'hatake', bold: true, size: 72, font: 'Arial', color: '2E7A28' })] }),
      new Paragraph({ spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: '畑管理アプリ', size: 36, font: 'Arial', color: '5aad4e' })] }),
      new Paragraph({ spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: 'Gemini向けブリーフィング資料', size: 26, font: 'Arial', color: '888780' })] }),
      new Paragraph({ spacing: { before: 0, after: 600 },
        children: [new TextRun({ text: '2026年6月', size: 20, font: 'Arial', color: 'B4B2A9' })] }),

      callout('このドキュメントはGeminiがhatakeのマーケティング支援（LP作成・コピーライティング・ユーザー獲得施策）を行うために必要なすべての文脈をまとめたブリーフィング資料です。'),
      sp(),

      // ── 1. プロジェクトの背景とストーリー ─────────────
      new Paragraph({ children: [new PageBreak()] }),
      h1('1. プロジェクトの背景とストーリー'),

      h2('なぜこのアプリを作ったか'),
      p('作者は週1回（土曜日のみ）畑に通う家庭菜園ユーザー。3人のメンバーで複数の作物を並行栽培しているが、「今日何をすべきか」を毎回その場で考えなければならず、貴重な土曜日の時間が調べ物や段取りで削られていた。'),
      p('1年間の実体験から「脳内管理には限界がある」と痛感し、自分たちのために作り始めたのがhatake。既存の農業アプリは農家向けで複雑すぎる。家庭菜園に特化したシンプルな「作業ナビ」が欲しかった。'),
      sp(),

      callout('「土曜日に畑に立った瞬間、3人全員が迷わず最適な一手を打てる状態」を作るために開発した。'),
      sp(),

      h2('解決している課題'),
      tbl(
        ['課題', '解決策'],
        [
          ['週1回しか行けない → 段取りを忘れる', 'ロードマップ＋ネクストアクションが常に表示される'],
          ['複数作物の生育ステージを把握できない', 'グリッド形式で全区画の状態を一覧表示'],
          ['現地で調べ物に時間を取られる', '事前に栽培知識・タスク・メモを登録しておける'],
          ['メンバー間で情報共有できない', 'Supabase DB経由でリアルタイム共有'],
        ],
        [4000, 5026]
      ),
      sp(),

      // ── 2. アプリの価値提案 ────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      h1('2. アプリの価値提案'),

      h2('一言で言うと'),
      callout('家庭菜園の「作業ナビ」。畑に着いたら開くだけで、今日やるべきことがわかる。'),
      sp(),

      h2('3つのコアバリュー'),
      tbl(
        ['バリュー', '説明', 'ユーザーが感じること'],
        [
          ['迷わない', 'ネクストアクションを自動表示。考えなくていい。', '「今日何するか」が即わかる'],
          ['見渡せる', 'グリッドで全作物の状態を一目で把握', '「あの野菜どうだったっけ」がなくなる'],
          ['記録が残る', '作業ログ・収量・メモが積み上がる', '来年の栽培に活かせる'],
        ],
        [2200, 3800, 3026]
      ),
      sp(),

      h2('競合・代替手段との違い'),
      tbl(
        ['手段', '問題点', 'hatakeの優位性'],
        [
          ['農業アプリ（既存）', '農家向けで高機能すぎる。家庭菜園には過剰', 'シンプル・モバイルファースト'],
          ['メモ帳・ノート', '一覧性がなく、タスク管理ができない', 'ロードマップ自動生成'],
          ['LINEグループ', '流れてしまう。検索できない', '構造化されたデータとして蓄積'],
          ['カレンダーアプリ', '野菜ごとのフェーズ管理ができない', 'グリッド×ステータス管理'],
        ],
        [2400, 3400, 3226]
      ),
      sp(),

      // ── 3. ターゲットユーザー像 ────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      h1('3. ターゲットユーザー像'),

      h2('プライマリターゲット'),
      tbl(
        ['項目', '内容'],
        [
          ['属性', '30〜50代・家庭菜園歴1〜5年・スマホ利用に慣れている'],
          ['栽培規模', '5〜20種類を並行栽培。週末のみ管理。'],
          ['悩み', '「何をいつすればいいかわからなくなる」「週1回で間に合うか不安」'],
          ['モチベーション', '食の安全・節約・趣味・家族との共有'],
          ['デジタル行動', 'YouTube で栽培動画を見る。農薬・肥料は調べながら対応。'],
        ],
        [2400, 6626]
      ),
      sp(),

      h2('ペルソナ例'),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        shading: { fill: 'F5FAF0', type: ShadingType.CLEAR },
        border: { top: border, bottom: border, left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, right: border },
        children: []
      }),
      new Paragraph({
        spacing: { before: 60, after: 20 },
        indent: { left: 200 },
        children: [new TextRun({ text: '田中さん（42歳・会社員・埼玉）', bold: true, size: 22, font: 'Arial', color: '2E7A28' })]
      }),
      ...[
        '週末だけ畑に通う。トマト・きゅうり・なす・ピーマンなど10種類を栽培。',
        '「先週何やったっけ？」「このトマト今どのフェーズ？」が毎回わからなくなる。',
        'YouTubeで「トマト 追肥 タイミング」などを検索しながら作業している。',
        '奥さんと一緒に畑に行くが、二人で「今日何する？」と毎回相談している。',
      ].map(t => new Paragraph({ spacing: { before: 20, after: 20 }, indent: { left: 200 },
        children: [new TextRun({ text: '• ' + t, size: 20, font: 'Arial', color: '444441' })] })),
      sp(),

      // ── 4. ブランドアイデンティティ ───────────────────
      new Paragraph({ children: [new PageBreak()] }),
      h1('4. ブランドアイデンティティ'),

      h2('世界観・トーン'),
      tbl(
        ['要素', '方針'],
        [
          ['トーン', 'やさしく・頼れる・シンプル。難しい農業用語を使わない。'],
          ['世界観', '「畑仕事が楽しくなる道具」。デジタルツールだけど土のにおいがするような温かさ。'],
          ['避けること', '農家向けの専門的・硬い表現。「スマート農業」「DX」などのビジネス語。'],
          ['目指す印象', '「ちょうど良い。これでいい。」というシンプルさ。'],
        ],
        [2200, 6826]
      ),
      sp(),

      h2('ビジュアルアイデンティティ'),
      tbl(
        ['要素', '内容'],
        [
          ['メインカラー', '#5aad4e（野菜グリーン）'],
          ['背景色', '#f5faed（薄グリーン）'],
          ['アクセント', 'ステータス別：準備中=オレンジ / 生育中=グリーン / 収穫中=イエロー / 完了=グレー'],
          ['アイコン', '野菜の水彩イラスト（38種）。やわらかいタッチ。'],
          ['フォント', 'システムフォント。読みやすさ優先。'],
        ],
        [2200, 6826]
      ),
      sp(),

      h2('コピーの方向性（参考）'),
      bullet('「今週の畑、迷わず動ける。」'),
      bullet('「植えた日から、収穫まで。全部記録してくれる。」'),
      bullet('「週1回の畑時間を、もっと楽しく。」'),
      bullet('「3人で共有、1つの畑。」'),
      sp(),

      // ── 5. 現状のアプリ ────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      h1('5. 現状のアプリ'),

      h2('アクセス'),
      p('本番URL：'),
      new Paragraph({ spacing: { before: 40, after: 40 }, indent: { left: 300 },
        children: [new ExternalHyperlink({
          link: 'https://momitaka.github.io/hatake-app/hatake_v24.html',
          children: [new TextRun({ text: 'https://momitaka.github.io/hatake-app/hatake_v24.html', style: 'Hyperlink', size: 22, font: 'Arial' })]
        })]
      }),
      p('※ スマートフォンで開くことを推奨（モバイルファースト設計）', { color: '888780', italics: true }),
      sp(),

      h2('主要画面'),
      tbl(
        ['画面', '説明'],
        [
          ['TOP / グリッド画面', '畑全体をグリッドで表示。下部に「管理中の作物リスト」でネクストアクションと作業開始日を一覧表示。'],
          ['管理画面', '区画をタップすると開く。基礎知識・ロードマップ・収量・作業ログの4タブ。'],
          ['野菜マスタ', '登録済み野菜の栽培タスク・フェーズを確認・編集できる。'],
          ['アーカイブ', '管理完了した作物の記録を閲覧できる。'],
        ],
        [2600, 6426]
      ),
      sp(),

      h2('現在の利用状況'),
      bullet('作者本人と家族2名の計3名が実際に利用中'),
      bullet('15区画・10種類以上の作物を管理'),
      bullet('Supabase DBでリアルタイム共有済み'),
      sp(),

      // ── 6. フェーズ3タスク依頼 ────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      h1('6. Geminiへの依頼タスク（フェーズ3）'),

      h2('フェーズ3の目標'),
      callout('LP作成 → 実ユーザーに使ってもらいフィードバック収集 → YouTuber紹介', 'EAF3DE', '5aad4e', '27500A'),
      sp(),

      h2('タスク1：LP（ランディングページ）の構成案と文章'),
      p('LPの目的：家庭菜園ユーザーにhatakeを知ってもらい、実際に使ってみてもらう。'),
      sp(),
      p('依頼内容：', { bold: true }),
      bullet('LPの構成案（セクション順・見出し・訴求ポイント）'),
      bullet('各セクションのコピー文案（ヒーローコピー・サブコピー・CTAテキスト）'),
      bullet('「誰のためのアプリか」が伝わるファーストビューのコピー'),
      bullet('FAQ案（よくある疑問と回答）'),
      sp(),
      p('参考にしてほしい情報：', { bold: true }),
      bullet('本資料 1〜4章（背景・価値提案・ターゲット・ブランド）'),
      bullet('競合：既存農業アプリ（農薬カレンダー系）は難しすぎるという認識でOK'),
      sp(),

      h2('タスク2：実ユーザー獲得のためのアプローチ文案'),
      p('目的：身近な家庭菜園ユーザーや、ネット上のコミュニティ（Twitter/X・InstagramのDM・家庭菜園フォーラム）にシェアしてもらうための文章。'),
      sp(),
      p('依頼内容：', { bold: true }),
      bullet('SNS（X / Instagram）投稿文案（短文2〜3パターン）'),
      bullet('家庭菜園コミュニティ向けの紹介文（フォーラム・グループ向け、少し丁寧な文体）'),
      bullet('知人への口コミ依頼メッセージ（LINE・メール想定）'),
      sp(),

      h2('タスク3（後フェーズ）：YouTuberアプローチ戦略'),
      p('目的：家庭菜園系YouTuberにhatakeを紹介してもらい、リーチとフィードバックを得る。'),
      sp(),
      p('依頼内容（時期が来たら依頼）：', { bold: true }),
      bullet('アプローチすべきYouTuberのリストアップ基準'),
      bullet('コラボ依頼メールのテンプレート文'),
      bullet('紹介動画で伝えてほしいポイントの整理'),
      sp(),

      // ── 7. Geminiへの作業ルール ────────────────────────
      h1('7. Geminiへの作業ガイドライン'),
      tbl(
        ['項目', 'ガイドライン'],
        [
          ['言語', '日本語。ですます調（LP）とフラットな口語（SNS）を使い分ける。'],
          ['トーン', '親しみやすく、でも信頼できる。農業の専門家ではなく「同じ畑好き」の視点で。'],
          ['避けるワード', '「DX」「スマート農業」「革新」「最先端」。家庭菜園に合わない。'],
          ['推奨ワード', '「週末」「土曜日」「家族」「楽しむ」「シンプル」「迷わない」「記録」'],
          ['確認が必要な場合', 'アプリのURLを直接開いて確認可能。不明点は質問してください。'],
        ],
        [2400, 6626]
      ),
      sp(),
      p('以上がブリーフィング内容です。タスク1（LP構成案と文章）から着手してください。', { bold: true, color: '2E7A28' }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/Users/momi/Desktop/hatake_gemini_brief.docx', buf);
  console.log('Done: hatake_gemini_brief.docx');
});
