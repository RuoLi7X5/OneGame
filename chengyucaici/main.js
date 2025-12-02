const INITIALS = ['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];

function normalizeCore(core) {
  return core.replace('v','ü');
}

function splitSyllable(s) {
  const tone = Number(s.slice(-1));
  const coreRaw = s.slice(0, -1).toLowerCase();
  const core = normalizeCore(coreRaw);
  let initial = '';
  for (const i of INITIALS) {
    if (core.startsWith(i)) { initial = i; break; }
  }
  const final = core.slice(initial.length);
  return { initial, final, tone };
}

function tally(values) {
  const t = new Map();
  for (const v of values) t.set(v, (t.get(v) || 0) + 1);
  return t;
}

function scoreGuess(answerChars, answerPinyin, guessChars, guessPinyin) {
  const a = answerPinyin.map(splitSyllable);
  const g = guessPinyin.map(splitSyllable);
  const res = Array(4).fill(0).map(() => ({
    charStatus: 'absent', initialStatus: 'absent', finalStatus: 'absent', toneStatus: 'absent'
  }));

  const aInit = a.map(x => x.initial), gInit = g.map(x => x.initial);
  const aFin  = a.map(x => x.final),   gFin  = g.map(x => x.final);
  const aTon  = a.map(x => String(x.tone)), gTon = g.map(x => String(x.tone));

  const initLeft = tally(aInit), finLeft = tally(aFin), tonLeft = tally(aTon);

  for (let i = 0; i < 4; i++) {
    if (guessChars[i] === answerChars[i]) res[i].charStatus = 'correct';
    if (gInit[i] === aInit[i]) { res[i].initialStatus = 'correct'; initLeft.set(gInit[i], (initLeft.get(gInit[i])||0) - 1); }
    if (gFin[i]  === aFin[i])  { res[i].finalStatus   = 'correct';  finLeft.set(gFin[i],  (finLeft.get(gFin[i])||0)   - 1); }
    if (gTon[i]  === aTon[i])  { res[i].toneStatus    = 'correct';  tonLeft.set(gTon[i],  (tonLeft.get(gTon[i])||0)   - 1); }
  }

  for (let i = 0; i < 4; i++) {
    const gi = gInit[i], gf = gFin[i], gt = gTon[i];
    if (res[i].initialStatus === 'absent' && (initLeft.get(gi) || 0) > 0) { res[i].initialStatus = 'present'; initLeft.set(gi, initLeft.get(gi)-1); }
    if (res[i].finalStatus   === 'absent' && (finLeft.get(gf)  || 0) > 0) { res[i].finalStatus   = 'present';  finLeft.set(gf,  finLeft.get(gf)-1);  }
    if (res[i].toneStatus    === 'absent' && (tonLeft.get(gt)  || 0) > 0) { res[i].toneStatus    = 'present';  tonLeft.set(gt,  tonLeft.get(gt)-1);  }
  }

  return res;
}

const store = {
  get() {
    const raw = localStorage.getItem('idiom-game');
    return raw ? JSON.parse(raw) : null;
  },
  set(state) {
    localStorage.setItem('idiom-game', JSON.stringify(state));
  },
  clear() { localStorage.removeItem('idiom-game'); }
};

async function loadIdioms() {
  const map = new Map();
  async function tryLoad(url) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return;
      const list = await resp.json();
      if (!Array.isArray(list)) return;
      for (const it of list) {
        const text = (it.text || '').trim();
        const pinyin = Array.isArray(it.pinyin) ? it.pinyin : [];
        if (!text || text.length !== 4) continue;
        if (pinyin.length !== 4) continue;
        map.set(text, { text, pinyin });
      }
    } catch {}
  }
  await tryLoad('./data/idioms.full.json');
  await tryLoad('./data/idioms.json');
  await tryLoad('./data/idioms.extra.json');
  const res = Array.from(map.values());
  if (res.length > 0) return res;
  return [];
}

function hashDateKey(dateStr) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 131 + dateStr.charCodeAt(i)) >>> 0;
  return h;
}

function pickDailyId(list) {
  const today = new Date();
  const key = today.toISOString().slice(0,10);
  const idx = hashDateKey(key) % list.length;
  return { idx, key };
}

