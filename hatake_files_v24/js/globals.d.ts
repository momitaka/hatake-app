// hatake_v26.html が <script> (非module) で先に読み込むグローバル変数・関数の型宣言。
// 実行時の挙動は変えず、tsc --checkJs にグローバルの存在を伝えるためだけの補助ファイル。

declare global {
  // data/preset_vegs.js
  const PRESET_VEGS: Array<{
    id: string;
    name: string;
    emoji: string;
    family: string;
    iconFile: string;
  }>;

  // data/icons_b64.js
  const ICON_B64: Record<string, string>;

  // https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2 (UMD)
  const supabase: {
    createClient: (url: string, key: string) => any;
  };

  interface Window {
    APP_CONFIG?: any;
    APP_SUBSCRIBED?: boolean;
    _sbClient?: any;
    _regDlgOpenTime?: number;
    _chipEdit?: () => void;
    _chipDelete?: () => void;
    _taskDateConfirm?: (dateVal: string) => void;
    _taskDateCancel?: (() => void) | null;
    openAuthModal?: () => void;
    closeAuthModal?: () => void;
    sendMagicLink?: () => Promise<void>;
    verifyOtpCode?: () => Promise<void>;
    signInWithGoogle?: () => Promise<void>;
    signOut?: () => Promise<void>;
    navState?: any;
    openArchive?: (...args: any[]) => void;
    populateCropSelect?: (...args: any[]) => void;
    renderGrid?: (...args: any[]) => void;
    renderManage?: (...args: any[]) => void;
  }

  // window.foo = ... で定義された関数を裸の識別子（foo()）としても
  // 呼び出しているため、globalThis 側にも同名を宣言して両方を通す。
  var APP_CONFIG: any;
  var APP_SUBSCRIBED: boolean | undefined;
  var openAuthModal: (() => void) | undefined;
  var closeAuthModal: (() => void) | undefined;
  var sendMagicLink: (() => Promise<void>) | undefined;
  var verifyOtpCode: (() => Promise<void>) | undefined;
  var signInWithGoogle: (() => Promise<void>) | undefined;
  var signOut: (() => Promise<void>) | undefined;
}

export {};
