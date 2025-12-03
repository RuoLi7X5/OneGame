const qs = s => document.querySelector(s);
const sizeSelect = qs('#sizeSelect');
const modeSelect = qs('#modeSelect');
const patternSelect = qs('#patternSelect');
const reverseBtn = qs('#reverseBtn');
const setDefaultBtn = qs('#setDefault');
const startBtn = qs('#startBtn');
const board = qs('#board');
const timerEl = qs('#timer');
const nextEl = qs('#nextTarget');
const lastEl = qs('#lastTime');
const bestEl = qs('#bestTime');
const mainEl = qs('#main');
const modal = qs('#resultModal');
const modalClose = qs('#modalClose');
const modalTitle = qs('#modalTitle');
const modalTime = qs('#modalTime');
const modalMeta = qs('#modalMeta');
const modalMistakesRow = qs('#modalMistakesRow');
const modalMistakes = qs('#modalMistakes');
const playAgainBtn = qs('#playAgain');
const returnBtn = qs('#returnBtn');
const foxBubble = qs('#foxBubble');
const motdEl = qs('#motd');
const modalQuote = qs('#modalQuote');
const princeImg = qs('#princeImg');
const foxSceneImg = qs('#foxSceneImg');
const foxImg = qs('#foxImg');

const KEY_DEFAULT_SIZE = 'shuerte.defaultSize';
const KEY_DEFAULT_MODE = 'shuerte.defaultMode';
const KEY_DEFAULT_PATTERN = 'shuerte.defaultPattern';
const KEY_REVERSE = 'shuerte.reverse';
const KEY_BEST = 'shuerte.bestTimes';
const KEY_LAST = 'shuerte.lastTimes';

const state = { size: 5, mode: 'simple', pattern: 'normal', reverse: false, numbers: [], targets: [], next: 1, nextIndex: 0, started: false, startAt: 0, elapsedMs: 0, mistakes: 0, win: false, fail: false };

const BOARD_QUOTES = [
  "希望你能坚持到最后，有始有终",
  "做的不错啊，敢不敢再来一次",
  "倒是小瞧你了，挺厉害啊",
  "看起来遇到高手了",
  "风太大也吹不散你的专注",
  "小狐狸在旁边偷偷给你加油",
  "你点的比星星还闪亮",
  "保持节奏，胜利就在前方",
  "稳住，我们能赢",
  "比昨天更快一点点",
  "这速度，已经起飞",
  "再来一发漂亮的连击",
  "手指和脑袋都在发光",
  "这局你有点猛",
  "别紧张，你很稳",
  "我就知道你行",
  "你的专注力让小王子惊讶",
  "狐狸说：我押你赢",
  "冲刺吧，终点在招手",
  "快要创造小宇宙了",
  "你的节奏很迷人",
  "你是我见过最认真的人之一",
  "这局只是热身吧",
  "坚持就是胜利",
  "你在发光，我看到了",
  "每一下都很稳很准",
  "为你安排一朵小红花",
  "喜欢这种干脆的点击",
  "这速度，狐狸都眯眼了",
  "哎哟，这操作熟练",
  "你一定可以的",
  "今天的你，很强",
  "像呼吸一样自然",
  "专注是一种帅气",
  "再快一点点，就是纪录",
  "你在挑战自己",
  "这就是高手的气质",
  "下一步也会这么准吧",
  "你真的很细心",
  "继续保持",
  "我看见你在成长",
  "你在创造属于你的节奏",
  "这手速有点闪",
  "不慌不忙，恰到好处",
  "可可爱爱的小胜利也很重要",
  "可别被我夸到害羞",
  "哇，这一步真好",
  "你也太稳了吧",
  "友谊的小船已经升帆",
  "一点点再快一些",
  "不要停，音乐还在",
  "轻轻松松也能赢",
  "像风一样自如",
  "你是小狐狸的榜样",
  "我对你有信心",
  "有点秀哦",
  "这次节奏感满分",
  "再小的进步也值得纪念",
  "这一刻属于你",
  "再来一波漂亮操作",
  "你的手指很有天赋",
  "时间会被你按住",
  "你在打破自己的记录",
  "我要为你鼓掌",
  "认真就会不一样",
  "你在发光，真的",
  "这也太稳了吧",
  "你有一种让人安心的节奏",
  "这速度温柔又厉害",
  "你是我心里的冠军",
  "小王子也给你点赞",
  "狐狸说：就是这个感觉",
  "今天也要赢一赢",
  "你的速度像星光",
  "我猜你还能更快",
  "这手感绝了",
  "每一下都很到位",
  "就差一点点了",
  "冲呀，胜利在等你",
  "保持呼吸，保持专注",
  "你太灵动了",
  "这局我押你第一",
  "放心，你会赢的",
  "时间看起来已经被你驯服",
  "你配得上更好的成绩",
  "再按一下，就更接近梦想",
  "你让我看到了毅力",
  "世界会为你的专注留出路",
  "这进度非常可爱",
  "你在自己发光",
  "继续，风在为你加油",
  "你是今天的主角",
  "你的操作令人愉悦",
  "这一刻手与心同频",
  "小狐狸举旗为你呐喊",
  "你已经很棒啦",
  "再来一局也没问题",
  "你在成为更厉害的自己",
  "这就是认真带来的惊喜",
  "我看好你",
  "下一步也会很好",
  "你会让自己满意的",
  "努力本身就很可爱"
];

