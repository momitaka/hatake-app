// @ts-check
// ===== v25: Supabase Auth =====
// コラボ版（freeDataStrategy='session'）のみ動作
// 個人版（default）は従来の管理者パスワード方式のまま
import { SUPABASE_URL, SUPABASE_ANON_KEY, permState, LS_KEY } from './state.js';
import { marketAuth, saveToDB, loadFromDB } from './db.js';
import { _dataStrategy } from './storage.js';
import { _applyLoadedData } from './data-loading.js';

(function(){
  if(_dataStrategy !== 'session') return; // 個人版はスキップ

  // supabase-js クライアント初期化
  const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window._sbClient = _sb;

  // 別タブ（メールのマジックリンクから開いたタブ等）でログイン/ログアウトすると、
  // supabase-jsがセッションをlocalStorageに書き込む。その変化をこのタブでも検知して
  // 自動的に再読み込みし、手動リロードしなくてもログイン状態が反映されるようにする
  window.addEventListener('storage', (e) => {
    if(e.key && e.key.includes('auth-token')) {
      window.location.reload();
    }
  });

  // ── Auth状態の変化を監視 ──────────────────────────────
  _sb.auth.onAuthStateChange(async (event, session) => {
    if(session && session.user) {
      // ログイン済み
      const user = session.user;
      await _onUserLogin(user, session.access_token);
    } else {
      // ログアウト or 未ログイン
      window.APP_SUBSCRIBED = false;
      _updateAuthUI(null, false);
    }
  });

  // ── ログイン後の処理 ──────────────────────────────────
  // v25シナリオ2: 「ログイン＝会員＝サブスク」。usersにレコードがある＝会員。
  // Stripe決済連携（フェーズ5）が完了するまでは、ここでusersを自動作成しない
  // （決済なしの無料会員を作らないため。channel_idによる絞り込みも廃止）。
  async function _onUserLogin(user, accessToken) {
    try {
      const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      };
      const res = await fetch(
        SUPABASE_URL + '/rest/v1/users?auth_uid=eq.' + user.id + '&select=id,role,cancel_at',
        {headers}
      );
      const rows = await res.json();

      if(!rows || rows.length === 0) {
        // 会員登録（サブスク決済）が完了していない
        permState.isAdmin = false;
        permState.isSupervisor = false;
        window.APP_SUBSCRIBED = false;
        marketAuth.userId = null;
        marketAuth.accessToken = null;
        document.body.classList.add('view-mode');
        _updateAuthUI(user, false, null);
      } else {
        const row = rows[0];
        permState.isAdmin = (row.role === 'platform_admin');
        permState.isSupervisor = (row.role === 'youtuber_supervisor' || permState.isAdmin);
        window.APP_SUBSCRIBED = true; // usersに行がある＝会員
        marketAuth.userId = row.id;
        marketAuth.accessToken = accessToken;
        if(permState.isAdmin) {
          document.body.classList.remove('view-mode','supervisor-mode');
          document.body.classList.add('admin-mode');
        } else if(permState.isSupervisor) {
          document.body.classList.remove('view-mode','admin-mode');
          document.body.classList.add('supervisor-mode');
        } else {
          document.body.classList.remove('admin-mode','supervisor-mode');
          document.body.classList.add('view-mode');
        }
        _updateAuthUI(user, true, row.cancel_at);
        // 既存のクラウドデータがあればそちらを優先して表示。
        // 無ければ（初めての会員登録）お試し中のセッションデータを初回移行する
        const loaded = await loadFromDB();
        if(loaded) {
          _applyLoadedData(true);
        } else {
          await _migrateSessionToCloud();
        }
      }
    } catch(e) {
      console.error('Auth user check error', e);
    }
  }

  // ── sessionStorage → Supabase へのデータ移行 ──────────
  // 初めて会員になったタイミングでのみ呼ばれる（既存クラウドデータは上書きしない）
  async function _migrateSessionToCloud() {
    const raw = sessionStorage.getItem(LS_KEY);
    if(!raw) return;
    try {
      const data = JSON.parse(raw);
      if(!data || !data.cells || Object.keys(data.cells).length === 0) return;
      await saveToDB(data);
      console.log('[v25] session data migrated to Supabase');
    } catch(e) {
      console.error('Data migration error', e);
    }
  }

  // ── Auth UI 更新 ──────────────────────────────────────
  function _updateAuthUI(user, isMember, cancelAt) {
    const emailForm  = document.getElementById('auth-email-form');
    const sentMsg    = document.getElementById('auth-sent-msg');
    const loggedIn   = document.getElementById('auth-loggedin');
    const userEmail  = document.getElementById('auth-user-email');
    const subStatus  = document.getElementById('auth-sub-status');
    const saveBanner = document.getElementById('save-banner');

    // ヘッダーの常設アカウントアイコン：状態が一目でわかるようにクラスを切り替える
    const headerIcon = document.getElementById('account-header-icon');
    if(headerIcon) {
      headerIcon.className = user ? (isMember ? 'ti ti-user-check' : 'ti ti-user-exclamation') : 'ti ti-user';
    }

    if(user) {
      // ログイン済み表示
      if(emailForm) emailForm.style.display = 'none';
      if(sentMsg)   sentMsg.style.display   = 'none';
      if(loggedIn)  loggedIn.style.display  = 'block';
      if(userEmail) userEmail.textContent   = user.email || '';
      if(subStatus) {
        if(isMember && cancelAt) {
          const d = new Date(cancelAt).toLocaleDateString('ja-JP');
          subStatus.innerHTML = '<span style="color:#9c9a93">'+d+'まで利用可能（解約予約済み）</span>';
        } else if(isMember) {
          subStatus.innerHTML = '<span style="color:#2e7a28;font-weight:600">✓ 会員（サブスク有効）</span>';
        } else {
          subStatus.innerHTML = '<span style="color:#9c9a93">会員登録（サブスク決済）が完了していません</span>';
        }
      }
      // 会員ならバナーを隠す
      if(saveBanner && isMember) saveBanner.style.display = 'none';
    } else {
      // 未ログイン
      if(emailForm) emailForm.style.display = 'block';
      if(sentMsg)   sentMsg.style.display   = 'none';
      if(loggedIn)  loggedIn.style.display  = 'none';
    }
  }

  // ── 公開関数（HTMLから呼び出し） ─────────────────────
  window.openAuthModal = function() {
    const dlg = document.getElementById('dlg-auth');
    if(!dlg) return;
    // 現在のログイン状態に応じてUI切り替え
    _sb.auth.getSession().then(({data:{session}}) => {
      if(session) {
        _updateAuthUI(session.user, window.APP_SUBSCRIBED, null);
        const title = document.getElementById('auth-modal-title');
        const sub   = document.getElementById('auth-modal-sub');
        if(title) title.textContent = 'アカウント情報';
        if(sub)   sub.textContent   = '';
      } else {
        _updateAuthUI(null, false, null);
        const title = document.getElementById('auth-modal-title');
        const sub   = document.getElementById('auth-modal-sub');
        if(title) title.textContent = 'アカウント登録';
        if(sub)   sub.textContent   = '月額150円・1ヶ月無料・いつでも解約OK';
      }
    });
    dlg.style.display = 'flex';
  };

  window.closeAuthModal = function() {
    const dlg = document.getElementById('dlg-auth');
    if(dlg) dlg.style.display = 'none';
  };

  window.sendMagicLink = async function() {
    const email = (document.getElementById('auth-email-input').value || '').trim();
    const msg   = document.getElementById('auth-msg');
    const btn   = document.getElementById('auth-magic-btn');
    if(!email) { if(msg) msg.textContent = 'メールアドレスを入力してください'; return; }
    if(btn) { btn.textContent = '送信中...'; btn.disabled = true; }
    const {error} = await _sb.auth.signInWithOtp({ email });
    if(error) {
      if(msg) msg.textContent = '送信に失敗しました: ' + error.message;
      if(btn) { btn.textContent = 'メールでログインコードを受け取る'; btn.disabled = false; }
    } else {
      document.getElementById('auth-email-form').style.display = 'none';
      document.getElementById('auth-sent-msg').style.display   = 'block';
      const otpInput=document.getElementById('auth-otp-input');
      const otpMsg=document.getElementById('auth-otp-msg');
      if(otpInput)otpInput.value='';
      if(otpMsg)otpMsg.textContent='';
      if(btn) { btn.textContent = 'メールでログインコードを受け取る'; btn.disabled = false; }
    }
  };

  // v26: メールのリンクではなく、メールに記載されたコードを手入力してログインする
  // （メールアプリのセキュリティスキャンでリンクが自動消費される問題を回避するため）
  window.verifyOtpCode = async function() {
    const email = (document.getElementById('auth-email-input').value || '').trim();
    const code  = (document.getElementById('auth-otp-input').value || '').trim();
    const msg   = document.getElementById('auth-otp-msg');
    const btn   = document.getElementById('auth-verify-btn');
    if(!code) { if(msg) msg.textContent = 'コードを入力してください'; return; }
    if(btn) { btn.textContent = '確認中...'; btn.disabled = true; }
    const {error} = await _sb.auth.verifyOtp({ email, token: code, type: 'email' });
    if(error) {
      if(msg) msg.textContent = 'コードが正しくないか、期限切れです';
      if(btn) { btn.textContent = 'コードを確認してログイン'; btn.disabled = false; }
    }
    // 成功時はonAuthStateChangeが発火し、_onUserLoginが呼ばれて画面が自動更新される
  };

  window.signInWithGoogle = async function() {
    await _sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.href }
    });
  };

  window.signOut = async function() {
    await _sb.auth.signOut();
    closeAuthModal();
  };

  // モーダル背景クリックで閉じる
  document.getElementById('dlg-auth').addEventListener('mousedown', e => {
    if(e.target === e.currentTarget) closeAuthModal();
  });

  // URLハッシュに認証トークンが含まれる場合（メールリンク経由）は自動処理される
  // supabase-js が onAuthStateChange で検知するため追加処理不要
})();
