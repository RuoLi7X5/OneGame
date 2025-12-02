const fs = require('fs');
const path = require('path');

const toneMap = {
  'ā': ['a', 1], 'á': ['a', 2], 'ǎ': ['a', 3], 'à': ['a', 4],
  'ē': ['e', 1], 'é': ['e', 2], 'ě': ['e', 3], 'è': ['e', 4],
  'ī': ['i', 1], 'í': ['i', 2], 'ǐ': ['i', 3], 'ì': ['i', 4],
  'ō': ['o', 1], 'ó': ['o', 2], 'ǒ': ['o', 3], 'ò': ['o', 4],
  'ū': ['u', 1], 'ú': ['u', 2], 'ǔ': ['u', 3], 'ù': ['u', 4],
  'ǖ': ['ü', 1], 'ǘ': ['ü', 2], 'ǚ': ['ü', 3], 'ǜ': ['ü', 4],
};

function normalizeSyllable(s) {
  if (!s) return null;
  s = String(s).trim();
  let hasDiacritic = false;
  for (const k in toneMap) { if (s.includes(k)) { hasDiacritic = true; break; } }
  if (hasDiacritic) {
    let tone = 5;
    let core = '';
    for (const ch of s) {
      if (toneMap[ch]) { const [base, n] = toneMap[ch]; core += base; tone = n; } else { core += ch; }
    }
    core = core.toLowerCase().replace(/·/g, '').replace(/[^a-zü]/gi, '').replace(/v/g, 'ü');
    if (!core) return null;
    return core + String(tone);
  }
  const last = s.slice(-1);
  if (/^[1-5]$/.test(last)) {
    const core = s.slice(0, -1).toLowerCase().replace(/v/g, 'ü');
    return core + last;
  }
  const core = s.toLowerCase().replace(/v/g, 'ü');
  return core + '5';
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { in: null, out: path.join(__dirname, '..', 'data', 'idioms.extra.json'), type: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--in') out.in = args[++i];
    else if (a === '--out') out.out = args[++i];
    else if (a === '--type') out.type = args[++i];
  }
  if (!out.in) throw new Error('missing --in path');
  if (!out.type) {
    const ext = path.extname(out.in).toLowerCase();
    out.type = ext === '.csv' ? 'csv' : ext === '.tsv' ? 'tsv' : 'txt';
  }
  return out;
}

function readDict() {
  const dict = new Map();
  const files = ['idioms.full.json', 'idioms.json'];
  for (const f of files) {
    const p = path.join(__dirname, '..', 'data', f);
    if (!fs.existsSync(p)) continue;
    try {
      const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (!Array.isArray(arr)) continue;
      for (const it of arr) {
        const text = (it.text || '').trim();
        const pinyin = Array.isArray(it.pinyin) ? it.pinyin.map(x => String(x)) : [];
        if (!text || text.length !== 4) continue;
        if (pinyin.length !== 4) continue;
        dict.set(text, pinyin);
      }
    } catch {}
  }
  return dict;
}

function parseCSV(content, sep) {
  const lines = content.split(/\r?\n/).filter(x => x.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(sep).map(s => s.trim().toLowerCase());
  const hasHeader = header.includes('text') || header.includes('pinyin') || header.includes('p1');
  const start = hasHeader ? 1 : 0;
  const rows = [];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(s => s.trim());
    if (hasHeader) {
      const idxText = header.indexOf('text');
      const idxPinyin = header.indexOf('pinyin');
      const idxs = [header.indexOf('p1'), header.indexOf('p2'), header.indexOf('p3'), header.indexOf('p4')];
      const text = idxText >= 0 ? cols[idxText] : cols[0];
      let pins = [];
      if (idxPinyin >= 0) { pins = (cols[idxPinyin] || '').split(/\s+/).filter(Boolean); }
      else if (idxs.every(ix => ix >= 0)) { pins = idxs.map(ix => cols[ix]); }
      rows.push({ text, pinyin: pins });
    } else {
      const text = cols[0];
      const pins = cols.slice(1).join(' ').split(/\s+/).filter(Boolean);
      rows.push({ text, pinyin: pins });
    }
  }
  return rows;
}

function parseTXT(content) {
  const lines = content.split(/\r?\n/).filter(x => x.trim().length > 0);
  const rows = [];
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const text = parts[0];
    const pins = parts.slice(1);
    rows.push({ text, pinyin: pins });
  }
  return rows;
}

function main() {
  const opt = parseArgs();
  const content = fs.readFileSync(opt.in, 'utf8');
  let items = [];
  if (opt.type === 'csv') items = parseCSV(content, ',');
  else if (opt.type === 'tsv') items = parseCSV(content, '\t');
  else items = parseTXT(content);

  const dict = readDict();
  const merged = new Map();
  const extraPath = path.resolve(opt.out);
  if (fs.existsSync(extraPath)) {
    try {
      const arr = JSON.parse(fs.readFileSync(extraPath, 'utf8'));
      if (Array.isArray(arr)) {
        for (const it of arr) { const t = (it.text || '').trim(); if (t && t.length === 4 && Array.isArray(it.pinyin) && it.pinyin.length === 4) merged.set(t, it.pinyin.map(x => String(x))); }
      }
    } catch {}
  }

  let added = 0, updated = 0, skipped = 0;
  for (const row of items) {
    const text = (row.text || '').trim();
    if (!text || text.length !== 4) { skipped++; continue; }
    let pins = Array.isArray(row.pinyin) ? row.pinyin.filter(Boolean) : [];
    if (pins.length === 1) pins = pins[0].split(/\s+/).filter(Boolean);
    if (pins.length === 4) pins = pins.map(normalizeSyllable);
    if (pins.length !== 4 || pins.some(x => !x)) {
      const fromDict = dict.get(text);
      if (fromDict && fromDict.length === 4) pins = fromDict.map(x => String(x));
    }
    if (pins.length !== 4 || pins.some(x => !x)) { skipped++; continue; }
    if (merged.has(text)) { merged.set(text, pins); updated++; }
    else { merged.set(text, pins); added++; }
  }

  const outArr = Array.from(merged.entries()).map(([text, pinyin]) => ({ text, pinyin }));
  outArr.sort((a, b) => a.text.localeCompare(b.text, 'zh-CN'));
  fs.writeFileSync(extraPath, JSON.stringify(outArr, null, 2), 'utf8');
  console.log('done', { added, updated, skipped, total: outArr.length, out: extraPath });
}

main();

