const COLOR_PALETTE = {
  blue: "#3b82f6", green: "#16a34a", brown: "#a16207", cyan: "#22d3ee",
  red: "#ef4444", lightgreen: "#22c55e", pink: "#e879f9", purple: "#8b5cf6",
  orange: "#f59e0b"
};

function computeDifficultyByLevel(level, colors){
  // 基础速度随等级提升，上限 130
  const baseSpeed = Math.min(130, 70 + (level-1)*1.5);
  
  // 生成间隔：每关减少，但有波浪式起伏，最低 800ms
  // 每 5 关一个压力点 (5, 10, 15...)
  let intervalBase = Math.max(800, 2500 - (level-1)*60);
  if (level % 5 === 0) intervalBase *= 0.8; // 压力关加快 20%
  const intervalMs = Math.round(intervalBase);

  // 箱子总数：随等级增长，后期稳定
  let count;
  if (level <= 10) count = 18 + (level-1)*2; 
  else if (level <= 20) count = 36 + (level-10)*1.5; 
  else count = 50 + (level-20); 
  count = Math.floor(count);

  // 错误容忍度：后期适当放宽
  const maxErrors = level > 30 ? 5 : level > 15 ? 4 : 3;

  const targetCorrect = Math.max(12, Math.round(count*0.80));
  return { spawn: { count, intervalMs, distribution: autoDistribution(colors), speed: baseSpeed }, rules: { maxErrors, targetCorrect } };
}
function autoDistribution(colors){
  const n = colors.length; const even = 1/n; const d = {}; colors.forEach(c=>d[c]=even); return d;
}

function mapColorSet(colors){ const m={}; colors.forEach(c=>m[c]=COLOR_PALETTE[c]); return m; }

function colorsForLevel(level){
  if (level <= 3) return ["blue","green","brown"];
  if (level <= 7) return ["blue","green","brown","red"];
  if (level <= 12) return ["blue","green","brown","red","cyan"];
  if (level <= 16) return ["blue","green","brown","red","cyan","pink"];
  return ["blue","green","brown","red","cyan","pink","purple"];
}

function junctionPlan(level){
  const cross3 = level < 5 ? 0 : level < 10 ? 1 : level < 15 ? 2 : 3; // capped at 3
  const tCount = Math.min(6, 2 + Math.floor(Math.max(0, level-1)/4)); // 2 -> 6 slowly
  const total = Math.max(3, Math.min(10, cross3 + tCount));
  return { cross3, tCount, total };
}

function pickVariantParams(level){
  const oIdx = (level-1)%4;
  const sIdx = Math.floor((level-1)/4) % 3;
  const orientation = ["verticalTop","verticalBottom","horizontalLeft","horizontalRight"][oIdx];
  const warehouseSideMode = ["alternate","singleA","singleB"][sIdx];
  return { orientation, warehouseSideMode };
}

