// @ts-check
// ===== 天気表示（畑の位置の過去7日実績・今後7日予報） =====
// データ元: Open-Meteo（無料・APIキー不要）
import { farmMeta } from './state.js';
import { saveLS } from './storage.js';

const WEATHER_CACHE_KEY='hatake_weather_cache_v2';
const CACHE_MS=3*60*60*1000; // 3時間キャッシュ
const WEEKDAYS=['日','月','火','水','木','金','土'];

let expanded=false;

/** @param {number} code WMO weather code @returns {string} */
function weatherEmoji(code){
  if(code===0)return '☀️';
  if(code===1||code===2)return '🌤️';
  if(code===3)return '☁️';
  if(code===45||code===48)return '🌫️';
  if(code>=51&&code<=57)return '🌦️';
  if(code>=61&&code<=67)return '🌧️';
  if((code>=71&&code<=77)||code===85||code===86)return '🌨️';
  if(code===80||code===81||code===82)return '🌦️';
  if(code>=95)return '⛈️';
  return '🌡️';
}
/** @param {number} v @returns {string} */
function fmtPrecip(v){return v>0?(v<10?v.toFixed(1):Math.round(v))+'mm':'-';}

/** @typedef {{time:string[],precipitation_sum:number[],temperature_2m_max:number[],temperature_2m_min:number[],weathercode:number[]}} DailyWeather */
/** @typedef {{daily:DailyWeather,resolvedLat:number,resolvedLng:number}} WeatherResult */

