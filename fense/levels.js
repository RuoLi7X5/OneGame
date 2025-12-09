const COLOR_PALETTE = {
  blue: "#3b82f6", green: "#16a34a", brown: "#a16207", cyan: "#22d3ee",
  red: "#ef4444", lightgreen: "#22c55e", pink: "#e879f9", purple: "#8b5cf6",
  orange: "#f59e0b"
};

function complexityScore(spec){
  const switchCount = (spec.switches||[]).length;
  const degreeSum = (spec.switches||[]).reduce((s,x)=>s+(x.options?.length||2)-1,0);
  const colorCount = (spec.colors||[]).length;
  return colorCount*0.6 + switchCount*0.9 + degreeSum*0.4;
}
function computeDifficulty(prev, spec){
  const baseSpeed = 70;
  const score = complexityScore(spec);
  const prevCount = prev?.spawn?.count ?? 18;
  const nextCount = Math.max(18, Math.min(40, Math.round(prevCount + 2 + score*0.6)));
  const baseInterval = prev?.spawn?.intervalMs ?? 1600;
  const nextInterval = Math.max(1200, Math.min(1700, Math.round(baseInterval - Math.min(250, score*12))));
  const targetCorrect = Math.max(12, Math.round(nextCount*0.78));
  return {
    spawn: { count: nextCount, intervalMs: nextInterval, distribution: autoDistribution(spec.colors), speed: baseSpeed },
    rules: { maxErrors: 3, targetCorrect }
  };
}
function autoDistribution(colors){
  const n = colors.length; const even = 1/n; const d = {}; colors.forEach(c=>d[c]=even); return d;
}

function mapColorSet(colors){ const m={}; colors.forEach(c=>m[c]=COLOR_PALETTE[c]); return m; }

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
  let prev = null;
  for (let i=0;i<LEVEL_SPECS.length;i++) {
    const spec = LEVEL_SPECS[i];
    const diff = computeDifficulty(prev, spec);
    out.push({ ...spec, ...diff });
    prev = out[i];
  }
  return out;
})();
