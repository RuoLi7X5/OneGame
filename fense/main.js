let canvas, ctx, W, H;
let level, nodes, edges, switches, boxes, timers, metrics;
let homeView, playView, hudPanel;
let spawnFinished = false;
let gameOver = false;
let t = 0;
let particles = [];

function initGame(lv) {
  level = JSON.parse(JSON.stringify(lv));
  boxes = [];
  metrics = { correct: 0, errors: 0, remaining: level.spawn.count };
  nodes = {};
  level.nodes.forEach(n => nodes[n.id] = n);
  edges = {};
  level.edges.forEach(e => { const k = e.from+"->"+e.to; edges[k] = e; });
  switches = {};
  level.switches.forEach(s => switches[s.nodeId] = s);
  for (let id in nodes) { if (nodes[id].type === "warehouse") nodes[id].pulse = 0; }
  document.getElementById("levelName").textContent = level.name;
  spawnFinished = false;
  gameOver = false;
  showPlay();
  updateHud();
  startSpawning();
}

function startSpawning() {
  if (timers && timers.spawn) clearInterval(timers.spawn);
  let spawned = 0;
  timers = { spawn: setInterval(() => {
    if (spawned >= level.spawn.count) { clearInterval(timers.spawn); spawnFinished = true; return; }
    const color = pickColor(level.spawn.distribution);
    const b = createBox(color);
    boxes.push(b);
    spawned++;
    metrics.remaining = Math.max(0, level.spawn.count - spawned);
    updateHud();
  }, level.spawn.intervalMs) };
}

function pickColor(dist) {
  const entries = Object.entries(dist);
  let r = Math.random();
  for (let [c,p] of entries) { if ((r-=p) <= 0) return c; }
  return entries[entries.length-1][0];
}

function createBox(color) {
  const nEntrance = nodes["entrance"]; const nNext = chooseNext("entrance");
  const edge = getEdge("entrance", nNext);
  return { color, from: "entrance", to: nNext, t: 0, len: edgeLen(edge), speed: level.spawn.speed };
}

function chooseNext(nodeId) {
  if (nodeId === "entrance") {
    const outs = outgoing("entrance");
    return outs[0];
  }
  const sw = switches[nodeId];
  if (!sw) return null;
  return sw.options[sw.selectedIndex];
}

function outgoing(fromId) {
  const list = [];
  for (let k in edges) { const e = edges[k]; if (e.from === fromId) list.push(e.to); }
  return list;
}

function getEdge(fromId, toId) { return edges[fromId+"->"+toId]; }

function edgeLen(edge) {
  const a = nodes[edge.from].pos, b = nodes[edge.to].pos;
  const dx = b[0]-a[0], dy = b[1]-a[1];
  return Math.hypot(dx,dy);
}

function setupCanvas() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
  canvas.addEventListener("click", onClick);
  requestAnimationFrame(loop);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  W = Math.floor(rect.width); H = Math.floor(rect.height);
  canvas.width = W; canvas.height = H;
}

function loop(ts) {
  const dt = 1/60;
  t += dt;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (!boxes) return;
  const s = dt;
  if (gameOver) return;
  for (let i=boxes.length-1;i>=0;i--) {
    const b = boxes[i];
    const e = getEdge(b.from,b.to);
    if (!e) { boxes.splice(i,1); metrics.errors++; updateHud(); continue; }
    b.t += (b.speed*s)/b.len;
    if (b.t >= 1) {
      const at = b.to;
      const node = nodes[at];
      if (node.type === "warehouse") {
        const ok = node.color === b.color;
        const pos = nodes[at].pos;
        spawnBurst(pos[0], pos[1], level.colorMap[b.color] || "#ddd");
        nodes[at].pulse = 1.0;
        if (ok) metrics.correct++; else { metrics.errors++; if (metrics.errors > level.rules.maxErrors) return endNow(false); }
        boxes.splice(i,1);
        updateHud();
        continue;
      }
      if (node.type === "switch") {
        const next = chooseNext(at);
        const nextEdge = getEdge(at,next);
        b.from = at; b.to = next; b.t = 0; b.len = edgeLen(nextEdge);
        continue;
      }
    }
  }
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.t += dt;
    p.x += p.vx*dt;
    p.y += p.vy*dt;
    p.vy += 30*dt;
    if (p.t >= p.life) particles.splice(i,1);
  }
  for (let id in nodes) { const n = nodes[id]; if (n.type === "warehouse" && n.pulse > 0) n.pulse = Math.max(0, n.pulse - dt*0.8); }
  if (spawnFinished && boxes.length === 0) onLevelEnd();
}

function draw() {
  ctx.clearRect(0,0,W,H);
  drawTracks();
  drawWarehouses();
  drawSwitches();
  drawBoxes();
  drawParticles();
}

