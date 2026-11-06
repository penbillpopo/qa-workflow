export const meta = {
  id: 'platform-web/select-deposit-token',
  name: '在 Transfer 頁選幣別與網路，讀取最低存款金額',
  project: 'platform-web',
  needsLogin: true,
  params: {
    currency: '幣別，例如 USDT、USDC、BTC（必填）',
    network: '網路的顯示名稱或代碼，例如 Ethereum (ERC20) 或 ERC20（選填，不填就用預設網路）',
  },
  returns: '{ currency, network, shownText, shownAmount, shownCurrency, backendMinDeposit }。shownAmount 是畫面上的最低金額，backendMinDeposit 是後端 depositaddress 回傳的原始值',
  sideEffects: '無',
  notes: '要先用 open-deposit-transfer 打開 Transfer 頁。幣別與網路的選項是浮在畫面上的清單，直接點文字。後端原始值來自 /v1/asset/deposit/depositaddress?currency=&network=。',
  verified: '2026-11-06',
};

// 按鈕文字結尾有圖示字型的私有字元，比對前要先去掉
const clean = t => t.replace(/[\uE000-\uF8FF]/g, '').trim();

/**
 * 在頁面上持續記錄最後一次的 depositaddress 回應。打開 Transfer 頁時就要呼叫，
 * 否則預設選好的幣別（例如 USDT ERC20）在開始監聽前就載入完了，會拿不到後端值。
 */
export function watchDeposit(page) {
  if (page.__depositWatch) return;
  page.__depositWatch = true;
  page.on('response', async r => {
    if (!r.url().includes('/asset/deposit/depositaddress')) return;
    try {
      const text = await r.text();
      const b = JSON.parse(text);
      const raw = (text.match(/"minDeposit"\s*:\s*"?([0-9.eE+-]+)"?/) || [])[1];
      page.__lastDeposit = { ...b.data, minDepositRaw: raw };
    } catch {}
  });
}

const transferDialog = page => page.getByRole('dialog').filter({ hasText: /Select currency|选择币种|選擇幣種/ }).last();

async function pickFromOverlay(page, opener, label) {
  await opener.click();
  await page.waitForTimeout(800);
  const pane = page.locator('.cdk-overlay-pane').last();
  const option = pane.getByText(label, { exact: true });
  if (!(await option.count())) {
    const all = (await pane.innerText()).split('\n').map(s => s.trim()).filter(Boolean);
    await page.mouse.click(5, 5);
    throw new Error(`選單裡找不到「${label}」，可選的有：${all.join('、')}`);
  }
  await option.first().click();
  await page.waitForTimeout(500);
}

export async function run(page, { currency, network } = {}) {
  if (!currency) throw new Error('缺少參數 currency');
  const dlg = transferDialog(page);
  await dlg.waitFor({ state: 'visible', timeout: 15000 });

  // 後端值由 watchDeposit 記錄（用原始文字取值，避免浮點數誤差）
  watchDeposit(page);

  // 幣別：按鈕是目前選到的幣別，例如「USDT 」
  // 用畫面上的標籤找：「Select currency」後面的第一個按鈕
  const currencyBtn = dlg.getByText(/^\s*(Select currency|选择币种|選擇幣種)\s*$/).first().locator('xpath=following::button[1]');
  const currentCurrency = clean(await currencyBtn.innerText());
  if (currentCurrency !== currency) await pickFromOverlay(page, currencyBtn, currency);

  // 網路：按鈕在「Select network」之後，例如「Ethereum (ERC20) 」
  // 「Select network」後面的第一個按鈕
  const networkBtn = dlg.getByText(/^\s*(Select network|选择网络|選擇網路)\s*$/).first().locator('xpath=following::button[1]');
  if (network) {
    const current = clean(await networkBtn.innerText());
    if (!current.includes(network)) {
      await networkBtn.click();
      await page.waitForTimeout(800);
      const pane = page.locator('.cdk-overlay-pane').last();
      const opt = pane.getByText(new RegExp(network.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      if (!(await opt.count())) {
        const all = (await pane.innerText()).split('\n').map(s => s.trim()).filter(Boolean);
        await page.mouse.click(5, 5);
        throw new Error(`網路選單裡找不到「${network}」，可選的有：${all.join('、')}`);
      }
      await opt.first().click();
      await page.waitForTimeout(500);
    }
  }

  // 等畫面的最低金額與後端值都到位
  const tip = dlg.getByText(/minimum deposit amount is|最低|最少/);
  await tip.first().waitFor({ state: 'visible', timeout: 15000 });
  const shownNet = clean(await networkBtn.innerText());
  const matches = d => d && d.token === currency && (!network || shownNet.includes(d.network) || d.network === network || shownNet.includes(network));
  for (let i = 0; i < 30 && !matches(page.__lastDeposit); i++) await page.waitForTimeout(300);
  const backend = matches(page.__lastDeposit) ? page.__lastDeposit : null;

  const shownText = (await tip.first().innerText()).trim();
  const m = shownText.match(/([\d.,]+)\s*([A-Z0-9]{2,10})\s*$/);
  return {
    currency,
    network: clean(await networkBtn.innerText()),
    shownText,
    shownAmount: m ? m[1].replace(/,/g, '') : null,
    shownCurrency: m ? m[2] : null,
    backendMinDeposit: backend ? backend.minDepositRaw : null,
    backendNetwork: backend ? backend.network : null,
  };
}
