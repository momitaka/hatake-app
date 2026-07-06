// @ts-check
// ===== 天気表示（畑の位置の過去7日実績・今後7日予報） =====
// データ元: Open-Meteo（無料・APIキー不要）
import { farmMeta } from './state.js';
import { saveLS } from './storage.js';

const WEATHER_CACHE_KEY='hatake_weather_cache';
const CACHE_MS=3*60*60*1000; // 3時間キャッシュ
const WEEKDAYS=['日','月','火','水','木','金','土'];

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

/** @typedef {{time:string[],precipitation_sum:number[],temperature_2m_max:number[],temperature_2m_min:number[],weathercode:number[]}} DailyWeather */

/** @param {number} lat @param {number} lng @returns {Promise<DailyWeather|null>} */
async function fetchWeather(lat,lng){
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,weathercode&past_days=7&forecast_days=7&timezone=Asia%2FTokyo`;
  const res=await fetch(url);
  if(!res.ok)return null;
  const json=await res.json();
  return json.daily||null;
}

/** @param {number} lat @param {number} lng @returns {Promise<DailyWeather|null>} */
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

export async function renderWeatherBar(){
  const wrap=document.getElementById('weather-bar');
  if(!wrap)return;
  if(farmMeta.lat==null||farmMeta.lng==null){wrap.style.display='none';return;}
  const data=await getWeather(farmMeta.lat,farmMeta.lng);
  if(!data||!data.time){wrap.style.display='none';return;}
  const todayStr=new Date().toISOString().slice(0,10);
  wrap.innerHTML='';
  wrap.style.display='flex';
  data.time.forEach((iso,i)=>{
    const d=new Date(iso+'T00:00:00');
    const isToday=iso===todayStr;
    const cell=document.createElement('div');
    cell.className='weather-day'+(isToday?' weather-day-today':'');
    const precip=data.precipitation_sum[i];
    const precipDisp=precip>0?(precip<10?precip.toFixed(1):Math.round(precip))+'mm':'-';
    cell.innerHTML=`<div class="weather-day-label">${WEEKDAYS[d.getDay()]}<br>${d.getMonth()+1}/${d.getDate()}</div>`+
      `<div class="weather-day-emoji">${weatherEmoji(data.weathercode[i])}</div>`+
      `<div class="weather-day-precip">${precipDisp}</div>`+
      `<div class="weather-day-temp">${Math.round(data.temperature_2m_max[i])}°/${Math.round(data.temperature_2m_min[i])}°</div>`;
    wrap.appendChild(cell);
  });
  requestAnimationFrame(()=>{
    const todayEl=wrap.querySelector('.weather-day-today');
    if(todayEl)todayEl.scrollIntoView({inline:'center',block:'nearest'});
  });
}

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

document.getElementById('btn-save-weather-loc')?.addEventListener('click',()=>{
  const latVal=parseFloat(/** @type {HTMLInputElement} */ (document.getElementById('s-weather-lat')).value);
  const lngVal=parseFloat(/** @type {HTMLInputElement} */ (document.getElementById('s-weather-lng')).value);
  farmMeta.lat=isNaN(latVal)?null:latVal;
  farmMeta.lng=isNaN(lngVal)?null:lngVal;
  saveLS();
  renderWeatherBar();
  const status=document.getElementById('weather-loc-status');
  if(status)status.textContent='保存しました';
});