function drawTracks() {
  for (let k in edges) {
    const e = edges[k];
    const a = nodes[e.from].pos, b = nodes[e.to].pos;
    const dx = b[0]-a[0], dy = b[1]-a[1];
    const L = Math.hypot(dx,dy) || 1;
    const nx = -dy/L, ny = dx/L;
    ctx.lineCap = "round";
    const base = getVar('--rail-base');
    const slp = getVar('--rail-sleeper');
    ctx.lineWidth = 6; ctx.strokeStyle = base; line(a[0]+nx*4,a[1]+ny*4,b[0]+nx*4,b[1]+ny*4);
    ctx.lineWidth = 6; ctx.strokeStyle = base; line(a[0]-nx*4,a[1]-ny*4,b[0]-nx*4,b[1]-ny*4);
    const sleepers = Math.max(4, Math.floor(L/40));
    ctx.lineWidth = 3; ctx.strokeStyle = slp;
    for (let i=1;i<sleepers;i++) {
      const ti = i/sleepers; const x = a[0] + dx*ti; const y = a[1] + dy*ti;
      line(x-nx*8,y-ny*8,x+nx*8,y+ny*8);
    }
  }
  for (let id in switches) {
    const sw = switches[id];
    const from = nodes[id].pos; const to = nodes[sw.options[sw.selectedIndex]].pos;
    const accent = getVar('--accent-path');
    ctx.lineWidth = 5; ctx.strokeStyle = accent; line(from[0],from[1],to[0],to[1]);
    drawGear(from[0],from[1],26,10);
  }
}

function drawWarehouses() {
  for (let id in nodes) {
    const n = nodes[id]; if (n.type !== "warehouse") continue;
    const c = level.colorMap[n.color] || "#888";
    const [x,y] = n.pos;
    ctx.lineWidth = 2; ctx.strokeStyle = "#0f241f";
    ctx.fillStyle = "#17352c"; ctx.beginPath(); ctx.rect(x-34,y-30,68,60); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c; ctx.beginPath(); ctx.rect(x-22,y-10,44,34); ctx.fill();
    ctx.fillStyle = "#e6f0ea"; ctx.beginPath(); ctx.rect(x-34,y-30,68,10); ctx.fill();
    if (n.pulse && n.pulse > 0) {
      ctx.save();
      ctx.globalAlpha = n.pulse*0.7;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.rect(x-26,y-14,52,42); ctx.fill();
      ctx.restore();
    }
  }
}

function drawSwitches() {
  for (let id in switches) {
    const sw = switches[id]; const p = nodes[id].pos;
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.arc(p[0],p[1],28,0,Math.PI*2); ctx.fill();
    const sel = sw.options[sw.selectedIndex]; const dest = nodes[sel].pos;
    ctx.strokeStyle = getVar('--accent-path'); ctx.lineWidth = 3; line(p[0],p[1],dest[0],dest[1]);
  }
}

function drawBoxes() {
  if (!boxes) return;
  for (let b of boxes) {
    const e = getEdge(b.from,b.to); const a = nodes[e.from].pos, c = nodes[e.to].pos;
    const x = a[0] + (c[0]-a[0]) * b.t; const y = a[1] + (c[1]-a[1]) * b.t;
    const col = level.colorMap[b.color] || "#ddd";
    ctx.fillStyle = col; ctx.beginPath(); ctx.rect(x-8,y-8,16,16); ctx.fill();
  }
}

