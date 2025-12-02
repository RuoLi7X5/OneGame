/*
  自动抓取开源成语数据并生成本项目词库：data/idioms.full.json

  来源：pwxcoo/chinese-xinhua 数据集中的 idiom.json（拼音为声调符号）
  地址：https://raw.githubusercontent.com/pwxcoo/chinese-xinhua/master/data/idiom.json

  处理：
  - 仅保留四字成语（长度为 4）
  - 将带声调符号的拼音转为无调+数字（如 "ā" -> "a1"）
  - 过滤异常项（无拼音、拼音切分非4段）
  - 去重（按成语文本）
*/

const https = require('https');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const out = { extra: [], sourceFile: null, max: null };
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--extra') { const v = args[++i] || ''; out.extra = v.split(',').map(s => s.trim()).filter(Boolean); }
    else if (a === '--source-file') { out.sourceFile = args[++i]; }
    else if (a === '--max') { out.max = Number(args[++i]); }
  }
  return out;
}

const DEFAULT_SRC = [
  'https://raw.githubusercontent.com/pwxcoo/chinese-xinhua/master/data/idiom.json',
  'https://cdn.jsdelivr.net/gh/pwxcoo/chinese-xinhua@master/data/idiom.json',
  'https://fastly.jsdelivr.net/gh/pwxcoo/chinese-xinhua@master/data/idiom.json',
  'https://ghproxy.com/https://raw.githubusercontent.com/pwxcoo/chinese-xinhua/master/data/idiom.json'
];
const OPT = parseArgs();
let SRC_URLS = DEFAULT_SRC.slice();
if (OPT.sourceFile) {
  try {
    const arr = JSON.parse(fs.readFileSync(OPT.sourceFile, 'utf8'));
    if (Array.isArray(arr)) SRC_URLS = SRC_URLS.concat(arr.filter(x => typeof x === 'string'));
  } catch {}
}
if (OPT.extra && OPT.extra.length) SRC_URLS = SRC_URLS.concat(OPT.extra);
const OUT_FILE = path.join(__dirname, '..', 'data', 'idioms.full.json');

const toneMap = {
  'ā': ['a', 1], 'á': ['a', 2], 'ǎ': ['a', 3], 'à': ['a', 4],
  'ē': ['e', 1], 'é': ['e', 2], 'ě': ['e', 3], 'è': ['e', 4],
  'ī': ['i', 1], 'í': ['i', 2], 'ǐ': ['i', 3], 'ì': ['i', 4],
  'ō': ['o', 1], 'ó': ['o', 2], 'ǒ': ['o', 3], 'ò': ['o', 4],
  'ū': ['u', 1], 'ú': ['u', 2], 'ǔ': ['u', 3], 'ù': ['u', 4],
  'ǖ': ['ü', 1], 'ǘ': ['ü', 2], 'ǚ': ['ü', 3], 'ǜ': ['ü', 4],
};

function convertSyllableToNumberTone(syllable) {
  if (!syllable) return null;
  let tone = 5; // 轻声默认 5
  let core = '';
  for (const ch of syllable) {
    if (toneMap[ch]) {
      const [base, n] = toneMap[ch];
      core += base;
      tone = n;
    } else {
      core += ch;
    }
  }
  core = core.toLowerCase()
    .replace(/·/g, '')
    .replace(/[^a-zü]/gi, '')
    .replace(/v/g, 'ü');
  if (!core) return null;
  return core + String(tone);
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = { hostname: u.hostname, path: u.pathname + (u.search || ''), protocol: u.protocol, headers: { 'user-agent': 'Mozilla/5.0', 'accept': 'application/json,text/plain,*/*' } };
    const req = https.get(options, res => {
      if (res.headers.location && res.statusCode >= 300 && res.statusCode < 400) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        fetchJSON(next).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode));
        res.resume();
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { try { req.destroy(); } catch {} reject(new Error('timeout')); });
  });
}

async function run() {
  console.log('Downloading idioms from sources ...');
  let arr = [];
  for (const url of SRC_URLS) {
    try {
      console.log('Trying', url);
      const raw = await fetchJSON(url);
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 1000) { arr = parsed; console.log('Fetched from', url, 'count', parsed.length); break; }
    } catch (e) {
      console.warn('Source failed:', url, e.message);
    }
  }
  if (arr.length === 0) console.warn('All sources failed, continue with local merge only');

  const outMap = new Map();
  let processed = 0;
  for (const item of arr) {
    const text = (item.word || '').trim();
    const pin = (item.pinyin || '').trim();
    if (!text || text.length !== 4) continue;
    if (!pin) continue;
    const syllables = pin.split(/\s+/).filter(Boolean);
    if (syllables.length !== 4) continue;
    const converted = syllables.map(convertSyllableToNumberTone);
    if (converted.some(x => !x)) continue;
    outMap.set(text, converted);
    processed++;
    if (OPT.max && processed >= OPT.max) break;
  }

  function mergeLocal(file) {
    try {
      const p = path.join(__dirname, '..', 'data', file);
      if (!fs.existsSync(p)) return;
      const content = fs.readFileSync(p, 'utf8');
      const arr = JSON.parse(content);
      if (!Array.isArray(arr)) return;
      for (const it of arr) {
        const text = (it.text || '').trim();
        const pinyin = Array.isArray(it.pinyin) ? it.pinyin.map(x => String(x)) : [];
        if (!text || text.length !== 4) continue;
        if (pinyin.length !== 4) continue;
        outMap.set(text, pinyin);
      }
      console.log('Merged local file:', file);
    } catch (e) {
      console.warn('Skip local file due to error:', file, e.message);
    }
  }

  mergeLocal('idioms.full.json');
  mergeLocal('idioms.json');
  mergeLocal('idioms.extra.json');

  const result = Array.from(outMap.entries()).map(([text, pinyin]) => ({ text, pinyin }));
  result.sort((a, b) => a.text.localeCompare(b.text, 'zh-CN'));

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), 'utf8');
  console.log('Written', result.length, 'idioms to', OUT_FILE);
}

run().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});

