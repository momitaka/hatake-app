// @ts-check
// ===== ステージ別の適温ゾーンの判定（試作・ナスのみ） =====
// 基礎知識マスタの basic_info.tempZones に入れる数値から、「適温の範囲」の表示文と、
// 気温が今その範囲のどこにいるかの判定を作る。範囲の表示と現在の判定を同じ数値から作ることで、両者が食い違わないようにする。
// 適温は日平均((最高+最低)/2)で見る。障害域は出典に限界温度がある野菜だけ limit に持ち、
// 天気(weather.js)の日次の最高(dayMax)・最低(nightMin)、または日平均(meanMin/meanMax)と直接比べる。limitが無ければ障害域の判定はしない(低め/適温/高めの3段階)。
// 発芽は「適温の外でも、発芽できる範囲(meanMin〜meanMax)の中なら、時間はかかるが発芽する」ので、範囲の外だけを障害域にする。

/** @typedef {{optMin:number,optMax:number}} TempZone */
/** 1ステージの範囲。limit=昼の最高気温がdayMax超、夜の最低気温がnightMin未満、日平均がmeanMin未満またはmeanMax超なら障害域 */
/** @typedef {{dayMax?:number,nightMin?:number,meanMin?:number,meanMax?:number}} TempLimit */
/** @typedef {{mean:TempZone,limit?:TempLimit,note?:string}} StageTempZones */
/** @typedef {{germination?:StageTempZones,growth?:StageTempZones}} TempZones */
/** @typedef {'danger-low'|'low'|'optimal'|'high'|'danger-high'} TempLevel */
/** @typedef {{max:number,min:number}} DailyTemp */
/** @typedef {{level:TempLevel,mean:number}} StageJudgement */

/** @param {number} value @param {TempZone} zone @returns {'low'|'optimal'|'high'} */
export function judgeTemp(value,zone){
  if(value<zone.optMin)return 'low';
  if(value<=zone.optMax)return 'optimal';
  return 'high';
}

/** @param {StageTempZones|null|undefined} stage @param {DailyTemp} t @returns {StageJudgement|null} 範囲を持たないステージはnull。複数の限界を越えたら高温側を優先する */
export function judgeStage(stage,t){
  if(!stage||!stage.mean)return null;
  const mean=(t.max+t.min)/2;
  const lim=stage.limit;
  if(lim&&((lim.dayMax!=null&&t.max>lim.dayMax)||(lim.meanMax!=null&&mean>lim.meanMax)))return {level:'danger-high',mean};
  if(lim&&((lim.nightMin!=null&&t.min<lim.nightMin)||(lim.meanMin!=null&&mean<lim.meanMin)))return {level:'danger-low',mean};
  return {level:judgeTemp(mean,stage.mean),mean};
}

/** @param {StageTempZones|null|undefined} stage @returns {string} 「日平均20〜30℃が適温（昼35℃超・夜10℃未満は障害域）」のような表示文。範囲が無ければ空文字 */
export function formatStageZones(stage){
  if(!stage||!stage.mean)return '';
  const limits=[];
  if(stage.limit?.dayMax!=null)limits.push(`昼${stage.limit.dayMax}℃超`);
  if(stage.limit?.nightMin!=null)limits.push(`夜${stage.limit.nightMin}℃未満`);
  if(stage.limit?.meanMin!=null)limits.push(`日平均${stage.limit.meanMin}℃未満`);
  if(stage.limit?.meanMax!=null)limits.push(`日平均${stage.limit.meanMax}℃超`);
  return `日平均${stage.mean.optMin}〜${stage.mean.optMax}℃が適温`+(limits.length?`（${limits.join('・')}は障害域）`:'');
}

/** ナスの試作データ。適温は東北交配種苗「まき時早見表」(果菜類)、障害域の境界は長野県「野菜栽培指標」の限界温度。
 * 長野県は昼の最高限界30〜40℃・夜の最低温度10〜13℃と幅で示すため、赤(障害域)は幅の外側寄り(昼は中央の35℃、夜は低い側の10℃)に置き、幅の中は黄色(低め/高め)に倒す
 * @type {TempZones} */
export const EGGPLANT_TEMP_ZONES_SAMPLE={
  germination:{mean:{optMin:20,optMax:30},note:'発芽は地温の影響が大きい。気温は目安。'},
  growth:{
    mean:{optMin:20,optMax:30},
    limit:{dayMax:35,nightMin:10},
    note:'適温は東北交配種苗、障害域の境界は長野県「野菜栽培指標」による。出典によって数値に幅がある。',
  },
};

/** ニンジンの試作データ（種から育てる野菜の例）。発芽の適温と発芽できる範囲はタキイ種苗の栽培マニュアル、生育の適温は東北交配種苗。
 * 発芽は適温の外でも8〜30℃なら時間がかかるが発芽するため、範囲の外(8℃未満・30℃超)だけを障害域にする
 * @type {TempZones} */
export const CARROT_TEMP_ZONES_SAMPLE={
  germination:{
    mean:{optMin:15,optMax:25},
    limit:{meanMin:8,meanMax:30},
    note:'15〜20℃で8〜10日、10℃で14日。5℃では30日以上かかるか発芽率が下がる。35℃以上ではほとんど発芽しない。',
  },
  growth:{mean:{optMin:15,optMax:25}},
};
