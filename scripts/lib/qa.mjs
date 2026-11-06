// QA 共用測試函式庫
// 用法見 .claude/skills/qa-run/SKILL.md。
// 帳密與 OTP 只從 .env 讀取，任何輸出都會遮蔽。

import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---------- 環境變數 ----------
export function loadEnv() {
  const text = readFileSync(path.join(ROOT, '.env'), 'utf8');
  return Object.fromEntries(
    text.split('\n')
      .filter(l => /^[A-Z_][A-Z0-9_]*=/.test(l))
      .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
  );
}
const ENV = loadEnv();
const SECRETS = Object.entries(ENV)
  .filter(([k]) => /PASSWORD|OTP|KEY|TOKEN|SECRET/.test(k))
  .map(([, v]) => v)
  .filter(v => v && v.length >= 3);
export const mask = s => SECRETS.reduce((t, v) => String(t).split(v).join('***'), String(s));

// ---------- 專案設定（只有 UAT） ----------
export const PROJECTS = {
  'gomoney-admin': {
    name: 'GoMoneyAdmin',
    baseUrl: 'https://uat-payment-admin.mxsyl.com',
    loginUrl: 'https://uat-payment-admin.mxsyl.com/zh-CN/login',
    userKey: 'GOMONEY_ADMIN_USERNAME',
    passKey: 'GOMONEY_ADMIN_PASSWORD',
  },
  'platform-admin': {
    name: 'PlatformAdmin',
    baseUrl: 'http://uat.newplatformadmin.mxsyl.com',
    loginUrl: 'http://uat.newplatformadmin.mxsyl.com/en-US/login',
    userKey: 'PLATFORM_ADMIN_USERNAME',
    passKey: 'PLATFORM_ADMIN_PASSWORD',
  },
};

// PlatformWeb 前台：每個版型一個網域。m1 沒有數字，其他在 uat 後面接版型編號。
export const WEB_VARIANTS = ['m1', 'm2', 'm5', 'm7', 'm8', 'm9', 'm10'];
export const webBaseUrl = (variant = 'm8') => {
  if (!WEB_VARIANTS.includes(variant)) throw new Error(`未知的版型：${variant}，可用的有 ${WEB_VARIANTS.join('、')}`);
  const n = variant === 'm1' ? '' : variant.slice(1);
  return `https://uat${n}-newplatform.mxsyl.com`;
};
PROJECTS['platform-web'] = {
  name: 'PlatformWeb',
  kind: 'web',
  baseUrl: webBaseUrl('m8'),
  userKey: 'PLATFORM_WEB_USERNAME',
  passKey: 'PLATFORM_WEB_PASSWORD',
};

const ALLOWED_HOSTS = [
  ...Object.values(PROJECTS).map(p => new URL(p.baseUrl).host),
  ...WEB_VARIANTS.map(v => new URL(webBaseUrl(v)).host),
];
export function assertUat(url) {
  const host = new URL(url).host;
  if (!ALLOWED_HOSTS.includes(host)) throw new Error(`網址不在 UAT 清單內，停止執行：${host}`);
}

// ---------- 瀏覽器 ----------
/** 優先用電腦上的 Google Chrome；沒有的話改用 Playwright 內建瀏覽器。 */
export async function launchBrowser(opts = {}) {
  try { return await chromium.launch({ channel: 'chrome', ...opts }); }
  catch { return await chromium.launch(opts); }
}

// ---------- 登入 ----------
/**
 * 關掉前台常見的彈窗：「Verification Required」按 OK、「Exclusive offer」優惠彈窗按右上角關閉。
 * 換頁後這些彈窗會再出現，需要點頁面上的東西前先呼叫。
 */
export async function dismissWebPopups(page) {
  for (let i = 0; i < 5; i++) {
    const ok = page.getByRole('dialog').getByRole('button', { name: /^(OK|确定|確定)$/ });
    if (await ok.count()) { await ok.first().click().catch(() => {}); await page.waitForTimeout(500); continue; }
    const offer = page.getByRole('dialog').filter({ hasText: /Exclusive offer|专属优惠|專屬優惠/i });
    if (await offer.count()) { await offer.first().getByRole('button').first().click().catch(() => {}); await page.waitForTimeout(500); continue; }
    break;
  }
}

