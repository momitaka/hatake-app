// @ts-check
// ===== 共通ヘルパー・マスタデータ =====
import { masterData } from './state.js';

/** アイコン表示ヘルパー: iconFileがあれば\<img\>、なければ絵文字にフォールバック
 * @param {{id?: string, iconFile?: string|null, emoji?: string}} veg @param {number} [size] @returns {string} */
export function vegIconHtml(veg, size) {
  size = size || 18;
  if (!veg) return '';
  var preset = PRESET_VEGS.find(function(p){return p.id===veg.id;});
  var iconFile = veg.iconFile || (preset ? preset.iconFile : null) || null;
  var src = iconFile ? (ICON_B64[iconFile] || masterData.customIcons[iconFile] || null) : null;
  if (src) {
    return '<img src="'+src+'" width="'+size+'" height="'+size+'" style="object-fit:contain;vertical-align:middle;flex-shrink:0;mix-blend-mode:multiply">';
  }
  return '<span style="font-size:'+(Math.round(size*0.9))+'px;line-height:1">'+(veg.emoji||'')+'</span>';
}

export const FAMILIES={'ナス科':{border:'#D85A30',bg:'#FAECE7'},'ウリ科':{border:'#639922',bg:'#EAF3DE'},'マメ科':{border:'#378ADD',bg:'#E6F1FB'},'アブラナ科':{border:'#EF9F27',bg:'#FAEEDA'},'ヒガンバナ科':{border:'#7F77DD',bg:'#EEEDFE'},'セリ科':{border:'#BA7517',bg:'#F5EAD8'},'キク科':{border:'#D4537E',bg:'#FBEAF0'},'シソ科':{border:'#1A9988',bg:'#E3F4F2'},'アオイ科':{border:'#C0873F',bg:'#F8EFDF'},'その他':{border:'#9C9A93',bg:'#F1EFE8'}};
export const MAJOR_STATUS=[{id:'ready',name:'準備中',color:'#854F0B',bg:'#FAEEDA'},{id:'growing',name:'生育中',color:'#27500A',bg:'#d4f0b8'},{id:'harvesting',name:'収穫中',color:'#633806',bg:'#fdf5b0'},{id:'done',name:'完了',color:'#444441',bg:'#F1EFE8'}];
export const UNITS=['個','g','kg','袋','束','本'];


/** @type {Array<{emoji:string,iconFile:string|null,isCustom?:boolean}>} */
export const ALL_ICONS=PRESET_VEGS.map(p=>({emoji:p.emoji,iconFile:p.iconFile||null})).concat([{emoji:'🌱',iconFile:null},{emoji:'🍀',iconFile:null},{emoji:'🌾',iconFile:null},{emoji:'🥜',iconFile:null},{emoji:'🍄',iconFile:null},{emoji:'🌰',iconFile:null}]);

export const TOMATO_SAMPLE={
  id:'tomato',name:'トマト',emoji:'🍅',family:'ナス科',variety:'',
  phases:[
    {id:'p0',majorStatus:'ready',name:'準備期',period:'〜14日',tasks:[
      {id:'t1',name:'土づくり・堆肥投入',desc:'植付け2週間前',day:0,memo:'完熟堆肥を20L/㎡程度投入し深く耕す',url:''},
      {id:'t2',name:'支柱の準備',desc:'長さ1.5m以上推奨',day:7,memo:'210cm以上の支柱が理想',url:''},
      {id:'t3',name:'苗の購入・選定',desc:'本葉4〜5枚が目安',day:12,memo:'根張りが良く茎が太いものを選ぶ',url:''},
    ]},
    {id:'p1',majorStatus:'growing',name:'定植・活着期',period:'15〜30日',tasks:[
      {id:'t4',name:'定植（植付け）',desc:'株間50cm確保',day:14,memo:'深植えにせず根鉢を崩さないよう注意',url:'',milestone:'planting'},
      {id:'t5',name:'仮支柱立て',desc:'風で倒れないよう',day:15,memo:'主茎を8の字結びで固定',url:''},
      {id:'t6',name:'活着確認・水やり',desc:'土が乾いたら充分に',day:21,memo:'新葉が展開していれば活着成功',url:'',milestone:'germination'},
    ]},
    {id:'p2',majorStatus:'growing',name:'生育・誘引期',period:'31〜70日',tasks:[
      {id:'t7',name:'わき芽かき',desc:'週1回、第1花房下まで',day:28,memo:'第1花房より下のわき芽は全て除去',url:''},
      {id:'t8',name:'誘引（茎を支柱へ）',desc:'伸びたら都度固定',day:35,memo:'8の字結びで余裕を持たせて固定',url:''},
      {id:'t9',name:'追肥（1回目）',desc:'定植2週間後から開始',day:42,memo:'化成肥料を株元から15cm離して施す',url:''},
      {id:'t10',name:'受粉補助',desc:'花を軽く揺らす',day:50,memo:'午前中に花房を軽く叩いて振動を与える',url:''},
    ]},
    {id:'p3',majorStatus:'harvesting',name:'着果・収穫期',period:'71〜100日',tasks:[
      {id:'t11',name:'着色確認',desc:'赤くなったら収穫サイン',day:70,memo:'全体の8割が赤くなったら収穫適期',url:''},
      {id:'t12',name:'収穫',desc:'ヘタ上でカット',day:75,memo:'ヘタの少し上をハサミでカット',url:'',milestone:'harvest_start'},
      {id:'t13',name:'収穫記録',desc:'個数・重量をメモ',day:75,memo:'',url:''},
    ]},
    {id:'p4',majorStatus:'done',name:'撤収',period:'101日〜',tasks:[
      {id:'t14',name:'株の撤去',desc:'根ごと引き抜く',day:100,memo:'病気の株は畑に残さず処分',url:''},
      {id:'t15',name:'支柱・マルチ片付け',desc:'洗浄して保管',day:101,memo:'',url:''},
      {id:'t16',name:'土づくり（次作準備）',desc:'堆肥・石灰を投入',day:105,memo:'次作まで2週間以上空ける',url:''},
    ]},
  ]
};
