const fs = require('fs');
const path = require('path');

const IN_SQL = path.join(__dirname, '..', 'data', 'sujuku.sql');
const OUT_FILE = path.join(__dirname, '..', 'data', 'idioms.extra.json');

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
  if (tone == null) return null;
  return core + String(tone);
}

const INITIALS = ['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];
const FINALS = ['a','o','e','ai','ei','ao','ou','an','en','ang','eng','er','ia','ie','iao','iu','ian','in','iang','ing','iong','ua','uo','uai','ui','uan','un','uang','ong','u','ue','ü','üe','üan','ün'];
function isChineseWordFour(s){ return /^[\u4e00-\u9fff]{4}$/.test(String(s)); }
function isLikelyPinyinToken(token) {
  const conv = convertSyllableToNumberTone(token);
  if (!conv) return false;
  if (!/[1-4]$/.test(conv)) return false;
  const core = conv.replace(/[1-4]$/,'');
  if (!/[aeiouü]/.test(core)) return false;
  let init = '';
  for (const pre of INITIALS) { if (core.startsWith(pre)) { init = pre; break; } }
  const fin = core.slice(init.length);
  return FINALS.includes(fin);
}

function parseSqlText(sql) {
  const out = [];
  const re = /INSERT\s+INTO\s+`?cy`?\s+VALUES\s*\([^)]*?,\s*'([^']+)'\s*,\s*'([^']*)'/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const name = m[1];
    const spell = m[2];
    if (!isChineseWordFour(name)) continue;
    const norm = String(spell).replace(/[，、；。]/g,' ').replace(/[\u3000\s]+/g,' ').trim();
    const parts = norm.split(/\s+/).filter(Boolean);
    const conv = parts.map(convertSyllableToNumberTone).filter(Boolean);
    if (conv.length !== 4) continue;
    if (!conv.every(isLikelyPinyinToken)) continue;
    out.push({ text: name, pinyin: conv });
  }
  return out;
}

function run() {
  const sql = fs.readFileSync(IN_SQL, 'utf8');
  const items = parseSqlText(sql);
  const map = new Map();
  for (const it of items) map.set(it.text, it.pinyin);
  if (fs.existsSync(OUT_FILE)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
      if (Array.isArray(prev)) {
        for (const it of prev) {
          const t = (it.text||'').trim();
          const p = Array.isArray(it.pinyin) ? it.pinyin.map(String) : [];
          if (isChineseWordFour(t) && p.length===4 && p.every(isLikelyPinyinToken) && !map.has(t)) map.set(t, p);
        }
      }
    } catch {}
  }
  const arr = Array.from(map.entries()).map(([text, pinyin]) => ({ text, pinyin }));
  arr.sort((a,b) => a.text.localeCompare(b.text,'zh-CN'));
  fs.writeFileSync(OUT_FILE, JSON.stringify(arr, null, 2), 'utf8');
  console.log('written', { count: arr.length, out: OUT_FILE });
}

run();