/**
 * 玩家前台登入。流程：?dialog=login → 填 Email 與密碼 → Log In →
 * 有時會出現手機驗證碼視窗（6 格，填滿會自動送出，用 OTP_CODE）→ 關掉「Verification Required」提示。
 * 注意：同一個帳號一分鐘內只能寄一次驗證碼，太密集登入會等不到驗證碼視窗。
 */
export async function loginWeb(page, variant = 'm8') {
  const p = PROJECTS['platform-web'];
  const user = ENV[p.userKey], pass = ENV[p.passKey], otp = ENV.OTP_CODE;
  if (!user || !pass) throw new Error(`.env 缺少 ${p.userKey} 或 ${p.passKey}`);
  const dlg = page.getByRole('dialog').filter({ has: page.locator('input[type=password]') });
  // 前台會一直保持連線，不能等 networkidle；偶爾會卡在載入動畫，等不到就重新整理一次
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.goto(`${webBaseUrl(variant)}/?dialog=login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try { await dlg.waitFor({ state: 'visible', timeout: 45000 }); break; }
    catch (e) { if (attempt === 2) throw new Error('前台一直停在載入畫面，登入視窗沒有出現'); }
  }
  await dlg.locator('input:not([type=password])').first().fill(user);
  await dlg.locator('input[type=password]').fill(pass);
  await dlg.getByRole('button', { name: /Log In|登录|登入/ }).last().click();
  // 等登入完成：登入視窗消失，或出現驗證碼視窗
  const otpDlg = page.getByRole('dialog').filter({ hasText: /Two Step verification|Mobile Verification|验证码|驗證碼/ });
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1000);
    if (await otpDlg.count()) {
      if (!otp) throw new Error('.env 缺少 OTP_CODE');
      await otpDlg.locator('input').first().click();
      await page.keyboard.type(otp, { delay: 80 });
      await page.waitForTimeout(2500);
      const btn = otpDlg.getByRole('button', { name: /Confirm/ });
      if (await btn.count() && await btn.isEnabled()) await btn.click();
      await page.waitForTimeout(3000);
      break;
    }
    if (!(await dlg.count()) || /settings|\/(en-us|zh-cn)\/?$/.test(page.url()) && !page.url().includes('dialog=login')) break;
  }
  if (await page.locator('[role=dialog] input[type=password]').count()) throw new Error('前台登入失敗：仍停在登入視窗');
  // 關掉登入後的「Verification Required」提示
  await page.waitForTimeout(2000);
  await dismissWebPopups(page);
}


export async function login(page, projectKey, variant) {
  const p = PROJECTS[projectKey];
  if (!p) throw new Error(`未知的專案：${projectKey}`);
  if (p.kind === 'web') return loginWeb(page, variant || 'm8');
  const user = ENV[p.userKey], pass = ENV[p.passKey], otp = ENV.OTP_CODE;
  if (!user || !pass) throw new Error(`.env 缺少 ${p.userKey} 或 ${p.passKey}`);

  await page.goto(p.loginUrl, { waitUntil: 'networkidle', timeout: 60000 });
  const pw = page.locator('input[type=password]:visible');
  if (await pw.count()) {
    await page.locator('input[type=text]:visible').first().fill(user);
    await pw.first().fill(pass);
    await page.locator('button:visible').first().click();
    await page.waitForTimeout(3500);
  }
  const body = await page.innerText('body');
  if (/OTP/i.test(body)) {
    if (!otp) throw new Error('.env 缺少 OTP_CODE');
    const box = page.locator('input:visible').first();
    await box.fill(otp);
    const confirm = page.locator('button:visible', { hasText: /确认|確認|Confirm/ });
    if (await confirm.count()) await confirm.first().click(); else await box.press('Enter');
    await page.waitForTimeout(5000);
  }
  if (await page.locator('input[type=password]:visible').count() || /OTP/i.test(await page.innerText('body'))) {
    throw new Error('登入失敗：仍停在登入或驗證碼頁');
  }
}

// ---------- 測試執行 ----------
const safe = s => String(s).replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40);

/**
 * 開始一條案例的執行。
 * @param {object} o
 * @param {string} o.ticketDir  單號資料夾（相對專案根目錄），例如 platform-admin/tickets/ALL-14490
 * @param {string} o.caseId     案例編號，例如 TC-03
 * @param {string} o.project    gomoney-admin 或 platform-admin
 * @param {string} [o.variant]  子資料夾，例如版型 m5
 */
export async function startCase({ ticketDir, caseId, project, variant, viewport = { width: 1600, height: 1000 }, headless = true, locale = 'en-US' }) {
  const dir = path.join(ROOT, ticketDir);
  const shotDir = path.join(dir, 'screenshots', variant || '');
  const resultDir = path.join(dir, 'results');
  mkdirSync(shotDir, { recursive: true });
  mkdirSync(resultDir, { recursive: true });

  const browser = await launchBrowser({ headless });
  // 後台介面語言跟著瀏覽器語系，不是網址。預設英文；要驗證中文文案時傳 locale: 'zh-CN'。
  const context = await browser.newContext({ viewport, locale });
  const page = await context.newPage();
  page.on('framenavigated', f => { if (f === page.mainFrame() && /^https?:/.test(f.url())) assertUat(f.url()); });

  const steps = [];
  let failed = false;

  /**
   * 執行一個步驟並截圖。fn 回傳的字串會記成「實際結果」；fn 丟出錯誤代表失敗。
   */
  async function step(desc, expected, fn) {
    const no = String(steps.length + 1).padStart(2, '0');
    const rec = { no: Number(no), desc, expected, actual: '', status: 'passed', screenshot: '' };
    if (failed) {
      rec.status = 'blocked';
      rec.actual = '前面步驟失敗，未執行';
      steps.push(rec);
      return;
    }
    try {
      const out = await fn(page);
      rec.actual = mask(out ?? '符合預期');
    } catch (e) {
      rec.status = e.blocked ? 'blocked' : 'failed';
      rec.actual = mask(e.message.split('\n')[0]);
      failed = true;
    }
    const file = `${caseId}-${no}-${safe(desc)}${rec.status === 'failed' ? '-FAIL' : ''}.png`;
    try {
      await page.screenshot({ path: path.join(shotDir, file), fullPage: true });
      rec.screenshot = path.join('screenshots', variant || '', file);
    } catch { rec.screenshot = ''; }
    steps.push(rec);
    const label = { passed: '通過', failed: '失敗', blocked: '阻擋' }[rec.status];
    console.log(`${label} ${caseId}-${no} ${desc}${rec.status !== 'passed' ? '：' + rec.actual : ''}`);
  }

  /** 條件不成立就丟出錯誤，讓步驟判定為失敗。 */
  function check(cond, message) { if (!cond) throw new Error(message); }

  /** 無法測試（不是功能有問題），例如畫面上沒有可以比對的東西。整條案例會標為「阻擋」。 */
  function block(message) { const e = new Error(message); e.blocked = true; throw e; }

  async function finish(note = '') {
    const status = steps.some(s => s.status === 'failed') ? 'failed' : steps.some(s => s.status === 'blocked') ? 'blocked' : 'passed';
    const result = { caseId, project, variant: variant || null, status, note: mask(note), finishedAt: new Date().toISOString(), steps };
    writeFileSync(path.join(resultDir, `${caseId}${variant ? '-' + variant : ''}.json`), JSON.stringify(result, null, 2));
    await browser.close();
    console.log(`== ${caseId} ${{ passed: '通過', failed: '失敗', blocked: '阻擋' }[status]}`);
    return result;
  }

  return { page, step, check, block, finish, login: () => login(page, project, variant) };
}

/** 產生 QA 測試資料名稱，例如 QA-TEST-ALL14490-1106-1530 */
export function testName(tag) {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `QA-TEST-${tag}-${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
