// @ts-check
// ===== ホーム画面追加（PWA化）導線 =====
// TSK-26: 初回の区画登録完了直後に、OS/ブラウザに応じた追加導線を一度だけ出す。
// iOS（Safari含む全ブラウザ）はbeforeinstallpromptが発火しないため図解案内のみ。
// Android/Chrome系はネイティブのインストールプロンプトをボタン経由で呼び出す。
// LINE/Instagram等のアプリ内ブラウザは共有シート自体が使えない/挙動が異なるため、
// 先に「ブラウザで開く」への脱出導線を出し、脱出後の再訪でiOS図解を出す。
import { LS_KEY } from './state.js';

const SHOWN_KEY = LS_KEY + '_pwaPromptShown';
const ESCAPE_SHOWN_KEY = LS_KEY + '_pwaEscapeShown';

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

function showEscapeGuide(/** @type {'line'|'instagram'|'facebook'} */ app) {
  const el = document.getElementById('dlg-pwa-escape-text');
  if (el) el.textContent = ESCAPE_COPY[app];
  document.getElementById('dlg-pwa-escape').style.display = 'flex';
  localStorage.setItem(ESCAPE_SHOWN_KEY, '1');
}
function showIOSDiagram() {
  document.getElementById('dlg-pwa-ios').style.display = 'flex';
  localStorage.setItem(SHOWN_KEY, '1');
}
function showAndroidBanner() {
  document.getElementById('pwa-install-banner').style.display = 'flex';
}

/** 初回区画登録の直後に呼ぶ。表示済み/対象外なら何もしない。 */
export function maybeShowInstallPrompt() {
  if (isStandalone()) return;
  const inApp = getInAppBrowser();
  if (inApp) {
    if (!localStorage.getItem(ESCAPE_SHOWN_KEY)) showEscapeGuide(inApp);
    return;
  }
  if (localStorage.getItem(SHOWN_KEY)) return;
  if (deferredPrompt) { showAndroidBanner(); return; }
  if (isIOSSafari()) { showIOSDiagram(); return; }
}

document.getElementById('dlg-pwa-ios-close').addEventListener('click', () => { document.getElementById('dlg-pwa-ios').style.display = 'none'; });
document.getElementById('dlg-pwa-escape-close').addEventListener('click', () => { document.getElementById('dlg-pwa-escape').style.display = 'none'; });
document.getElementById('pwa-banner-dismiss').addEventListener('click', () => {
  document.getElementById('pwa-install-banner').style.display = 'none';
  localStorage.setItem(SHOWN_KEY, '1');
});
document.getElementById('pwa-banner-install').addEventListener('click', async () => {
  document.getElementById('pwa-install-banner').style.display = 'none';
  localStorage.setItem(SHOWN_KEY, '1');
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
});
