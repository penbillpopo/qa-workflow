import { loginWeb } from '../../lib/qa.mjs';

export const meta = {
  id: 'platform-web/login',
  name: '玩家前台登入（含手機驗證碼）',
  project: 'platform-web',
  needsLogin: false,
  params: { variant: '版型 m1、m2、m5、m7、m8、m9、m10，預設 m8' },
  returns: '登入後的網址',
  sideEffects: '可能寄出一封手機驗證碼簡訊',
  notes: '帳密用 .env 的 PLATFORM_WEB_USERNAME、PLATFORM_WEB_PASSWORD，驗證碼用 OTP_CODE。驗證碼視窗有 6 格，填滿會自動送出；不一定每次都會出現。同一帳號一分鐘內只能寄一次驗證碼，太密集登入會等不到驗證碼視窗。登入後會跳「Verification Required」與優惠彈窗，已自動關掉；換頁後會再出現，可用 qa.mjs 的 dismissWebPopups 關。偶爾會卡在載入動畫，已自動重試一次。介面語言是帳號偏好，不跟瀏覽器語系或網址走；m8 只有 English、Português、Español，沒有中文。m8 是 PUBS 品牌。',
  verified: '2026-11-06',
};

export async function run(page, { variant = 'm8' } = {}) {
  await loginWeb(page, variant);
  return page.url();
}
