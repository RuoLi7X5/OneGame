const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const START_URL = 'https://www.hanyuguoxue.com/chengyu/';
const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_FILE = path.join(DATA_DIR, 'idioms.extra.json');
const DETAILS_CACHE = path.join(DATA_DIR, 'hanyuguoxue.details.json');
function parseArgs(){
  const opt = { limit: null, retries: 3, delay: 250, onlyCache: false };
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--limit') opt.limit = Number(args[++i]);
    else if (a === '--retries') opt.retries = Number(args[++i]);
    else if (a === '--delay') opt.delay = Number(args[++i]);
    else if (a === '--only-cache') opt.onlyCache = true;
  }
  return opt;
}
const OPT = parseArgs();

const toneMap = {
  'ā': ['a', 1], 'á': ['a', 2], 'ǎ': ['a', 3], 'à': ['a', 4],
  'ē': ['e', 1], 'é': ['e', 2], 'ě': ['e', 3], 'è': ['e', 4],
  'ī': ['i', 1], 'í': ['i', 2], 'ǐ': ['i', 3], 'ì': ['i', 4],
  'ō': ['o', 1], 'ó': ['o', 2], 'ǒ': ['o', 3], 'ò': ['o', 4],
  'ū': ['u', 1], 'ú': ['u', 2], 'ǔ': ['u', 3], 'ù': ['u', 4],
  'ǖ': ['ü', 1], 'ǘ': ['ü', 2], 'ǚ': ['ü', 3], 'ǜ': ['ü', 4],
};

function convertSyllableToNumberTone(s) {
  if (!s) return null;
  s = String(s).trim();
  // 保留结尾数字（如 yi1 ）的场景
  const mNum = s.match(/^([a-zA-Züǖǘǚǜ]+)([1-4])$/);
  if (mNum) {
    const base = mNum[1].toLowerCase().replace(/·/g,'').replace(/v/g,'ü').replace(/[^a-zü]/gi,'');
    if (!base) return null;
    return base + mNum[2];
  }
  let tone = null;
  let core = '';
  for (const ch of s) {
    if (toneMap[ch]) { const [b, n] = toneMap[ch]; core += b; tone = n; }
    else { core += ch; }
  }
  core = core.toLowerCase().replace(/·/g,'').replace(/[^a-zü]/gi,'').replace(/v/g,'ü');
  if (!core) return null;
  if (tone == null) return null; // 无调信息则拒绝
  return core + String(tone);
}

const INITIALS = ['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];
const FINALS = ['a','o','e','ai','ei','ao','ou','an','en','ang','eng','er','ia','ie','iao','iu','ian','in','iang','ing','iong','ua','uo','uai','ui','uan','un','uang','ong','u','ue','uan','un','ü','üe','üan','ün'];
function isChineseWordFour(s){ return /^[\u4e00-\u9fff]{4}$/.test(String(s)); }
function isLikelyPinyinToken(token) {
  const conv = convertSyllableToNumberTone(token);
  if (!conv) return false;
  if (!/[1-4]$/.test(conv)) return false; // 仅接受 1-4 调
  const core = conv.replace(/[1-4]$/,'');
  if (!/[aeiouü]/.test(core)) return false;
  if (core.length < 2 && core !== 'er') return false;
  if (core.length > 6) return false;
  let init = '';
  for (const pre of INITIALS) { if (core.startsWith(pre)) { init = pre; break; } }
  const fin = core.slice(init.length);
  return FINALS.includes(fin);
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
let COOKIE = '';
function updateCookieFrom(res){
  const set = res.headers['set-cookie'];
  if (Array.isArray(set) && set.length) {
    const parts = [];
    for (const c of set) { const kv = String(c).split(';')[0].trim(); if (kv) parts.push(kv); }
    COOKIE = parts.join('; ');
  }
}
function decodeBody(res, chunks){
  const enc = String(res.headers['content-encoding']||'').toLowerCase();
  const buf = Buffer.concat(chunks);
  if (enc.includes('gzip')) return zlib.gunzipSync(buf).toString('utf8');
  if (enc.includes('deflate')) return zlib.inflateSync(buf).toString('utf8');
  if (enc.includes('br')) return zlib.brotliDecompressSync(buf).toString('utf8');
  return buf.toString('utf8');
}

async function fetchText(url, tries=OPT.retries||3) {
  let lastErr = null;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const options = new URL(url);
      options.headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.7',
        'accept-encoding': 'gzip, deflate, br',
        'cache-control': 'no-cache',
        'referer': 'https://www.hanyuguoxue.com/chengyu/',
        'connection': 'keep-alive',
        ...(COOKIE ? { 'cookie': COOKIE } : {})
      };
      const html = await new Promise((resolve, reject) => {
        const req = https.get(options, res => {
          if (res.headers.location && res.statusCode >= 300 && res.statusCode < 400) {
            const next = new URL(res.headers.location, url).toString();
            res.resume();
            fetchText(next, 1).then(resolve).catch(reject);
            return;
          }
          if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); res.resume(); return; }
          updateCookieFrom(res);
          const chunks = [];
          res.on('data', c => chunks.push(Buffer.isBuffer(c)?c:Buffer.from(String(c))));
          res.on('end', () => { try { resolve(decodeBody(res, chunks)); } catch (e) { reject(e); } });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { try { req.destroy(); } catch {} reject(new Error('timeout')); });
      });
      return html;
    } catch (e) {
      lastErr = e;
      const backoff = (OPT.delay||250) * (attempt+1) + Math.floor(Math.random()*400);
      await sleep(backoff);
    }
  }
  throw lastErr || new Error('unknown');
}

