import { login } from '../../lib/qa.mjs';

export const meta = {
  id: 'common/login',
  name: '登入後台（含 OTP）',
  project: 'gomoney-admin、platform-admin',
  needsLogin: false,
  params: { project: '專案代號：gomoney-admin 或 platform-admin（必填）' },
  returns: '登入後的網址',
  sideEffects: '無',
  notes: '帳密與 OTP 從 .env 讀取。登入後 GoMoneyAdmin 會到会员列表，PlatformAdmin 會到 Dashboard。',
  verified: '2026-11-06',
};

export async function run(page, { project } = {}) {
  if (!project) throw new Error('缺少參數 project');
  await login(page, project);
  return page.url();
}
