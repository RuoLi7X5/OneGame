const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const SQL_FILE = path.join(DATA, 'sujuku.sql');
const DETAILS_FILE = path.join(DATA, 'hanyuguoxue.details.json');
const OUT_FILE = path.join(DATA, 'explain.json');

function parseArgs(){
  const args = process.argv.slice(2);
  const opt = { limit: null, onlyCache: true, retries: 2, delay: 400 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--limit') opt.limit = Number(args[++i]);
    else if (a === '--only-cache') opt.onlyCache = true;
    else if (a === '--retries') opt.retries = Number(args[++i]);
    else if (a === '--delay') opt.delay = Number(args[++i]);
  }
  return opt;
}
const OPT = parseArgs();

function fromSQL(){
  if (!fs.existsSync(SQL_FILE)) return new Map();
  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  const re = /INSERT\s+INTO\s+`?cy`?\s+VALUES\s*\([^)]*?,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*'([^']*)'/gi;
  const m = new Map();
  let x;
  while ((x = re.exec(sql)) !== null) {
    const w = String(x[1]).trim();
    const c = String(x[2]).trim();
    if (w && w.length === 4 && c) {
      m.set(w, c);
    }
  }
  return m;
}

function readJSON(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return null; } }
function writeJSON(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function fetchText(url, tries){
  return new Promise(async (resolve, reject) => {
    let lastErr = null;
    for (let attempt = 1; attempt <= (tries||1); attempt++) {
      try {
        const u = new URL(url);
        const req = https.get({ hostname: u.hostname, path: u.pathname + (u.search||''), protocol: u.protocol, headers: { 'user-agent': 'Mozilla/5.0', 'accept': 'text/html,*/*' } }, res => {
          if (res.headers.location && res.statusCode >= 300 && res.statusCode < 400) {
            const next = new URL(res.headers.location, url).toString();
            res.resume();
            fetchText(next, 1).then(resolve).catch(reject);
            return;
          }
          if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); res.resume(); return; }
          const chunks = [];
          res.on('data', c => chunks.push(Buffer.isBuffer(c)?c:Buffer.from(String(c))));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        req.on('error', e => reject(e));
        req.setTimeout(15000, () => { try { req.destroy(); } catch {} reject(new Error('timeout')); });
        return;
      } catch (e) {
        lastErr = e;
        await sleep((OPT.delay||400) + Math.floor(Math.random()*200));
      }
    }
    reject(lastErr || new Error('unknown'));
  });
}

function cleanText(str){
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

function extractExplain(html){
  const t = cleanText(html);
  const labels = ['释义','解释','基本解释','意思'];
  for (const lb of labels) {
    const idx = t.indexOf(lb);
    if (idx >= 0) {
      const sub = t.slice(idx, idx + 400);
      const s = sub.replace(/\s+/g,' ').replace(/[：:]/, '：');
      const m = s.match(/(?:释义|解释|基本解释|意思)[:：]\s*([^。！？\n]+(?:[。！？][^。！？\n]+)?)/);
      if (m) return m[1].trim();
      const alt = s.split(/[。\n]/)[1];
      if (alt) return alt.trim();
    }
  }
  return null;
}

async function run(){
  const base = fromSQL();
  const prev = readJSON(OUT_FILE) || {};
  const out = new Map(Object.entries(prev));
  for (const [w, c] of base) {
    if (c && (!out.has(w) || !out.get(w))) out.set(w, c);
  }
  const details = readJSON(DETAILS_FILE) || [];
  const urlMap = new Map();
  for (const it of details) {
    if (Array.isArray(it)) {
      const u = String(it[0]);
      const w = String(it[1]).trim();
      if (w && w.length === 4) urlMap.set(w, u);
    }
  }
  let fetched = 0;
  const need = [];
  for (const w of new Set([...urlMap.keys()])) {
    const cur = out.get(w);
    if (!cur || String(cur).trim().length < 4) need.push(w);
  }
  const lim = OPT.limit ? Math.min(OPT.limit, need.length) : need.length;
  for (let i = 0; i < lim; i++) {
    const w = need[i];
    const u = urlMap.get(w);
    if (!u) continue;
    try {
      const html = await fetchText(u, OPT.retries||1);
      const exp = extractExplain(html);
      if (exp) { out.set(w, exp); fetched++; }
      await sleep((OPT.delay||400) + Math.floor(Math.random()*200));
    } catch {}
  }
  const obj = {};
  for (const [k,v] of out) obj[k] = v;
  writeJSON(OUT_FILE, obj);
  console.log('done', { base: base.size, prev: Object.keys(prev).length, need: need.length, fetched, out: OUT_FILE });
}

run().catch(e => { console.error('failed', e); process.exit(1); });