const MODAL_QUOTES = [
  "做的不错啊，敢不敢再来一次",
  "倒是小瞧你了，挺厉害啊",
  "看起来遇到高手了",
  "希望你能坚持到最后，有始有终",
  "狐狸打了两行彩带为你庆祝",
  "小王子递来一朵小花",
  "你值得这一份掌声",
  "再挑战一下更快的自己",
  "这次进步看得见",
  "漂亮的收尾",
  "你比想象中更强",
  "这就是专注的力量",
  "下一局再创纪录",
  "我就知道你能赢",
  "再快一点点就完美了",
  "你已经很棒了",
  "不服输的样子真可爱",
  "为你升起小旗子",
  "今天也收获了一份胜利",
  "风轻轻为你鼓掌",
  "再来一局吧",
  "这波稳定发挥",
  "这次很有质感",
  "你是我心里的冠军",
  "继续保持这份专注",
  "你的成绩很亮眼",
  "认真的人最帅",
  "狐狸说：可以再快哦",
  "小王子说：为你骄傲",
  "再来一次，说不定刷新最佳",
  "今天这份认真很动人",
  "你值得再被夸一次",
  "这就是高手的味道",
  "期待你下一次的爆发",
  "把节奏留在指尖",
  "请继续发光",
  "你让我看到了突破",
  "很有魅力的一局",
  "目标再高一点也能到达",
  "这份勇气很迷人",
  "记录已经向你点头",
  "胜利在向你微笑",
  "你是最懂自己的那个人",
  "这就是实力",
  "我很看好你",
  "认真就会赢",
  "这局值得收藏",
  "继续，下一程会更好",
  "你在和时间握手",
  "祝你下一局更快",
  "请继续保持",
  "你的节奏很优雅",
  "你配得上更好的数据",
  "这次很稳",
  "专注到让风低头",
  "用时很不错",
  "再来一局吧勇士",
  "路就在脚下",
  "我看到了你的努力",
  "你值得更多赞美",
  "这份认真我记住了",
  "继续向前",
  "下次会更好",
  "狐狸给你比个爱心",
  "你的名字会写进记录簿",
  "这次很完整",
  "下一次再冲刺",
  "你让时间温柔起来",
  "请收下这份掌声",
  "你有冠军气质",
  "我们再来一局",
  "这是值得炫耀的成绩",
  "你又赢了一次",
  "保持这份热爱",
  "节奏掌控得很好",
  "继续创造属于你的记录",
  "这次很漂亮",
  "你让风也变得可爱",
  "再试一次吧",
  "你的指尖在跳舞",
  "你值得每一次胜利",
  "你在与自己对话",
  "胜利喜欢你",
  "这份认真会被记住",
  "小王子在为你喝彩",
  "狐狸在给你鼓劲",
  "再刷新一下吧",
  "我相信你能更好",
  "你是配得上赞美的人",
  "再来一局，新的故事",
  "你把数字安排得明明白白",
  "继续向前就会遇到更好的自己",
  "你正在成为心里的冠军",
  "这份专注很打动我",
  "下次我们更快",
  "愿你永远有热爱",
  "这局很棒，继续吧"
];

