const INITIALS = ['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];

const FINALS = ['a','o','e','ai','ei','ao','ou','an','en','ang','eng','er','ia','ie','iao','iu','ian','in','iang','ing','iong','ua','uo','uai','ui','uan','un','uang','ong','u','ue','ü','üe','üan','ün'];
const ALL_INITIALS = ['', ...INITIALS];

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
    charStatus: 'absent', initialStatus: 'absent', finalStatus: 'absent', toneStatus: 'absent', comboStatus: false
  }));

  const aInit = a.map(x => x.initial), gInit = g.map(x => x.initial);
  const aFin  = a.map(x => x.final),   gFin  = g.map(x => x.final);
  const aTon  = a.map(x => String(x.tone)), gTon = g.map(x => String(x.tone));

  // Combo logic: treat (initial + final) as a unit
  // If user guesses (suo), and answer has (suo) at another position, mark comboStatus = true
  // We track frequency of combos in answer
  const aCombos = a.map(x => x.initial + ',' + x.final);
  const gCombos = g.map(x => x.initial + ',' + x.final);
  const comboLeft = tally(aCombos);

  const initLeft = tally(aInit), finLeft = tally(aFin), tonLeft = tally(aTon);

  for (let i = 0; i < 4; i++) {
    if (guessChars[i] === answerChars[i]) res[i].charStatus = 'correct';
    
    // Check if exact match for parts
    const isInitCorrect = (gInit[i] === aInit[i]);
    const isFinCorrect  = (gFin[i]  === aFin[i]);
    const isTonCorrect  = (gTon[i]  === aTon[i]);

    if (isInitCorrect) { res[i].initialStatus = 'correct'; initLeft.set(gInit[i], (initLeft.get(gInit[i])||0) - 1); }
    if (isFinCorrect)  { res[i].finalStatus   = 'correct';  finLeft.set(gFin[i],  (finLeft.get(gFin[i])||0)   - 1); }
    if (isTonCorrect)  { res[i].toneStatus    = 'correct';  tonLeft.set(gTon[i],  (tonLeft.get(gTon[i])||0)   - 1); }
    
    // For combo, if both initial and final are correct at this position, consume it from comboLeft
    // Note: strict matching for combo consumption based on position match
    if (isInitCorrect && isFinCorrect) {
      const c = gCombos[i];
      comboLeft.set(c, (comboLeft.get(c)||0) - 1);
    }
  }

  for (let i = 0; i < 4; i++) {
    const gi = gInit[i], gf = gFin[i], gt = gTon[i];
    if (res[i].initialStatus === 'absent' && (initLeft.get(gi) || 0) > 0) { res[i].initialStatus = 'present'; initLeft.set(gi, initLeft.get(gi)-1); }
    if (res[i].finalStatus   === 'absent' && (finLeft.get(gf)  || 0) > 0) { res[i].finalStatus   = 'present';  finLeft.set(gf,  finLeft.get(gf)-1);  }
    if (res[i].toneStatus    === 'absent' && (tonLeft.get(gt)  || 0) > 0) { res[i].toneStatus    = 'present';  tonLeft.set(gt,  tonLeft.get(gt)-1);  }
    
    // Check combo present
    // Only if not fully correct at this position (meaning at least one part is not correct, or position is wrong)
    // Actually, we only care if the combo (initial+final) is valid elsewhere
    // If current position is already both correct, we don't mark comboStatus (it's just correct)
    const isInitCorrect = (gInit[i] === aInit[i]);
    const isFinCorrect  = (gFin[i]  === aFin[i]);
    if (!(isInitCorrect && isFinCorrect)) {
      const c = gCombos[i];
      if ((comboLeft.get(c) || 0) > 0) {
        res[i].comboStatus = true;
        comboLeft.set(c, comboLeft.get(c) - 1);
      }
    }
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
  // Daily logic removed, keep function or remove if unused. 
  // But wait, we might not need this function anymore if we always do random.
  // Let's just keep it simple and rely on random generation in start().
  return { idx: 0, key: '' };
}