function setupUI(state, idioms) {
  const grid = document.getElementById('grid');
  const input = document.getElementById('guessInput');
  const submit = document.getElementById('submitBtn');
  const msg = document.getElementById('message');
  const resetBtn = document.getElementById('resetBtn');
  const randomBtn = document.getElementById('randomBtn');
  const shareBtn = document.getElementById('shareBtn');
  const hintBtn = document.getElementById('hintBtn');
  const hintWrap = document.getElementById('hint');
  const overlay = document.getElementById('startOverlay');
  const startBtn = document.getElementById('startBtn');
  const winModal = document.getElementById('winModal');
  const winClose = document.getElementById('winClose');
  const winAnswerEl = document.getElementById('winAnswer');
  const winExplainEl = document.getElementById('winExplain');

  let isComposing = false;
  function enforceLimit() {
    const v = input.value;
    if (v.length > 4) input.value = v.slice(0,4);
  }
  input.addEventListener('compositionstart', () => { isComposing = true; });
  input.addEventListener('compositionend', () => { isComposing = false; enforceLimit(); });
  input.addEventListener('input', () => { if (isComposing) return; enforceLimit(); });

  function render() {
    if (!state.started) {
      grid.innerHTML = '';
      msg.textContent = '';
      if (hintWrap) hintWrap.innerHTML = '';
      return;
    }
    grid.innerHTML = '';
    const rows = state.guesses.length;
    for (let r = 0; r < rows; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'row';
      const guess = state.guesses[r];
      for (let c = 0; c < 4; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const tags = document.createElement('div');
        tags.className = 'tags';
        const tInitial = document.createElement('span'); tInitial.className = 'tag';
        const tFinal   = document.createElement('span'); tFinal.className   = 'tag';
        const tTone    = document.createElement('span'); tTone.className    = 'tag';
        tags.appendChild(tInitial); tags.appendChild(tFinal); tags.appendChild(tTone);
        const ch = document.createElement('div'); ch.className = 'char'; ch.textContent = guess ? guess.text[c] : '';
        cell.appendChild(tags); cell.appendChild(ch);
        rowEl.appendChild(cell);

        if (guess) {
          const s = guess.score[c];
          const p = guess.parts[c];
          tInitial.textContent = p.initial || '-';
          tFinal.textContent = p.final || '-';
          tTone.textContent = String(p.tone);
          tInitial.classList.add(s.initialStatus);
          tFinal.classList.add(s.finalStatus);
          tTone.classList.add(s.toneStatus);
        }
      }
      grid.appendChild(rowEl);
    }
    msg.textContent = state.win ? `恭喜！正确答案：${state.answer.text}` : '';

    if (hintWrap) {
      hintWrap.innerHTML = '';
      const snap = state.hint;
      if (snap && Array.isArray(snap) && snap.length === 4) {
        for (let c = 0; c < 4; c++) {
          const cell = document.createElement('div');
          cell.className = 'cell';
          const tags = document.createElement('div');
          tags.className = 'tags';
          const tInitial = document.createElement('span'); tInitial.className = 'tag';
          const tFinal   = document.createElement('span'); tFinal.className   = 'tag';
          const tTone    = document.createElement('span'); tTone.className    = 'tag';
          tags.appendChild(tInitial); tags.appendChild(tFinal); tags.appendChild(tTone);
          const ch = document.createElement('div'); ch.className = 'char'; ch.textContent = '?';
          tInitial.textContent = snap[c].initial || '?';
          tFinal.textContent = snap[c].final || '?';
          tTone.textContent = snap[c].tone != null ? String(snap[c].tone) : '?';
          cell.appendChild(tags); cell.appendChild(ch);
          hintWrap.appendChild(cell);
        }
      }
    }
  }

  function submitGuess() {
    const text = input.value.trim();
    if (text === '若离求助') { toast(`答案：${state.answer.text}`); msg.textContent = `答案：${state.answer.text}`; input.value = ''; return; }
    if (text.length !== 4) { toast('请输入四字成语'); return; }
    const found = idioms.find(x => x.text === text);
    if (!found) { toast('检查是否属于成语'); return; }
    if (state.win) { toast('已通关'); return; }

    const guessPinyin = found.pinyin;
    const score = scoreGuess(state.answer.text.split(''), state.answer.pinyin, text.split(''), guessPinyin);
    const parts = guessPinyin.map(splitSyllable);
    state.guesses.push({ text, score, parts });
    if (text === state.answer.text) state.win = true;
    store.set(state);
    input.value = '';
    render();
    if (text === state.answer.text) {
      showWinModal(state.answer.text);
    }
  }

  function updateStartedUI() {
    overlay.style.display = state.started ? 'none' : 'grid';
    input.disabled = !state.started;
    submit.disabled = !state.started;
    resetBtn.disabled = !state.started;
    randomBtn.disabled = !state.started;
    shareBtn.disabled = !state.started;
    if (hintBtn) hintBtn.disabled = !state.started;
  }

  startBtn.addEventListener('click', () => {
    state.started = true;
    store.set(state);
    updateStartedUI();
    render();
  });

  submit.addEventListener('click', submitGuess);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submitGuess(); });
  resetBtn.addEventListener('click', () => { store.clear(); location.reload(); });
  randomBtn.addEventListener('click', () => {
    const idx = Math.floor(Math.random() * idioms.length);
    const answer = idioms[idx];
    const newState = { mode: 'practice', answer, guesses: [], win: false, started: false, hint: null };
    store.set(newState);
    location.reload();
  });
  shareBtn.addEventListener('click', () => {
    const lines = state.guesses.map(g => g.score.map(s => {
      const a = s.initialStatus === 'correct' ? '🟩' : s.initialStatus === 'present' ? '🟨' : '⬛';
      const b = s.finalStatus   === 'correct' ? '🟩' : s.finalStatus   === 'present' ? '🟨' : '⬛';
      const c = s.toneStatus    === 'correct' ? '🟩' : s.toneStatus    === 'present' ? '🟨' : '⬛';
      return a+b+c;
    }).join(' ')).join('\n');
    const text = `成语拼音猜测 ${state.win ? '通关' : '未通关'}\n${lines}`;
    const w = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject();
    w.then(() => toast('结果已复制到剪贴板')).catch(() => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        toast(ok ? '结果已复制到剪贴板' : '已生成结果，请手动复制');
      } catch {
        toast('已生成结果，请手动复制');
      }
    });
  });

  render();
  updateStartedUI();

  function computeHintSnapshot() {
    const snap = Array(4).fill(0).map(() => ({ initial: '?', final: '?', tone: '?' }));
    for (let i = 0; i < state.guesses.length; i++) {
      const g = state.guesses[i];
      for (let c = 0; c < 4; c++) {
        const s = g.score[c];
        const p = g.parts[c];
        if (s.initialStatus === 'correct') snap[c].initial = p.initial || '?';
        if (s.finalStatus   === 'correct') snap[c].final   = p.final   || '?';
        if (s.toneStatus    === 'correct') snap[c].tone    = p.tone    != null ? p.tone : '?';
      }
    }
    return snap;
  }

  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      state.hint = computeHintSnapshot();
      store.set(state);
      render();
    });
  }

  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  async function fetchExplain(word) {
    try {
      const resp1 = await fetch('./data/explain.json');
      if (resp1 && resp1.ok) {
        const map = await resp1.json();
        if (map && typeof map === 'object' && map[word]) return String(map[word]);
      }
    } catch {}
    try {
      const resp = await fetch('./data/sujuku.sql');
      if (!resp.ok) return null;
      const sql = await resp.text();
      const re = new RegExp("INSERT\\s+INTO\\s+`?cy`?\\s+VALUES\\s*\\([^)]*?,\\s*'" + escapeRegex(word) + "'\\s*,\\s*'[^']*'\\s*,\\s*'([^']*)'", 'i');
      const m = re.exec(sql);
      if (m) return m[1];
      return null;
    } catch { return null; }
  }
  async function showWinModal(word) {
    if (!winModal) return;
    winAnswerEl.textContent = word || '';
    winExplainEl.textContent = '加载中…';
    winModal.style.display = 'grid';
    const exp = await fetchExplain(word);
    winExplainEl.textContent = exp || '暂无释义';
  }
  if (winClose && winModal) {
    winClose.addEventListener('click', () => { winModal.style.display = 'none'; });
  }
}

function toast(t) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = t;
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); }, 1800);
}

async function start() {
  const idioms = await loadIdioms();
  let state = store.get();
  if (!state) {
    const { idx } = pickDailyId(idioms);
    const answer = idioms[idx];
    state = { mode: 'daily', answer, guesses: [], win: false, started: false, hint: null };
    store.set(state);
  }
  if (state.started === undefined) { state.started = false; store.set(state); }
  if (state.hint === undefined) { state.hint = null; store.set(state); }
  setupUI(state, idioms);
}

start();