function loadDefaults(){
  const ds = localStorage.getItem(KEY_DEFAULT_SIZE);
  const dm = localStorage.getItem(KEY_DEFAULT_MODE);
  const dp = localStorage.getItem(KEY_DEFAULT_PATTERN);
  const rv = localStorage.getItem(KEY_REVERSE);
  if (ds) state.size = Number(ds);
  if (dm) state.mode = dm;
  if (dp) state.pattern = dp;
  if (rv) state.reverse = rv === '1';
  sizeSelect.value = String(state.size);
  modeSelect.value = String(state.mode);
  patternSelect.value = String(state.pattern);
  reverseBtn.textContent = `倒序：${state.reverse?'开':'关'}`;
}

function formatMs(ms){
  const m = Math.floor(ms/60000);
  const s = Math.floor(ms%60000/1000);
  const t = Math.floor(ms%1000);
  const pad2 = n => String(n).padStart(2,'0');
  const pad3 = n => String(n).padStart(3,'0');
  return `${pad2(m)}:${pad2(s)}.${pad3(t)}`;
}

function getKey(size, mode){ return `${size}x${size}/${mode}`; }
function readBest(){ try { return JSON.parse(localStorage.getItem(KEY_BEST)||'{}'); } catch { return {}; } }
function readLast(){ try { return JSON.parse(localStorage.getItem(KEY_LAST)||'{}'); } catch { return {}; } }
function writeBest(obj){ localStorage.setItem(KEY_BEST, JSON.stringify(obj)); }
function writeLast(obj){ localStorage.setItem(KEY_LAST, JSON.stringify(obj)); }

function updateHud(){
  nextEl.textContent = state.started ? String(state.next) : '-';
  const best = readBest()[getKey(state.size, state.mode)];
  const last = readLast()[getKey(state.size, state.mode)];
  bestEl.textContent = best != null ? formatMs(best) : '--';
  lastEl.textContent = last != null ? formatMs(last) : '--';
}

function updateFox(){
  if (!foxBubble) return;
  foxBubble.textContent = state.mode==='simple' ? '我已经施法让报错装置失效了，并且点击后会有变色提示，快完成任务吧' : 'boss压制了我的魔法，我不能给你帮助了';
}

let motdTimer = null;
function startMotd(){
  if (motdTimer) { clearInterval(motdTimer); motdTimer = null; }
  const pool = BOARD_QUOTES.slice();
  for (let i = pool.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); const t=pool[i]; pool[i]=pool[j]; pool[j]=t; }
  let idx = 0;
  motdEl.textContent = pool[idx++ % pool.length];
  motdTimer = setInterval(()=>{ motdEl.textContent = pool[idx++ % pool.length]; }, 6000);
}

