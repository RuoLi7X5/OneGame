const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const FULL_FILE = path.join(DATA, 'idioms.full.json');
const EXTRA_FILE = path.join(DATA, 'idioms.extra.json');
const NORM_FILE = path.join(DATA, 'idioms.json');

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
const FINALS = ['a','o','e','i','ai','ei','ao','ou','an','en','ang','eng','er','ia','ie','iao','iu','ian','in','iang','ing','iong','ua','uo','uai','ui','uan','un','uang','ong','u','ue','ü','üe','üan','ün'];
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
  if (fin === 'i' && !init) return false;
  return FINALS.includes(fin);
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
}

function mapDict(arr) {
  const m = new Map();
  for (const it of arr) {
    const t = (it && it.text) ? String(it.text).trim() : '';
    const p = Array.isArray(it && it.pinyin) ? it.pinyin.map(String) : [];
    if (isChineseWordFour(t) && p.length === 4) m.set(t, p);
  }
  return m;
}

function cleanFull() {
  const full = readJson(FULL_FILE);
  const extra = readJson(EXTRA_FILE);
  const norm = readJson(NORM_FILE);

  const mExtra = mapDict(extra);
  const mNorm = mapDict(norm);

  const outMap = new Map();
  let replacedExtra = 0, replacedNorm = 0, kept = 0, dropped = 0, fixedConv = 0;

  for (const it of full) {
    const text = (it && it.text) ? String(it.text).trim() : '';
    let pins = Array.isArray(it && it.pinyin) ? it.pinyin.map(String) : [];
    if (!isChineseWordFour(text)) { dropped++; continue; }
    if (mExtra.has(text)) { outMap.set(text, mExtra.get(text)); replacedExtra++; continue; }
    if (mNorm.has(text)) { outMap.set(text, mNorm.get(text)); replacedNorm++; continue; }

    if (pins.length === 4) {
      const conv = pins.map(convertSyllableToNumberTone);
      const ok = conv.every(isLikelyPinyinToken);
      if (ok) { outMap.set(text, conv.map(String)); if (conv.some((v,i)=>v!==pins[i])) fixedConv++; kept++; continue; }
    }
    dropped++;
  }

  const outArr = Array.from(outMap.entries()).map(([text, pinyin]) => ({ text, pinyin }));
  outArr.sort((a,b) => a.text.localeCompare(b.text,'zh-CN'));
  fs.writeFileSync(FULL_FILE, JSON.stringify(outArr, null, 2), 'utf8');
  console.log('cleaned', { in_count: Array.isArray(full)?full.length:0, out_count: outArr.length, replacedExtra, replacedNorm, fixedConv, kept, dropped, full_file: FULL_FILE });
}

cleanFull();