// 简单的伪随机数生成器，基于种子保证关卡固定
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildSpec(level){
  const colors = colorsForLevel(level);
  const colorMap = mapColorSet(colors);
  const jp = junctionPlan(level);
  const cx = 480, cy = 360;
  // 基础间距与位置范围
  const baseSpacing = 120; 
  const minArm = 140, maxArm = 320; // 臂长范围，制造参差感
  
  const { orientation, warehouseSideMode } = pickVariantParams(level);
  const nodes = [];
  const edges = [];
  const switches = [];
  const swIds = [];
  
  // 用于随机生成的种子基数
  const seedBase = level * 1000;

  if (orientation === "verticalTop" || orientation === "verticalBottom") {
    nodes.push({ id:"entrance", type:"entrance", pos:[cx, 60] });
    
    // 生成主干上的 switch，间距带有微小随机扰动，打破绝对整齐
    let currentY = 200;
    for (let i=0;i<jp.total;i++) {
      const id = `sw${i+1}`; swIds.push(id);
      // 间距在 100~140 之间波动
      const step = 100 + seededRandom(seedBase + i) * 40;
      nodes.push({ id, type:"switch", pos:[cx, currentY], degree: 3 });
      edges.push({ from: i===0 ? "entrance" : swIds[i-1], to: id });
      currentY += step;
    }

    const warehouses = [];
    const tSlots = Math.max(0, jp.tCount);
    const xSlots = Math.max(0, jp.cross3);
    const pattern = [];
    for (let i=0;i<jp.total;i++) pattern.push(i < tSlots ? 1 : (i < tSlots + xSlots ? 2 : 1));
    
    let colorIdx = 0;
    for (let i=0;i<swIds.length && colorIdx < colors.length;i++) {
      const want = pattern[i];
      for (let k=0;k<want && colorIdx < colors.length; k++, colorIdx++) {
        let useRight;
        if (warehouseSideMode === "singleA") useRight = false;
        else if (warehouseSideMode === "singleB") useRight = true;
        else useRight = ((colorIdx + i) % 2) === 1;
        
        // 计算随机臂长，确保水平直线（Y坐标对齐Switch）
        // 臂长在 minArm 到 maxArm 之间随机，制造长短不一的参差感
        const armLen = minArm + seededRandom(seedBase + i*10 + k) * (maxArm - minArm);
        const wx = useRight ? cx + armLen : cx - armLen;
        const wy = nodes.find(n=>n.id===swIds[i]).pos[1];
        
        const wId = `wh_${colors[colorIdx]}`;
        warehouses.push({ id:wId, type:"warehouse", pos:[wx, wy], color: colors[colorIdx] });
        edges.push({ from: swIds[i], to: wId });
      }
    }
    
    for (let i=0;i<swIds.length;i++) {
      const id = swIds[i];
      const attachedWarehouses = edges.filter(e=>e.from===id && e.to.includes('wh_')).map(e=>e.to);
      const fallback = attachedWarehouses[attachedWarehouses.length-1] || (i<swIds.length-1 ? swIds[i+1] : attachedWarehouses[0]);
      const next = i<swIds.length-1 ? swIds[i+1] : fallback;
      const opts = [ next, ...attachedWarehouses ].slice(0,3);
      switches.push({ nodeId: id, options: opts, selectedIndex: 0 });
    }
    nodes.push(...warehouses);
    
    if (orientation === "verticalBottom") {
      let minY = Infinity, maxY = -Infinity;
      for (const n of nodes) { const y = n.pos[1]; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      const midY = (minY + maxY);
      for (const n of nodes) { const y = n.pos[1]; n.pos[1] = midY - y; }
    }
  } else {
    // 水平布局逻辑类似，只需交换 XY
    const leftX = 100, rightX = 860; // 扩大一点范围
    const spacingXBase = (rightX - leftX) / (jp.total + 1);
    const entranceX = orientation === "horizontalLeft" ? leftX : rightX;
    
    nodes.push({ id:"entrance", type:"entrance", pos:[entranceX, cy] });
    
    let currentX = orientation === "horizontalLeft" ? (leftX + 100) : (rightX - 100);
    const dir = orientation === "horizontalLeft" ? 1 : -1;
    
    for (let i=0;i<jp.total;i++) {
      const id = `sw${i+1}`; swIds.push(id);
      const step = 80 + seededRandom(seedBase + i) * 60;
      nodes.push({ id, type:"switch", pos:[currentX, cy], degree: 3 });
      edges.push({ from: i===0 ? "entrance" : swIds[i-1], to: id });
      currentX += step * dir;
    }
    
    const warehouses = [];
    const tSlots = Math.max(0, jp.tCount);
    const xSlots = Math.max(0, jp.cross3);
    const pattern = [];
    for (let i=0;i<jp.total;i++) pattern.push(i < tSlots ? 1 : (i < tSlots + xSlots ? 2 : 1));
    
    let colorIdx = 0;
    for (let i=0;i<swIds.length && colorIdx < colors.length;i++) {
      const want = pattern[i];
      for (let k=0;k<want && colorIdx < colors.length; k++, colorIdx++) {
        let useTop;
        if (warehouseSideMode === "singleA") useTop = true;
        else if (warehouseSideMode === "singleB") useTop = false;
        else useTop = ((colorIdx + i) % 2) === 1;
        
        // 随机臂长（纵向）
        const armLen = minArm + seededRandom(seedBase + i*10 + k) * (maxArm - minArm);
        const wy = useTop ? cy - armLen : cy + armLen;
        const wx = nodes.find(n=>n.id===swIds[i]).pos[0];
        
        const wId = `wh_${colors[colorIdx]}`;
        warehouses.push({ id:wId, type:"warehouse", pos:[wx, wy], color: colors[colorIdx] });
        edges.push({ from: swIds[i], to: wId });
      }
    }
    
    for (let i=0;i<swIds.length;i++) {
      const id = swIds[i];
      const attachedWarehouses = edges.filter(e=>e.from===id && e.to.includes('wh_')).map(e=>e.to);
      const fallback = attachedWarehouses[attachedWarehouses.length-1] || (i<swIds.length-1 ? swIds[i+1] : attachedWarehouses[0]);
      const next = i<swIds.length-1 ? swIds[i+1] : fallback;
      const opts = [ next, ...attachedWarehouses ].slice(0,3);
      switches.push({ nodeId: id, options: opts, selectedIndex: 0 });
    }
    nodes.push(...warehouses);
  }
  return { id: `lv${level}`, name: `Lv.${level}`, colors, colorMap, nodes, edges, switches, orientation, warehouseSideMode };
}

const LEVEL_SPECS = [
  {
    id: "lv1",
    name: "Lv.1",
    colors: ["blue", "green", "brown"],
    colorMap: mapColorSet(["blue","green","brown"]),
    nodes: [
      { id: "entrance", type: "entrance", pos: [460, 60] },
      { id: "sw1", type: "switch", pos: [460, 220], degree: 2 },
      { id: "sw2", type: "switch", pos: [460, 380], degree: 2 },
      { id: "wh_blue", type: "warehouse", pos: [240, 320], color: "blue" },
      { id: "wh_green", type: "warehouse", pos: [440, 520], color: "green" },
      { id: "wh_brown", type: "warehouse", pos: [640, 560], color: "brown" }
    ],
    edges: [
      { from: "entrance", to: "sw1" },
      { from: "sw1", to: "wh_blue" },
      { from: "sw1", to: "sw2" },
      { from: "sw2", to: "wh_green" },
      { from: "sw2", to: "wh_brown" }
    ],
    switches: [
      { nodeId: "sw1", options: ["wh_blue", "sw2"], selectedIndex: 1 },
      { nodeId: "sw2", options: ["wh_green", "wh_brown"], selectedIndex: 0 }
    ]
  },
  {
    id: "lv2",
    name: "Lv.2",
    colors: ["cyan", "red", "lightgreen", "pink", "brown"],
    colorMap: mapColorSet(["cyan","red","lightgreen","pink","brown"]),
    nodes: [
      { id: "entrance", type: "entrance", pos: [480, 60] },
      { id: "swA", type: "switch", pos: [480, 220], degree: 3 },
      { id: "swB", type: "switch", pos: [480, 380], degree: 3 },
      { id: "wh_cyan", type: "warehouse", pos: [260, 250], color: "cyan" },
      { id: "wh_red", type: "warehouse", pos: [720, 260], color: "red" },
      { id: "wh_lightgreen", type: "warehouse", pos: [320, 420], color: "lightgreen" },
      { id: "wh_pink", type: "warehouse", pos: [700, 420], color: "pink" },
      { id: "wh_brown", type: "warehouse", pos: [520, 560], color: "brown" }
    ],
    edges: [
      { from: "entrance", to: "swA" },
      { from: "swA", to: "wh_cyan" },
      { from: "swA", to: "swB" },
      { from: "swA", to: "wh_red" },
      { from: "swB", to: "wh_lightgreen" },
      { from: "swB", to: "wh_pink" },
      { from: "swB", to: "wh_brown" }
    ],
    switches: [
      { nodeId: "swA", options: ["wh_cyan", "swB", "wh_red"], selectedIndex: 1 },
      { nodeId: "swB", options: ["wh_lightgreen", "wh_pink", "wh_brown"], selectedIndex: 2 }
    ]
  },
  {
    id: "lv3",
    name: "Lv.3",
    colors: ["blue", "green", "red", "brown"],
    colorMap: mapColorSet(["blue","green","red","brown"]),
    nodes: [
      { id: "entrance", type: "entrance", pos: [460, 60] },
      { id: "swA", type: "switch", pos: [460, 220], degree: 3 },
      { id: "swB", type: "switch", pos: [420, 380], degree: 2 },
      { id: "wh_blue", type: "warehouse", pos: [240, 260], color: "blue" },
      { id: "wh_green", type: "warehouse", pos: [640, 280], color: "green" },
      { id: "wh_red", type: "warehouse", pos: [280, 460], color: "red" },
      { id: "wh_brown", type: "warehouse", pos: [640, 520], color: "brown" }
    ],
    edges: [
      { from: "entrance", to: "swA" },
      { from: "swA", to: "wh_blue" },
      { from: "swA", to: "swB" },
      { from: "swA", to: "wh_green" },
      { from: "swB", to: "wh_red" },
      { from: "swB", to: "wh_brown" }
    ],
    switches: [
      { nodeId: "swA", options: ["wh_blue", "swB", "wh_green"], selectedIndex: 1 },
      { nodeId: "swB", options: ["wh_red", "wh_brown"], selectedIndex: 0 }
    ]
  },
  {
    id: "lv4",
    name: "Lv.4",
    colors: ["cyan", "blue", "green", "pink", "brown"],
    colorMap: mapColorSet(["cyan","blue","green","pink","brown"]),
    nodes: [
      { id: "entrance", type: "entrance", pos: [480, 60] },
      { id: "swA", type: "switch", pos: [480, 200], degree: 3 },
      { id: "swB", type: "switch", pos: [420, 360], degree: 2 },
      { id: "swC", type: "switch", pos: [540, 360], degree: 2 },
      { id: "wh_cyan", type: "warehouse", pos: [240, 260], color: "cyan" },
      { id: "wh_blue", type: "warehouse", pos: [720, 260], color: "blue" },
      { id: "wh_green", type: "warehouse", pos: [280, 520], color: "green" },
      { id: "wh_pink", type: "warehouse", pos: [700, 520], color: "pink" },
      { id: "wh_brown", type: "warehouse", pos: [500, 600], color: "brown" }
    ],
    edges: [
      { from: "entrance", to: "swA" },
      { from: "swA", to: "wh_cyan" },
      { from: "swA", to: "swB" },
      { from: "swA", to: "swC" },
      { from: "swB", to: "wh_green" },
      { from: "swB", to: "wh_brown" },
      { from: "swC", to: "wh_pink" },
      { from: "swC", to: "wh_blue" }
    ],
    switches: [
      { nodeId: "swA", options: ["wh_cyan", "swB", "swC"], selectedIndex: 1 },
      { nodeId: "swB", options: ["wh_green", "wh_brown"], selectedIndex: 0 },
      { nodeId: "swC", options: ["wh_pink", "wh_blue"], selectedIndex: 1 }
    ]
  },
  {
    id: "lv5",
    name: "Lv.5",
    colors: ["blue", "green", "red", "pink", "brown"],
    colorMap: mapColorSet(["blue","green","red","pink","brown"]),
    nodes: [
      { id: "entrance", type: "entrance", pos: [480, 60] },
      { id: "swA", type: "switch", pos: [480, 210], degree: 3 },
      { id: "swB", type: "switch", pos: [480, 370], degree: 3 },
      { id: "wh_blue", type: "warehouse", pos: [240, 250], color: "blue" },
      { id: "wh_green", type: "warehouse", pos: [720, 250], color: "green" },
      { id: "wh_red", type: "warehouse", pos: [280, 420], color: "red" },
      { id: "wh_pink", type: "warehouse", pos: [700, 420], color: "pink" },
      { id: "wh_brown", type: "warehouse", pos: [520, 560], color: "brown" }
    ],
    edges: [
      { from: "entrance", to: "swA" },
      { from: "swA", to: "wh_blue" },
      { from: "swA", to: "swB" },
      { from: "swA", to: "wh_green" },
      { from: "swB", to: "wh_red" },
      { from: "swB", to: "wh_pink" },
      { from: "swB", to: "wh_brown" }
    ],
    switches: [
      { nodeId: "swA", options: ["wh_blue", "swB", "wh_green"], selectedIndex: 1 },
      { nodeId: "swB", options: ["wh_red", "wh_pink", "wh_brown"], selectedIndex: 2 }
    ]
  },
  {
    id: "lv6",
    name: "Lv.6",
    colors: ["cyan", "orange", "green", "purple", "brown"],
    colorMap: mapColorSet(["cyan","orange","green","purple","brown"]),
    nodes: [
      { id: "entrance", type: "entrance", pos: [480, 60] },
      { id: "swA", type: "switch", pos: [460, 210], degree: 3 },
      { id: "swB", type: "switch", pos: [520, 360], degree: 3 },
      { id: "wh_cyan", type: "warehouse", pos: [260, 250], color: "cyan" },
      { id: "wh_orange", type: "warehouse", pos: [720, 250], color: "orange" },
      { id: "wh_green", type: "warehouse", pos: [300, 420], color: "green" },
      { id: "wh_purple", type: "warehouse", pos: [700, 420], color: "purple" },
      { id: "wh_brown", type: "warehouse", pos: [520, 560], color: "brown" }
    ],
    edges: [
      { from: "entrance", to: "swA" },
      { from: "swA", to: "wh_cyan" },
      { from: "swA", to: "swB" },
      { from: "swA", to: "wh_orange" },
      { from: "swB", to: "wh_green" },
      { from: "swB", to: "wh_purple" },
      { from: "swB", to: "wh_brown" }
    ],
    switches: [
      { nodeId: "swA", options: ["wh_cyan", "swB", "wh_orange"], selectedIndex: 1 },
      { nodeId: "swB", options: ["wh_green", "wh_purple", "wh_brown"], selectedIndex: 2 }
    ]
  },
  {
    id: "lv7",
    name: "Lv.7",
    colors: ["blue", "green", "red", "purple", "brown"],
    colorMap: mapColorSet(["blue","green","red","purple","brown"]),
    nodes: [
      { id: "entrance", type: "entrance", pos: [480, 60] },
      { id: "swA", type: "switch", pos: [480, 210], degree: 3 },
      { id: "swB", type: "switch", pos: [420, 360], degree: 3 },
      { id: "wh_blue", type: "warehouse", pos: [240, 240], color: "blue" },
      { id: "wh_green", type: "warehouse", pos: [720, 240], color: "green" },
      { id: "wh_red", type: "warehouse", pos: [280, 420], color: "red" },
      { id: "wh_purple", type: "warehouse", pos: [700, 420], color: "purple" },
      { id: "wh_brown", type: "warehouse", pos: [520, 560], color: "brown" }
    ],
    edges: [
      { from: "entrance", to: "swA" },
      { from: "swA", to: "wh_blue" },
      { from: "swA", to: "swB" },
      { from: "swA", to: "wh_green" },
      { from: "swB", to: "wh_red" },
      { from: "swB", to: "wh_purple" },
      { from: "swB", to: "wh_brown" }
    ],
    switches: [
      { nodeId: "swA", options: ["wh_blue", "swB", "wh_green"], selectedIndex: 1 },
      { nodeId: "swB", options: ["wh_red", "wh_purple", "wh_brown"], selectedIndex: 2 }
    ]
  },
  {
    id: "lv8",
    name: "Lv.8",
    colors: ["cyan", "red", "lightgreen", "pink", "purple", "brown"],
    colorMap: mapColorSet(["cyan","red","lightgreen","pink","purple","brown"]),
    nodes: [
      { id: "entrance", type: "entrance", pos: [480, 60] },
      { id: "swA", type: "switch", pos: [480, 200], degree: 3 },
      { id: "swB", type: "switch", pos: [420, 340], degree: 3 },
      { id: "swC", type: "switch", pos: [540, 340], degree: 3 },
      { id: "wh_cyan", type: "warehouse", pos: [240, 240], color: "cyan" },
      { id: "wh_red", type: "warehouse", pos: [720, 240], color: "red" },
      { id: "wh_lightgreen", type: "warehouse", pos: [280, 440], color: "lightgreen" },
      { id: "wh_pink", type: "warehouse", pos: [700, 440], color: "pink" },
      { id: "wh_purple", type: "warehouse", pos: [520, 560], color: "purple" },
      { id: "wh_brown", type: "warehouse", pos: [520, 620], color: "brown" }
    ],
    edges: [
      { from: "entrance", to: "swA" },
      { from: "swA", to: "wh_cyan" },
      { from: "swA", to: "swB" },
      { from: "swA", to: "swC" },
      { from: "swB", to: "wh_lightgreen" },
      { from: "swB", to: "wh_brown" },
      { from: "swC", to: "wh_pink" },
      { from: "swC", to: "wh_red" },
      { from: "swC", to: "wh_purple" }
    ],
    switches: [
      { nodeId: "swA", options: ["wh_cyan", "swB", "swC"], selectedIndex: 1 },
      { nodeId: "swB", options: ["wh_lightgreen", "wh_brown"], selectedIndex: 0 },
      { nodeId: "swC", options: ["wh_pink", "wh_red", "wh_purple"], selectedIndex: 2 }
    ]
  },
  {
    id: "lv9",
    name: "Lv.9",
    colors: ["blue", "green", "red", "orange", "purple", "brown"],
    colorMap: mapColorSet(["blue","green","red","orange","purple","brown"]),
    nodes: [
      { id: "entrance", type: "entrance", pos: [480, 60] },
      { id: "swA", type: "switch", pos: [460, 200], degree: 3 },
      { id: "swB", type: "switch", pos: [520, 340], degree: 3 },
      { id: "wh_blue", type: "warehouse", pos: [240, 240], color: "blue" },
      { id: "wh_green", type: "warehouse", pos: [720, 240], color: "green" },
      { id: "wh_red", type: "warehouse", pos: [280, 420], color: "red" },
      { id: "wh_orange", type: "warehouse", pos: [700, 420], color: "orange" },
      { id: "wh_purple", type: "warehouse", pos: [520, 560], color: "purple" },
      { id: "wh_brown", type: "warehouse", pos: [520, 620], color: "brown" }
    ],
    edges: [
      { from: "entrance", to: "swA" },
      { from: "swA", to: "wh_blue" },
      { from: "swA", to: "swB" },
      { from: "swA", to: "wh_green" },
      { from: "swB", to: "wh_red" },
      { from: "swB", to: "wh_orange" },
      { from: "swB", to: "wh_purple" },
      { from: "swB", to: "wh_brown" }
    ],
    switches: [
      { nodeId: "swA", options: ["wh_blue", "swB", "wh_green"], selectedIndex: 1 },
      { nodeId: "swB", options: ["wh_red", "wh_orange", "wh_purple", "wh_brown"], selectedIndex: 2 }
    ]
  },
  {
    id: "lv10",
    name: "Lv.10",
    colors: ["cyan", "blue", "green", "red", "pink", "purple", "brown"],
    colorMap: mapColorSet(["cyan","blue","green","red","pink","purple","brown"]),
    nodes: [
      { id: "entrance", type: "entrance", pos: [480, 60] },
      { id: "swA", type: "switch", pos: [480, 200], degree: 3 },
      { id: "swB", type: "switch", pos: [420, 340], degree: 3 },
      { id: "swC", type: "switch", pos: [540, 340], degree: 3 },
      { id: "wh_cyan", type: "warehouse", pos: [240, 230], color: "cyan" },
      { id: "wh_blue", type: "warehouse", pos: [720, 230], color: "blue" },
      { id: "wh_green", type: "warehouse", pos: [280, 420], color: "green" },
      { id: "wh_red", type: "warehouse", pos: [700, 420], color: "red" },
      { id: "wh_pink", type: "warehouse", pos: [520, 560], color: "pink" },
      { id: "wh_purple", type: "warehouse", pos: [520, 620], color: "purple" },
      { id: "wh_brown", type: "warehouse", pos: [520, 680], color: "brown" }
    ],
    edges: [
      { from: "entrance", to: "swA" },
      { from: "swA", to: "wh_cyan" },
      { from: "swA", to: "swB" },
      { from: "swA", to: "swC" },
      { from: "swB", to: "wh_green" },
      { from: "swB", to: "wh_brown" },
      { from: "swC", to: "wh_red" },
      { from: "swC", to: "wh_pink" },
      { from: "swC", to: "wh_blue" },
      { from: "swC", to: "wh_purple" }
    ],
    switches: [
      { nodeId: "swA", options: ["wh_cyan", "swB", "swC"], selectedIndex: 1 },
      { nodeId: "swB", options: ["wh_green", "wh_brown"], selectedIndex: 0 },
      { nodeId: "swC", options: ["wh_red", "wh_pink", "wh_blue", "wh_purple"], selectedIndex: 3 }
    ]
  }
];

const LEVELS = (() => {
  const out = [];
  for (let lvl=1; lvl<=40; lvl++) {
    const spec = buildSpec(lvl);
    const diff = computeDifficultyByLevel(lvl, spec.colors);
    out.push({ ...spec, ...diff });
  }
  return out;
})();
