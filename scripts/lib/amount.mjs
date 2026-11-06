// 金額的精確計算，用字串與 BigInt，避免浮點數誤差。

/** 把 "0.0060000000"、"1e-8"、"10" 這類字串轉成 { int: BigInt, scale: 小數位數 } */
function parse(value) {
  let s = String(value).trim();
  if (/e/i.test(s)) {
    const [m, e] = s.toLowerCase().split('e');
    const exp = Number(e);
    const [ip, fp = ''] = m.replace('-', '').split('.');
    let digits = ip + fp, point = ip.length + exp;
    if (point <= 0) { digits = '0'.repeat(1 - point) + digits; point = 1; }
    if (point > digits.length) digits = digits + '0'.repeat(point - digits.length);
    s = (m.startsWith('-') ? '-' : '') + digits.slice(0, point) + (digits.slice(point) ? '.' + digits.slice(point) : '');
  }
  const neg = s.startsWith('-');
  const [ip, fp = ''] = s.replace('-', '').split('.');
  return { int: BigInt((neg ? '-' : '') + (ip || '0') + fp), scale: fp.length };
}

function format(int, scale) {
  const neg = int < 0n;
  let d = (neg ? -int : int).toString().padStart(scale + 1, '0');
  const out = scale ? d.slice(0, -scale) + '.' + d.slice(-scale) : d;
  return (neg ? '-' : '') + out;
}

/** 無條件進位到 places 位小數，回傳字串並去掉多餘的尾數 0，例如 ceilTo('0.00000001', 2) → '0.01' */
export function ceilTo(value, places) {
  const { int, scale } = parse(value);
  if (scale <= places) return trim(format(int * 10n ** BigInt(places - scale), places));
  const div = 10n ** BigInt(scale - places);
  let q = int / div;
  if (int % div !== 0n && int > 0n) q += 1n;
  return trim(format(q, places));
}

/** 去掉小數尾端的 0，例如 '0.0100' → '0.01'、'10.00' → '10' */
export function trim(s) {
  s = String(s);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

/** 兩個金額字串在數值上是否相等，例如 '0.010' 與 '0.01' */
export function sameAmount(a, b) {
  return trim(a) === trim(b);
}

/** 比較兩個金額：a < b 回傳 -1，相等 0，a > b 回傳 1 */
export function compare(a, b) {
  const x = parse(a), y = parse(b);
  const scale = Math.max(x.scale, y.scale);
  const xi = x.int * 10n ** BigInt(scale - x.scale), yi = y.int * 10n ** BigInt(scale - y.scale);
  return xi < yi ? -1 : xi > yi ? 1 : 0;
}