function buildBoard(){
  board.innerHTML = '';
  const N = state.size;
  const S = N*N;
  state.numbers = Array.from({length:S}, (_,i)=>i+1);
  for (let i = S-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); const t = state.numbers[i]; state.numbers[i]=state.numbers[j]; state.numbers[j]=t; }
  board.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${N}, 1fr)`;
  mainEl.classList.toggle('simple', state.mode==='simple');
  mainEl.classList.toggle('regular', state.mode==='regular');
  for (const val of state.numbers) {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.dataset.value = String(val);
    const span = document.createElement('div');
    span.className = 'num';
    span.textContent = String(val);
    cell.appendChild(span);
    board.appendChild(cell);
  }
}

function computeTargets(){
  const max = state.size*state.size;
  let arr = [];
  if (state.pattern==='odd') arr = Array.from({length:max},(_,i)=>i+1).filter(x=>x%2===1);
  else if (state.pattern==='even') arr = Array.from({length:max},(_,i)=>i+1).filter(x=>x%2===0);
  else arr = Array.from({length:max},(_,i)=>i+1);
  if (state.reverse) arr.reverse();
  state.targets = arr;
  state.nextIndex = 0;
  state.next = arr[0]||1;
}

function start(){
  state.size = Number(sizeSelect.value);
  state.mode = modeSelect.value;
  state.pattern = patternSelect.value;
  state.next = 1;
  state.mistakes = 0;
  state.win = false;
  state.fail = false;
  buildBoard();
  computeTargets();
  state.started = true;
  state.startAt = performance.now();
  tick();
  updateHud();
  updateFox();
  startMotd();
  setTimeout(()=>{ try { board.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {} }, 0);
}

function tick(){
  if (!state.started) return;
  const now = performance.now();
  state.elapsedMs = now - state.startAt;
  timerEl.textContent = formatMs(state.elapsedMs);
  requestAnimationFrame(tick);
}

function finish(win){
  state.started = false;
  if (win) state.win = true; else state.fail = true;
  const elapsed = Math.round(state.elapsedMs);
  const key = getKey(state.size, state.mode);
  const last = readLast();
  last[key] = elapsed;
  writeLast(last);
  const best = readBest();
  if (best[key] == null || elapsed < best[key]) best[key] = elapsed;
  writeBest(best);
  showModal(win);
}

function showModal(win){
  modalTitle.textContent = win ? '恭喜完成！' : '挑战失败！';
  modalTime.textContent = formatMs(Math.round(state.elapsedMs));
  modalMeta.textContent = `${state.size}×${state.size} / ${state.mode==='simple'?'简单模式':'常规模式'}`;
  if (state.mode==='simple') { modalMistakesRow.style.display = ''; modalMistakes.textContent = String(state.mistakes); } else { modalMistakesRow.style.display = 'none'; }
  modalQuote.textContent = MODAL_QUOTES[Math.floor(Math.random()*MODAL_QUOTES.length)];
  modal.style.display = 'grid';
  mainEl.classList.add('blurred');
}

function hideModal(){ modal.style.display = 'none'; mainEl.classList.remove('blurred'); }

function onCellClick(e){
  const t = e.target.closest('.cell');
  if (!t) return;
  if (!state.started) return;
  if (state.win || state.fail) return;
  const val = Number(t.dataset.value||'0');
  if (val === state.next) {
    if (state.mode==='simple') t.classList.add('hit');
    state.nextIndex++;
    if (state.nextIndex >= state.targets.length) { nextEl.textContent = '-'; finish(true); return; }
    state.next = state.targets[state.nextIndex];
    nextEl.textContent = String(state.next);
  } else {
    if (state.mode==='simple') { state.mistakes++; t.classList.add('error'); setTimeout(()=>t.classList.remove('error'), 200); }
    else { finish(false); }
  }
}

sizeSelect.addEventListener('change', ()=>{ updateHud(); });
modeSelect.addEventListener('change', ()=>{ updateFox(); updateHud(); });
patternSelect.addEventListener('change', ()=>{ updateHud(); });
reverseBtn.addEventListener('click', ()=>{ state.reverse = !state.reverse; reverseBtn.textContent = `倒序：${state.reverse?'开':'关'}`; localStorage.setItem(KEY_REVERSE, state.reverse?'1':'0'); });
setDefaultBtn.addEventListener('click', ()=>{ localStorage.setItem(KEY_DEFAULT_SIZE, String(sizeSelect.value)); localStorage.setItem(KEY_DEFAULT_MODE, String(modeSelect.value)); localStorage.setItem(KEY_DEFAULT_PATTERN, String(patternSelect.value)); });
startBtn.addEventListener('click', ()=>{ start(); });
board.addEventListener('click', onCellClick);
playAgainBtn.addEventListener('click', ()=>{ hideModal(); start(); });
returnBtn.addEventListener('click', ()=>{ hideModal(); });
modalClose.addEventListener('click', ()=>{ hideModal(); });

loadDefaults();
updateHud();
updateFox();
useImageIfAvailable(princeImg);
useImageIfAvailable(foxSceneImg);
useImageIfAvailable(foxImg);
function useImageIfAvailable(imgEl){
  if (!imgEl) return;
  const show = () => { imgEl.style.display = 'block'; };
  const hide = () => { imgEl.style.display = 'none'; };
  if (imgEl.complete) {
    if (imgEl.naturalWidth > 0) show(); else hide();
  } else {
    imgEl.addEventListener('load', show);
    imgEl.addEventListener('error', hide);
  }
}
function initControlsGradient(){
  const container = document.querySelector('.controls');
  if (!container) return;
  const items = Array.from(container.querySelectorAll('button, select'));
  function update(){
    const crect = container.getBoundingClientRect();
    container.style.setProperty('--belt-period', crect.width + 'px');
    container.style.setProperty('--belt-width', crect.width + 'px');
    for (const el of items){
      const r = el.getBoundingClientRect();
      el.style.setProperty('--offset', (r.left - crect.left) + 'px');
    }
  }
  update();
  window.addEventListener('resize', update);
  let start = performance.now();
  const duration = 12000;
  function step(now){
    const crect = container.getBoundingClientRect();
    const shift = ((now - start) % duration) / duration * crect.width;
    container.style.setProperty('--belt-shift', shift + 'px');
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
initControlsGradient();
