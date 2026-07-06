// @ts-check
// ===== スプラッシュ画面 =====
import { farmMeta } from './state.js';

(function(){
  const QUOTES = {
    spring: [
      '「種を蒔く者は、必ず刈り取る。」',
      '「春の土は、夢を育てる。丁寧に耕せば、必ず答えてくれる。」',
      '「一粒の種に、百の可能性が宿っている。」',
      '「急いで育てようとするな。植物は人間より時間の使い方を知っている。」',
    ],
    summer: [
      '「夏の汗は、秋の実りの肥やしになる。」',
      '「草に負けるな。雑草も必死に生きている。だが、畑は渡さない。」',
      '「水やりを怠れば、植物は問いかけてくる。声なき声を聞け。」',
      '「太陽と土と、そして農家の愛情。それが野菜を育てる三つの力。」',
    ],
    autumn: [
      '「収穫は結果ではなく、始まりである。」',
      '「秋に学べ。実るほど頭を垂れる稲穂のように。」',
      '「土に感謝を。今年も恵みをありがとう。」',
      '「豊作の年も不作の年も、土は正直に教えてくれる。」',
    ],
    winter: [
      '「冬の畑は眠っているのではない。次の春を準備している。」',
      '「休む勇気が、翌年の豊作をつくる。」',
      '「土を休ませることは、土地への投資である。」',
      '「冬こそ、農家が賢くなる季節。」',
    ],
  };
  const MONTH_INFO = [
    {emoji:'❄️',label:'睦月（1月）',season:'winter'},
    {emoji:'🌸',label:'如月（2月）',season:'winter'},
    {emoji:'🌱',label:'弥生（3月）',season:'spring'},
    {emoji:'🌷',label:'卯月（4月）',season:'spring'},
    {emoji:'🍀',label:'皐月（5月）',season:'spring'},
    {emoji:'☔',label:'水無月（6月）',season:'summer'},
    {emoji:'🌻',label:'文月（7月）',season:'summer'},
    {emoji:'🌞',label:'葉月（8月）',season:'summer'},
    {emoji:'🍂',label:'長月（9月）',season:'autumn'},
    {emoji:'🍁',label:'神無月（10月）',season:'autumn'},
    {emoji:'🌾',label:'霜月（11月）',season:'autumn'},
    {emoji:'⛄',label:'師走（12月）',season:'winter'},
  ];
  const month = new Date().getMonth();
  const info = MONTH_INFO[month];
  const quotes = QUOTES[info.season];
  const quote = quotes[Math.floor(Math.random()*quotes.length)];

  document.getElementById('splash-month-emoji').textContent = info.emoji;
  document.getElementById('splash-month-label').textContent = info.label;
  document.getElementById('splash-quote').textContent = quote;

  // スプラッシュ画像: config の splashImage が指定されていれば優先、なければ月別画像
  const img = /** @type {HTMLImageElement} */ (document.getElementById('splash-img'));
  const ph = document.getElementById('splash-placeholder');
  const cfgSplash = window.APP_CONFIG && window.APP_CONFIG.splashImage;
  if(cfgSplash) {
    img.src = cfgSplash;
    img.onload = ()=>{ img.style.display='block'; ph.style.display='none'; };
    img.onerror = ()=>{ img.style.display='none'; ph.style.display='flex'; };
  } else {
    const monthStr = String(month+1).padStart(2,'0');
    img.src = 'images/splash_'+monthStr+'.png';
    img.onload = ()=>{ img.style.display='block'; ph.style.display='none'; };
    img.onerror = ()=>{ img.style.display='none'; ph.style.display='flex'; };
  }

  // 農園名: ユーザー設定の farmMeta.name → config のアプリ名 → デフォルト
  const nameEl = document.getElementById('splash-farm-name');
  const cfgAppName = (window.APP_CONFIG && window.APP_CONFIG.appName) || '私の畑';
  nameEl.textContent = farmMeta.name || cfgAppName;

  // タップでフェードアウト
  const _splash=document.getElementById('splash-screen');
  function _closeSplash(){_splash.style.opacity='0';setTimeout(()=>_splash.style.display='none',600);}
  if(new URLSearchParams(location.search).get('skip_splash')){_splash.style.display='none';}
  else{_splash.addEventListener('touchend',e=>{e.preventDefault();_closeSplash();},{once:true,passive:false});_splash.addEventListener('click',_closeSplash,{once:true});setTimeout(_closeSplash,2000);}
})();
