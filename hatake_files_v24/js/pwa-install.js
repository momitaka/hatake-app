// @ts-check
// ===== ホーム画面追加（PWA化）導線 =====
// TSK-26: グリッド画面上部に常時帯を表示し、タップでOS別の追加方法を案内する。
// 自動ポップアップは初回登録直後だとタイミングが早すぎるとの判断で不採用（2026-07-07）。
// iOS（Safari含む全ブラウザ）はbeforeinstallpromptが発火しないため図解案内のみ。
// Android/Chrome系はネイティブのインストールプロンプトをタップ経由で呼び出す。
// LINE/Instagram等のアプリ内ブラウザは共有シート自体が使えない/挙動が異なるため、
// 「ブラウザで開く」への脱出導線を案内する。
import { LS_KEY } from './state.js';

const STRIP_HIDDEN_KEY = LS_KEY + '_pwaStripHidden';

/** @type {any} beforeinstallpromptイベント。ユーザー操作前にリスナー登録が必須なため読み込み時に捕捉する */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || /** @type {any} */ (navigator).standalone === true;
}
function isIOS() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}
function isAndroid() {
  return /Android/.test(navigator.userAgent);
}
function isIOSSafari() {
  const ua = navigator.userAgent;
  return isIOS() && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) && !getInAppBrowser();
}
/** @returns {'line'|'instagram'|'facebook'|null} */
function getInAppBrowser() {
  const ua = navigator.userAgent;
  if (/Line\//.test(ua)) return 'line';
  if (/Instagram/.test(ua)) return 'instagram';
  if (/FBAN|FBAV/.test(ua)) return 'facebook';
  return null;
}

/** @type {Record<'line'|'instagram'|'facebook', string>} */
const ESCAPE_COPY = {
  line: '画面右下の「…」をタップし、「他のアプリで開く」または「ブラウザで開く」を選んでください。',
  instagram: '画面右上の「…」をタップし、「ブラウザで開く」を選んでください。',
  facebook: '画面右上の「…」をタップし、「ブラウザで開く」を選んでください。',
};
const ANDROID_MENU_COPY = '画面右上の「⋮」メニューを開き、「アプリをインストール」または「ホーム画面に追加」をタップしてください。';
const IOS_OTHER_BROWSER_COPY = 'この機能はSafariでのみご利用いただけます。Safariで開き直してください。';

function showHowTo(/** @type {string} */ text) {
  const el = document.getElementById('dlg-pwa-howto-text');
  if (el) el.textContent = text;
  document.getElementById('dlg-pwa-howto').style.display = 'flex';
}
function showIOSDiagram() {
  document.getElementById('dlg-pwa-ios').style.display = 'flex';
}

function handleStripTap() {
  const inApp = getInAppBrowser();
  if (inApp) { showHowTo(ESCAPE_COPY[inApp]); return; }
  if (isAndroid()) {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
    } else {
      showHowTo(ANDROID_MENU_COPY);
    }
    return;
  }
  if (isIOSSafari()) { showIOSDiagram(); return; }
  if (isIOS()) { showHowTo(IOS_OTHER_BROWSER_COPY); return; }
}

export function updateStripVisibility() {
  const strip = document.getElementById('pwa-install-strip');
  if (!strip) return;
  const eligible = !isStandalone() && !localStorage.getItem(STRIP_HIDDEN_KEY) && (isIOS() || isAndroid());
  strip.style.display = eligible ? 'flex' : 'none';
}
updateStripVisibility();

document.getElementById('dlg-pwa-ios-close').addEventListener('click', () => { document.getElementById('dlg-pwa-ios').style.display = 'none'; });
document.getElementById('dlg-pwa-howto-close').addEventListener('click', () => { document.getElementById('dlg-pwa-howto').style.display = 'none'; });
document.getElementById('pwa-install-strip').addEventListener('click', handleStripTap);
document.getElementById('pwa-strip-hide').addEventListener('click', e => {
  e.stopPropagation();
  localStorage.setItem(STRIP_HIDDEN_KEY, '1');
  updateStripVisibility();
});