function drawParticles() {
  if (particles.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let p of particles) {
    const a = Math.max(0, 1 - p.t/p.life);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function spawnBurst(x,y,color) {
  const count = 18;
  for (let i=0;i<count;i++) {
    const ang = Math.random()*Math.PI*2;
    const sp = 120 + Math.random()*80;
    const vx = Math.cos(ang)*sp;
    const vy = Math.sin(ang)*sp;
    particles.push({ x, y, vx, vy, r: 3+Math.random()*2, color, t: 0, life: 0.6+Math.random()*0.4 });
  }
}

function drawGear(cx, cy, r, teeth) {
  const rot = t*1.8;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.strokeStyle = getVar('--gear-stroke');
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
  for (let i=0;i<teeth;i++) {
    const a = i*(Math.PI*2/teeth);
    const x1 = Math.cos(a)*(r-6), y1 = Math.sin(a)*(r-6);
    const x2 = Math.cos(a)*(r+2), y2 = Math.sin(a)*(r+2);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  }
  ctx.fillStyle = "#1a4034"; ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function getVar(name) { return getComputedStyle(document.body).getPropertyValue(name).trim() || '#3c7c66'; }

function line(x1,y1,x2,y2) { ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }

function onClick(ev) {
  const r = canvas.getBoundingClientRect(); const mx = ev.clientX - r.left; const my = ev.clientY - r.top;
  for (let id in switches) {
    const p = nodes[id].pos; const dx = mx-p[0], dy = my-p[1];
    if (dx*dx+dy*dy <= 28*28) {
      const sw = switches[id]; sw.selectedIndex = (sw.selectedIndex + 1) % sw.options.length; return;
    }
  }
}

function updateHud() {
  document.getElementById("mCorrect").textContent = metrics.correct;
  document.getElementById("mErrors").textContent = metrics.errors + "/" + level.rules.maxErrors;
  document.getElementById("mRemaining").textContent = metrics.remaining;
}

function restart() { initGame(level); }

function getProgress() {
  try { return JSON.parse(localStorage.getItem("fenseProgress")) || {}; } catch { return {}; }
}
function saveProgress(levelId, data) {
  const prog = getProgress(); prog[levelId] = { ...(prog[levelId]||{}), ...data };
  localStorage.setItem("fenseProgress", JSON.stringify(prog));
}
function renderHome() {
  const list = document.getElementById("levelList"); list.innerHTML = "";
  const prog = getProgress(); let sum = 0; let passed = 0;
  LEVELS.forEach((lv, idx) => {
    const p = prog[lv.id]; const best = p ? (p.win ? "通关" : "失败") + ` 正确${p.correct||0} 错误${p.errors||0}` : "未游玩";
    const el = document.createElement("div"); el.className = "card";
    const unlocked = idx === 0 ? true : !!(prog[LEVELS[idx-1].id] && prog[LEVELS[idx-1].id].win);
    const lockText = unlocked ? "进入" : "未解锁";
    const disabled = unlocked ? "" : "disabled";
    el.innerHTML = `<h3>${lv.name}</h3><div class=muted>颜色数 ${lv.colors.length} · 箱子 ${lv.spawn.count}</div><div class=row><span>${best}</span><button class=btn data-id="${lv.id}" ${disabled}>${lockText}</button></div>`;
    list.appendChild(el);
  });
  document.querySelectorAll("#levelList .btn").forEach(btn => {
    btn.addEventListener("click", () => enterLevel(btn.getAttribute("data-id")));
  });
  const progKeys = Object.keys(prog); progKeys.forEach(k => { if (prog[k] && prog[k].win) passed++; sum++; });
  document.getElementById("progressSummary").textContent = `已游玩 ${sum} / 通关 ${passed}`;
  showHome();
}
function enterLevel(id) {
  const lv = LEVELS.find(l => l.id === id) || LEVELS[0];
  initGame(lv);
}
function showHome() {
  homeView.classList.remove("hidden");
  playView.classList.add("hidden");
  hudPanel.classList.add("hidden");
  document.getElementById("levelName").textContent = "主页";
}
function showPlay() {
  homeView.classList.add("hidden");
  playView.classList.remove("hidden");
  hudPanel.classList.remove("hidden");
  resize();
}
function onLevelEnd() {
  spawnFinished = false;
  const win = (metrics.correct >= level.rules.targetCorrect) && (metrics.errors <= level.rules.maxErrors);
  saveProgress(level.id, { win, correct: metrics.correct, errors: metrics.errors });
  showOverlay(win);
}
function endNow(win) {
  gameOver = true;
  if (timers && timers.spawn) clearInterval(timers.spawn);
  showOverlay(win);
}
function showOverlay(win) {
  const ov = document.getElementById("resultOverlay");
  const t = document.getElementById("overlayTitle");
  const d = document.getElementById("overlayDesc");
  ov.classList.remove("hidden");
  t.textContent = win ? "通关" : "失败";
  d.textContent = win ? `正确 ${metrics.correct} · 错误 ${metrics.errors}` : `错误超过 ${level.rules.maxErrors}`;
}

window.addEventListener("DOMContentLoaded", () => {
  homeView = document.getElementById("homeView");
  playView = document.getElementById("playView");
  hudPanel = document.getElementById("hudPanel");
  setupCanvas();
  document.getElementById("btnRestart").addEventListener("click", restart);
  document.getElementById("btnBack").addEventListener("click", renderHome);
  document.getElementById("btnResetProgress").addEventListener("click", () => { localStorage.removeItem("fenseProgress"); renderHome(); });
  document.getElementById("btnOverlayRestart").addEventListener("click", () => { document.getElementById("resultOverlay").classList.add("hidden"); restart(); });
  document.getElementById("btnOverlayHome").addEventListener("click", () => { document.getElementById("resultOverlay").classList.add("hidden"); renderHome(); });
  const sel = document.getElementById("themeSelect");
  const saved = localStorage.getItem("fenseTheme") || "";
  if (saved) { document.body.className = saved; sel.value = saved; }
  sel.addEventListener("change", () => { document.body.className = sel.value; localStorage.setItem("fenseTheme", sel.value); });
  const startBtn = document.getElementById("btnStartUnlocked");
  if (startBtn) startBtn.addEventListener("click", () => {
    const prog = getProgress();
    let idx = 0;
    for (let i=0;i<LEVELS.length;i++) {
      if (i===0 || (prog[LEVELS[i-1].id] && prog[LEVELS[i-1].id].win)) idx = i; else break;
    }
    enterLevel(LEVELS[idx].id);
  });
  const urlLv = new URLSearchParams(location.search).get("level");
  if (urlLv) enterLevel(urlLv); else renderHome();
});