function absolute(href, base) {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function extractLinks(html, base) {
  const out = new Set();
  const re = /<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const text = String(m[2]).trim();
    if (!href) continue;
    const abs = absolute(href, base);
    if (!abs) continue;
    if (/\/chengyu\//i.test(abs)) {
      out.add(JSON.stringify([abs, text]));
    }
  }
  return Array.from(out).map(x => JSON.parse(x));
}

function cleanText(str) {
  return String(str)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&[a-z#0-9]+;/gi,' ')
    .replace(/[\u00A0]+/g,' ')
    .replace(/[\t]+/g,' ')
    .replace(/[\r]+/g,'\n')
    .replace(/\n{2,}/g,'\n')
    .trim();
}

function extractPinyin(html) {
  const text = cleanText(html);
  function pickAround(label) {
    const idx = text.indexOf(label);
    if (idx < 0) return null;
    const sub = text.slice(idx, idx + 300);
    const tokens = sub.match(/[a-zA-Züǖǘǚǜ]+/g) || [];
    const out = [];
    for (const t of tokens) {
      if (isLikelyPinyinToken(t)) {
        out.push(convertSyllableToNumberTone(t));
        if (out.length === 4) break;
      }
    }
    return out.length === 4 ? out : null;
  }
  let arr = pickAround('拼音');
  if (!arr) arr = pickAround('注音');
  return arr || null;
}

async function run() {
  console.log('Start crawl from', START_URL);
  const visited = new Set();
  const details = new Map();
  const queue = [START_URL];
  let loops = 0;
  // 尝试从缓存加载已发现的详情链接
  if (fs.existsSync(DETAILS_CACHE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(DETAILS_CACHE, 'utf8'));
      if (Array.isArray(cached)) {
        for (const [abs, text] of cached) { if (isChineseWordFour(text)) details.set(String(abs), String(text)); }
        console.log('Loaded detail links from cache:', details.size);
      }
    } catch {}
  }

  while (!OPT.onlyCache && queue.length && loops < 50 && details.size < 5000) {
    const u = queue.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    let html = '';
    try { html = await fetchText(u); } catch (e) { console.warn('Fetch failed:', u, e.message); continue; }
    const links = extractLinks(html, u);
    console.log('Visited', u, 'links found:', links.length);
    for (const [abs, text] of links) {
      if (/\/chengyu\/ci\-/i.test(abs) && isChineseWordFour(text)) details.set(abs, text);
      if (!visited.has(abs) && /\/chengyu\//i.test(abs)) queue.push(abs);
    }
    await sleep((OPT.delay||250) + Math.floor(Math.random()*200));
    loops++;
  }
  // 将详情链接写入缓存
  try { fs.writeFileSync(DETAILS_CACHE, JSON.stringify(Array.from(details.entries()), null, 2), 'utf8'); console.log('Saved detail links cache:', DETAILS_CACHE); } catch {}

  const outMap = new Map();
  let count = 0;
  let success = 0, fail503 = 0, otherFail = 0;
  for (const [url, word] of details) {
    if (!isChineseWordFour(word)) continue;
    let html = '';
    try { html = await fetchText(url, 3); success++; } catch (e) {
      if (/HTTP\s+503/.test(String(e.message))) fail503++; else otherFail++;
      console.warn('Detail fetch failed:', url, e.message); continue;
    }
    const pin = extractPinyin(html);
    if (pin && pin.length === 4 && pin.every(isLikelyPinyinToken)) outMap.set(word, pin);
    count++;
    if (count % 10 === 0) console.log('Processed details:', count, 'current size:', outMap.size);
    if (count % 20 === 0) await sleep((OPT.delay||250) + 100 + Math.floor(Math.random()*300));
    if (OPT.limit && count >= OPT.limit) break;
    if (count > 1200) break;
  }

  const prev = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')) : [];
  for (const it of prev) {
    const t = (it.text||'').trim();
    const p = Array.isArray(it.pinyin)?it.pinyin.map(String):[];
    if (isChineseWordFour(t) && p.length===4 && p.every(isLikelyPinyinToken) && !outMap.has(t)) outMap.set(t, p);
  }
  const arr = Array.from(outMap.entries()).map(([text, pinyin]) => ({ text, pinyin }));
  arr.sort((a,b) => a.text.localeCompare(b.text,'zh-CN'));
  const arr2 = arr.filter(it => isChineseWordFour(it.text) && Array.isArray(it.pinyin) && it.pinyin.length===4 && it.pinyin.every(isLikelyPinyinToken));
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(arr2, null, 2), 'utf8');
  console.log('done', { total: arr2.length, out: OUT_FILE, success, fail503, otherFail });
}

run().catch(e => { console.error('failed', e); process.exit(1); });
