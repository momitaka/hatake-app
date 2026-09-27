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

// 育成方法・作期・地域の選択肢。栽培レシピ詳細の編集セレクト・一覧の表示ラベルの両方で使う。
export const GROW_METHOD_OPTIONS=[{v:'seedling',l:'苗から'},{v:'seed_pot',l:'種（ポット）から'},{v:'seed_ground',l:'種（地植え）から'}];
export const SEASON_OPTIONS=[{v:'spring',l:'春まき'},{v:'summer',l:'夏まき'},{v:'autumn',l:'秋まき'},{v:'winter',l:'冬まき'},{v:'year_round',l:'通年'}];
export const REGION_OPTIONS=[{v:'cool',l:'冷涼地'},{v:'middle',l:'中間地'},{v:'warm',l:'暖地'}];
/** @param {{v:string,l:string}[]} options @param {string|undefined} value @returns {string} */
export function optionLabel(options,value){const o=options.find(o=>o.v===value);return o?o.l:'';}

// 地域別見通しスケジュール（regional_schedule）関連の定数・ヘルパー。
// TSK-65: 工程表(phases)とは別枠で、地域区分ごとの絶対的な時期の見通しを示す機能。
export const SCHEDULE_EVENT_OPTIONS=[{v:'soil_prep',l:'土づくり'},{v:'sowing',l:'種まき'},{v:'planting',l:'定植'},{v:'harvest',l:'収穫'}];
export const MONTH_PART_OPTIONS=[{v:'early',l:'上旬'},{v:'mid',l:'中旬'},{v:'late',l:'下旬'}];
export const SCHEDULE_CONSTRAINT_TYPE_OPTIONS=[{v:'min_soil_temp',l:'発芽最低地温(℃)'},{v:'max_air_temp',l:'高温阻害(℃以上)'},{v:'min_air_temp',l:'低温注意(℃以下)'},{v:'frost_end',l:'初霜で収穫終了'}];
/** @param {{month?:number,part?:string}|undefined} mp @returns {string} 「4月中旬」のように月+旬を表示用に整形する。month未設定なら空文字 */
export function monthPartLabel(mp){if(!mp||!mp.month)return '';return mp.month+'月'+(mp.part?optionLabel(MONTH_PART_OPTIONS,mp.part):'');}
/** @param {{before?:{month?:number,part?:string},from?:{month?:number,part?:string},to?:{month?:number,part?:string}}|undefined} ev @returns {string} 期限型「◯月上旬までに」・期間型「◯月中旬〜◯月上旬」を整形する。未設定イベントは空文字 */
export function formatScheduleEvent(ev){
  if(!ev)return '';
  if(ev.before)return monthPartLabel(ev.before)?monthPartLabel(ev.before)+'までに':'';
  const fromLabel=monthPartLabel(ev.from),toLabel=monthPartLabel(ev.to);
  if(!fromLabel&&!toLabel)return '';
  return fromLabel+(toLabel?'〜'+toLabel:'');
}
/** @param {string} growMethod @returns {{sowing:boolean,planting:boolean}} 育成方法（直まき/苗定植/育苗定植）に応じた種まき・定植イベントの出し分け。soil_prep/harvestは常に対象（harvestは必須、soil_prepはレシピ単位の任意） */
export function scheduleEventVisibility(growMethod){
  if(growMethod==='seed_ground')return{sowing:true,planting:false}; // 直まき：種まき＝定植なので定植は出さない
  if(growMethod==='seed_pot')return{sowing:true,planting:true}; // 育苗して定植：両方出す
  return{sowing:false,planting:true}; // seedling（苗から）：種まきは出さない
}

export const FAMILIES={'ナス科':{border:'#D85A30',bg:'#FAECE7'},'ウリ科':{border:'#639922',bg:'#EAF3DE'},'マメ科':{border:'#378ADD',bg:'#E6F1FB'},'アブラナ科':{border:'#EF9F27',bg:'#FAEEDA'},'ヒガンバナ科':{border:'#7F77DD',bg:'#EEEDFE'},'セリ科':{border:'#BA7517',bg:'#F5EAD8'},'キク科':{border:'#D4537E',bg:'#FBEAF0'},'シソ科':{border:'#1A9988',bg:'#E3F4F2'},'アオイ科':{border:'#C0873F',bg:'#F8EFDF'},'その他':{border:'#9C9A93',bg:'#F1EFE8'}};
export const MAJOR_STATUS=[{id:'ready',name:'準備中',color:'#854F0B',bg:'#FAEEDA'},{id:'growing',name:'生育中',color:'#27500A',bg:'#d4f0b8'},{id:'harvesting',name:'収穫中',color:'#633806',bg:'#fdf5b0'},{id:'done',name:'完了',color:'#444441',bg:'#F1EFE8'}];
// 工程表のフェーズ帯タイムライン用の配色。フェーズ名やフェーズ数はレシピごとに異なるため、
// veg.phasesの配列インデックスに対して循環的に割り当てる（インデックスが同じでも野菜が違えば別フェーズを指す）
export const PHASE_COLORS=['#B98A4A','#9CC168','#3F9E88','#E8973D','#A9A79E','#7C9CC9','#C97C9C','#8AA6A3'];
/** @param {string} name @returns {string} フェーズ名末尾の「フェーズ」を除去する（AI生成レシピは名称に「フェーズ」を含むことがあり、タイムラインや凡例で重複表示されて冗長になるため） */
export function stripPhaseSuffix(name){return name&&name.endsWith('フェーズ')?name.slice(0,-4):name;}
export const UNITS=['個','g','kg','袋','束','本'];
export const SIZE_LABELS=['小','中','大','過大','不良'];


/** @type {Array<{emoji:string,iconFile:string|null,isCustom?:boolean}>} */
export const ALL_ICONS=PRESET_VEGS.map(p=>({emoji:p.emoji,iconFile:p.iconFile||null})).concat([{emoji:'🌱',iconFile:null},{emoji:'🍀',iconFile:null},{emoji:'🌾',iconFile:null},{emoji:'🥜',iconFile:null},{emoji:'🍄',iconFile:null},{emoji:'🌰',iconFile:null}]);

export const TOMATO_SAMPLE={
  id:'tomato',name:'トマト',emoji:'🍅',family:'ナス科',variety:'',growMethod:'seedling',
  regionalSchedule:{
    cool:{soil_prep:{before:{month:4,part:'early'}},planting:{from:{month:5,part:'mid'},to:{month:6,part:'early'}},harvest:{from:{month:7,part:'late'},to:{month:9,part:'late'}}},
    middle:{soil_prep:{before:{month:3,part:'mid'}},planting:{from:{month:4,part:'mid'},to:{month:5,part:'early'}},harvest:{from:{month:6,part:'late'},to:{month:9,part:'mid'}}},
    warm:{soil_prep:{before:{month:3,part:'early'}},planting:{from:{month:4,part:'early'},to:{month:4,part:'mid'}},harvest:{from:{month:6,part:'mid'},to:{month:9,part:'early'}}},
    constraints:[
      {applies_to:'planting',type:'min_soil_temp',value:15,note:'地温15℃以上を確認してから定植する'},
      {applies_to:'harvest',type:'max_air_temp',value:35,note:'35℃を超えると着果不良になりやすい'},
    ],
  },
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
