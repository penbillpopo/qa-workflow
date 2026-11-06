// ALL-15193 案例共用：進位位數、比對邏輯。不是案例，run-ticket 會略過 _ 開頭的檔案。
import { ceilTo, sameAmount, compare } from '../../../../scripts/lib/amount.mjs';
export { run as openTransfer } from '../../../../scripts/library/platform-web/open-deposit-transfer.mjs';
import { run as selectToken } from '../../../../scripts/library/platform-web/select-deposit-token.mjs';
export { selectToken };

export const TICKET = 'platform-web/tickets/ALL-15193';
export const VARIANT = 'm8';

// 單子規則：穩定幣 2 位、BTC 與 ETH 8 位、其他 6 位。
// 「穩定幣」的名單是推測的（單子沒列），比對不符時要回報給使用者確認。
export const STABLE = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDE', 'FDUSD'];
export const placesFor = c => (STABLE.includes(c) ? 2 : c === 'BTC' || c === 'ETH' ? 8 : 6);

/** 選幣別與網路，讀畫面值與後端值，算出應該顯示的值並比對 */
export async function checkCombo(page, currency, network) {
  const r = await selectToken(page, { currency, network });
  if (!r.backendMinDeposit) throw new Error(`${currency} ${network || ''} 沒有拿到後端的最低儲值`);
  const places = placesFor(currency);
  const expected = ceilTo(r.backendMinDeposit, places);
  const below = r.shownAmount != null && compare(r.shownAmount, r.backendMinDeposit) < 0;
  const ok = r.shownAmount != null && sameAmount(r.shownAmount, expected) && r.shownCurrency === currency;
  return { ...r, places, expected, below, ok };
}

export const describe = x =>
  `${x.currency} ${x.network}：後端 ${x.backendMinDeposit}，進位到 ${x.places} 位應為 ${x.expected}，畫面顯示 ${x.shownAmount} ${x.shownCurrency}`;
