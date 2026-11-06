import { webBaseUrl } from '../../lib/qa.mjs';
import { watchDeposit } from './select-deposit-token.mjs';

export const meta = {
  id: 'platform-web/open-deposit-transfer',
  name: '打開存款視窗的 Transfer（加密貨幣轉入）頁',
  project: 'platform-web',
  needsLogin: true,
  params: { variant: '版型，預設 m8' },
  returns: '{ tokens: [{ currency, networks: [{ network, desc }] }] }，後端回傳可存款的幣別與網路清單',
  sideEffects: '無，只打開視窗',
  notes: '用網址 ?dialog=deposit 直接打開存款視窗，再點「Transfer your crypto」。每次換頁都會跳「Verification Required」提示壓在最上面，已自動按 OK。頁面上的優惠彈窗會壓在存款視窗下面，不用關。不要按 Esc，會把整個存款視窗關掉。',
  verified: '2026-11-06',
};

export async function run(page, { variant = 'm8' } = {}) {
  let tokens = null;
  const onResponse = async r => {
    if (!r.url().includes('/asset/refdata/tokennetworks')) return;
    try {
      const body = await r.json();
      tokens = (body.data || []).filter(t => t.isEnableDeposit !== false).map(t => ({
        currency: t.currency,
        networks: (t.networks || []).map(n => ({ network: n.network, desc: n.desc })),
      }));
    } catch {}
  };
  page.on('response', onResponse);
  watchDeposit(page);   // 預設選好的幣別一載入就要記錄後端值
  await page.goto(`${webBaseUrl(variant)}/?dialog=deposit`, { waitUntil: 'domcontentloaded', timeout: 60000 }); // 前台會一直保持連線，不能等 networkidle
  const entry = page.getByRole('dialog').filter({ hasText: /Transfer your crypto|转账|轉帳/ });
  await entry.first().waitFor({ state: 'visible', timeout: 20000 });
  // 每次換頁都會再跳「Verification Required」提示壓在最上面，要先按 OK 才點得到
  const target = entry.first().getByText(/Transfer your crypto|转账您的加密货币|轉帳/).first();
  for (let i = 0; i < 6; i++) {
    const ok = page.getByRole('dialog').getByRole('button', { name: /^(OK|确定|確定)$/ });
    if (await ok.count()) { await ok.first().click().catch(() => {}); await page.waitForTimeout(600); }
    try { await target.click({ timeout: 3000 }); break; } catch (e) { if (i === 5) throw e; }
  }
  const transfer = page.getByRole('dialog').filter({ hasText: /Select currency|选择币种|選擇幣種/ });
  await transfer.first().waitFor({ state: 'visible', timeout: 20000 });
  for (let i = 0; i < 20 && !tokens; i++) await page.waitForTimeout(300);
  page.off('response', onResponse);
  return { tokens: tokens || [] };
}