/** @param {number} lat @param {number} lng @returns {Promise<WeatherResult|null>} */
async function fetchWeather(lat,lng){
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,weathercode&past_days=7&forecast_days=7&timezone=Asia%2FTokyo`;
  const res=await fetch(url);
  if(!res.ok)return null;
  const json=await res.json();
  if(!json.daily)return null;
  return {daily:json.daily,resolvedLat:json.latitude,resolvedLng:json.longitude};
}

/** @param {number} lat @param {number} lng @returns {Promise<WeatherResult|null>} */
async function getWeather(lat,lng){
  try{
    const cached=JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY)||'null');
    if(cached&&cached.lat===lat&&cached.lng===lng&&(Date.now()-cached.fetchedAt)<CACHE_MS){
      return cached.data;
    }
  }catch(e){}
  let data=null;
  try{data=await fetchWeather(lat,lng);}catch(e){console.error('weather fetch error',e);}
  if(data){
    try{localStorage.setItem(WEATHER_CACHE_KEY,JSON.stringify({lat,lng,fetchedAt:Date.now(),data}));}catch(e){}
  }
  return data;
}

function updateToggleIcon(){
  const icon=document.getElementById('weather-toggle-icon');
  if(icon)icon.className='ti '+(expanded?'ti-chevron-up':'ti-chevron-down');
}

/** @returns {Promise<{resolvedLat:number,resolvedLng:number}|null>} */
export async function renderWeatherBar(){
  const widget=document.getElementById('weather-widget');
  const detail=document.getElementById('weather-detail');
  if(!widget||!detail)return null;
  if(farmMeta.lat==null||farmMeta.lng==null){widget.style.display='none';return null;}
  const result=await getWeather(farmMeta.lat,farmMeta.lng);
  if(!result||!result.daily||!result.daily.time){widget.style.display='none';return null;}
  const data=result.daily;
  widget.style.display='block';
  const todayStr=new Date().toISOString().slice(0,10);
  let todayIdx=data.time.indexOf(todayStr);
  if(todayIdx<0)todayIdx=0;
  const pastTotal=data.precipitation_sum.slice(0,todayIdx).reduce((a,b)=>a+b,0);
  const futureTotal=data.precipitation_sum.slice(todayIdx).reduce((a,b)=>a+b,0);

  const summaryEmoji=document.getElementById('weather-summary-emoji');
  const summaryText=document.getElementById('weather-summary-text');
  if(summaryEmoji)summaryEmoji.textContent=weatherEmoji(data.weathercode[todayIdx]);
  if(summaryText)summaryText.textContent=`今日 ${Math.round(data.temperature_2m_max[todayIdx])}°/${Math.round(data.temperature_2m_min[todayIdx])}° ・ 過去7日 ${fmtPrecip(pastTotal)} ・ これから7日 ${fmtPrecip(futureTotal)}`;

  detail.innerHTML='';
  data.time.forEach((iso,i)=>{
    const d=new Date(iso+'T00:00:00');
    const isToday=i===todayIdx;
    const cell=document.createElement('div');
    cell.className='weather-day'+(isToday?' weather-day-today':'');
    cell.innerHTML=`<div class="weather-day-label">${WEEKDAYS[d.getDay()]}<br>${d.getMonth()+1}/${d.getDate()}</div>`+
      `<div class="weather-day-emoji">${weatherEmoji(data.weathercode[i])}</div>`+
      `<div class="weather-day-precip">${fmtPrecip(data.precipitation_sum[i])}</div>`+
      `<div class="weather-day-temp">${Math.round(data.temperature_2m_max[i])}°/${Math.round(data.temperature_2m_min[i])}°</div>`;
    detail.appendChild(cell);
  });
  detail.style.display=expanded?'flex':'none';
  updateToggleIcon();
  if(expanded){
    requestAnimationFrame(()=>{
      const todayEl=detail.querySelector('.weather-day-today');
      if(todayEl)todayEl.scrollIntoView({inline:'center',block:'nearest'});
    });
  }
  return {resolvedLat:result.resolvedLat,resolvedLng:result.resolvedLng};
}

document.getElementById('weather-summary')?.addEventListener('click',()=>{
  expanded=!expanded;
  const detail=document.getElementById('weather-detail');
  if(detail)detail.style.display=expanded?'flex':'none';
  updateToggleIcon();
  if(expanded&&detail){
    requestAnimationFrame(()=>{
      const todayEl=detail.querySelector('.weather-day-today');
      if(todayEl)todayEl.scrollIntoView({inline:'center',block:'nearest'});
    });
  }
});

// ===== 設定：畑の位置（緯度経度）入力 =====
document.getElementById('btn-weather-geolocate')?.addEventListener('click',()=>{
  const status=document.getElementById('weather-loc-status');
  if(!navigator.geolocation){if(status)status.textContent='この端末では位置情報を取得できません';return;}
  if(status)status.textContent='取得中…';
  navigator.geolocation.getCurrentPosition(pos=>{
    /** @type {HTMLInputElement} */ (document.getElementById('s-weather-lat')).value=pos.coords.latitude.toFixed(4);
    /** @type {HTMLInputElement} */ (document.getElementById('s-weather-lng')).value=pos.coords.longitude.toFixed(4);
    if(status)status.textContent='取得しました。「保存」を押してください';
  },()=>{
    if(status)status.textContent='取得できませんでした（位置情報の利用許可をご確認ください）';
  },{timeout:10000});
});

document.getElementById('btn-save-weather-loc')?.addEventListener('click',async()=>{
  const latVal=parseFloat(/** @type {HTMLInputElement} */ (document.getElementById('s-weather-lat')).value);
  const lngVal=parseFloat(/** @type {HTMLInputElement} */ (document.getElementById('s-weather-lng')).value);
  farmMeta.lat=isNaN(latVal)?null:latVal;
  farmMeta.lng=isNaN(lngVal)?null:lngVal;
  saveLS();
  const status=document.getElementById('weather-loc-status');
  if(status)status.textContent='保存しました。天気を取得中…';
  const result=await renderWeatherBar();
  if(status){
    status.textContent=result?`保存しました（取得地点: 緯度${result.resolvedLat.toFixed(2)} / 経度${result.resolvedLng.toFixed(2)}。入力値に最も近いデータ地点です）`:'保存しました';
  }
});