function setupUI(state, idioms) {
  const grid = document.getElementById('grid');
  const input = document.getElementById('guessInput');
  const submit = document.getElementById('submitBtn');
  const msg = document.getElementById('message');
  const resetBtn = document.getElementById('resetBtn');
  const randomBtn = document.getElementById('randomBtn');
  const playAgainBtn = document.getElementById('playAgainBtn');
  // shareBtn removed
  const hintBtn = document.getElementById('hintBtn');
  const queryBtn = document.getElementById('queryBtn');
  const queryModal = document.getElementById('queryModal');
  const queryClose = document.getElementById('queryClose');
  const doQueryBtn = document.getElementById('doQueryBtn');
  const queryResult = document.getElementById('queryResult');
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
        const pinyinGroup = document.createElement('div');
        pinyinGroup.className = 'pinyin-group';

        const tInitial = document.createElement('span'); tInitial.className = 'tag';
        const tFinal   = document.createElement('span'); tFinal.className   = 'tag';
        const tTone    = document.createElement('span'); tTone.className    = 'tag';
        
        pinyinGroup.appendChild(tInitial); 
        pinyinGroup.appendChild(tFinal);
        tags.appendChild(pinyinGroup); 
        tags.appendChild(tTone);

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
          if (s.comboStatus) {
            pinyinGroup.classList.add('combo-match');
          }
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
    // randomBtn and shareBtn removed or hidden
    if (hintBtn) hintBtn.disabled = !state.started;
    if (queryBtn) queryBtn.disabled = !state.started;
  }

  startBtn.addEventListener('click', () => {
    state.started = true;
    store.set(state);
    updateStartedUI();
    render();
  });

  submit.addEventListener('click', submitGuess);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submitGuess(); });
  function startNewGame() {
    const idx = Math.floor(Math.random() * idioms.length);
    const answer = idioms[idx];
    const newState = { mode: 'practice', answer, guesses: [], win: false, started: true, hint: null };
    store.set(newState);
    location.reload();
  }

  resetBtn.addEventListener('click', startNewGame);
  if (playAgainBtn) playAgainBtn.addEventListener('click', startNewGame);

  render();
  updateStartedUI();

  function computeHintSnapshot() {
    const tones = ['1', '2', '3', '4'];
    const possibilities = Array(4).fill(0).map(() => ({
      initial: new Set(ALL_INITIALS),
      final: new Set(FINALS),
      tone: new Set(tones)
    }));

    const exactCounts = { initial: new Map(), final: new Map(), tone: new Map() };
    const minCounts = { initial: new Map(), final: new Map(), tone: new Map() };

    // Helper to process a dimension
    const processDim = (dim, getValueStr) => {
      for (const g of state.guesses) {
        const values = [];
        const statuses = [];
        for (let i=0; i<4; i++) {
          const val = getValueStr(g.parts[i]);
          const status = g.score[i][dim + 'Status'];
          values.push(val);
          statuses.push(status);

          // Local constraints
          if (status === 'correct') {
            possibilities[i][dim].clear();
            possibilities[i][dim].add(val);
          } else if (status === 'absent') {
            // Only delete if absent. 
            // Note: 'present' (yellow) means it is NOT at this position, so we can delete it too.
            possibilities[i][dim].delete(val);
          } else if (status === 'present') {
            possibilities[i][dim].delete(val);
          }
        }

        // Global constraints
        const valMap = new Map();
        for (let i=0; i<4; i++) {
          const v = values[i];
          if (!valMap.has(v)) valMap.set(v, { greens:[], yellows:[], grays:[] });
          const entry = valMap.get(v);
          if (statuses[i] === 'correct') entry.greens.push(i);
          else if (statuses[i] === 'present') entry.yellows.push(i);
          else entry.grays.push(i);
        }

        for (const [v, info] of valMap.entries()) {
          const count = info.greens.length + info.yellows.length;
          if (info.grays.length > 0) {
            // Exact count known
            exactCounts[dim].set(v, count);
          } else {
            // Min count known
            const curr = minCounts[dim].get(v) || 0;
            if (count > curr) minCounts[dim].set(v, count);
          }
        }
      }
    };

    processDim('initial', p => p.initial || '');
    processDim('final', p => p.final);
    processDim('tone', p => String(p.tone));

    // Advanced deduction loop
    let changed = true;
    while(changed) {
      changed = false;
      
      ['initial', 'final', 'tone'].forEach(dim => {
        // Check exact counts
        for (const [val, count] of exactCounts[dim].entries()) {
          const possibleSlots = [];
          for (let i=0; i<4; i++) {
            if (possibilities[i][dim].has(val)) possibleSlots.push(i);
          }
          if (possibleSlots.length === count) {
            for (const idx of possibleSlots) {
              if (possibilities[idx][dim].size > 1) {
                possibilities[idx][dim].clear();
                possibilities[idx][dim].add(val);
                changed = true;
              }
            }
          }
        }

        // Check min counts (if possibleSlots == count, they must be val)
        for (const [val, count] of minCounts[dim].entries()) {
           const possibleSlots = [];
           for (let i=0; i<4; i++) {
             if (possibilities[i][dim].has(val)) possibleSlots.push(i);
           }
           if (possibleSlots.length === count) {
             for (const idx of possibleSlots) {
               if (possibilities[idx][dim].size > 1) {
                 possibilities[idx][dim].clear();
                 possibilities[idx][dim].add(val);
                 changed = true;
               }
             }
           }
        }
        
        // Propagate fixed values (if exact count is known)
        for (const [val, count] of exactCounts[dim].entries()) {
          let fixedCount = 0;
          for(let i=0; i<4; i++) if(possibilities[i][dim].size === 1 && possibilities[i][dim].has(val)) fixedCount++;
          
          if (fixedCount === count) {
             // Remove val from all other slots
             for(let i=0; i<4; i++) {
               if (possibilities[i][dim].size > 1 && possibilities[i][dim].has(val)) {
                 possibilities[i][dim].delete(val);
                 changed = true;
               }
             }
          }
        }
      });
    }

    const snap = Array(4).fill(0).map((_, i) => ({
      initial: possibilities[i].initial.size === 1 ? [...possibilities[i].initial][0] : '?',
      final: possibilities[i].final.size === 1 ? [...possibilities[i].final][0] : '?',
      tone: possibilities[i].tone.size === 1 ? [...possibilities[i].tone][0] : '?'
    }));
    return snap;
  }

  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      state.hint = computeHintSnapshot();
      store.set(state);
      render();
    });
  }

  if (queryBtn && queryModal) {
    queryBtn.addEventListener('click', () => {
      queryModal.style.display = 'grid';
      // Pre-fill with hints if available
      const snap = computeHintSnapshot();
      const cols = queryModal.querySelectorAll('.query-col');
      for(let i=0; i<4; i++) {
        const inputs = cols[i].querySelectorAll('input');
        // Reset first
        inputs[0].value = ''; inputs[1].value = ''; inputs[2].value = '';
        
        if (snap[i].initial !== '?') inputs[0].value = snap[i].initial;
        if (snap[i].final !== '?') inputs[1].value = snap[i].final;
        if (snap[i].tone !== '?') inputs[2].value = snap[i].tone;
      }
      queryResult.innerHTML = '';
    });
    if (queryClose) queryClose.addEventListener('click', () => { queryModal.style.display = 'none'; });
  }

  if (doQueryBtn) {
    doQueryBtn.addEventListener('click', () => {
      const criteria = [];
      const cols = queryModal.querySelectorAll('.query-col');
      for (let i = 0; i < 4; i++) {
        const inputs = cols[i].querySelectorAll('input');
        criteria.push({
          initial: inputs[0].value.trim().toLowerCase(),
          final: inputs[1].value.trim().toLowerCase(),
          tone: inputs[2].value.trim()
        });
      }

      // Parse extra includes
      const qInclude = document.getElementById('qInclude');
      const extraRaw = qInclude ? qInclude.value.trim() : '';
      const extraIncludes = extraRaw ? extraRaw.split(/[\s,]+/).map(s => s.toLowerCase()) : [];

      const matches = idioms.filter(item => {
        if (!item.pinyin || item.pinyin.length !== 4) return false;
        const parts = item.pinyin.map(splitSyllable);
        
        // Check positional criteria
        for (let i = 0; i < 4; i++) {
          const c = criteria[i];
          const p = parts[i];
          if (c.initial && c.initial !== p.initial) return false;
          if (c.final && c.final !== p.final) return false;
          if (c.tone && c.tone !== String(p.tone)) return false;
        }

        // Check extra includes (must exist somewhere in the word)
        // We create a pool of all components in this idiom
        const pool = [];
        parts.forEach(p => {
          if (p.initial) pool.push(p.initial);
          if (p.final) pool.push(p.final);
          if (p.tone) pool.push(String(p.tone));
        });
        
        // Every required extra element must appear in the pool at least once
        // Note: simplistic check. If user types 'a a', it requires two 'a's? 
        // Current logic: yes, if we remove matched items from pool.
        // Let's implement "consumption" to support multiple same requirements.
        const tempPool = [...pool];
        for (const req of extraIncludes) {
          const idx = tempPool.indexOf(req);
          if (idx === -1) return false; // Requirement not found
          tempPool.splice(idx, 1); // Consume it
        }

        return true;
      });

      queryResult.innerHTML = '';
      if (matches.length === 0) {
        queryResult.textContent = '无匹配结果';
        return;
      }
      matches.forEach(m => {
        const el = document.createElement('div');
        el.className = 'result-item';
        el.innerHTML = `<div>${m.text}</div><div class="pinyin">${m.pinyin.join(' ')}</div>`;
        el.addEventListener('click', () => {
           input.value = m.text;
           queryModal.style.display = 'none';
        });
        queryResult.appendChild(el);
      });
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
    const idx = Math.floor(Math.random() * idioms.length);
    const answer = idioms[idx];
    state = { mode: 'practice', answer, guesses: [], win: false, started: false, hint: null };
    store.set(state);
  }
  if (state.started === undefined) { state.started = false; store.set(state); }
  if (state.hint === undefined) { state.hint = null; store.set(state); }
  setupUI(state, idioms);
}

start();
