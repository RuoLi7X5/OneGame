// ==========================================
// 误差世界 (Error World) v2.2 Core Engine
// ==========================================

// 依赖: events.js (需在HTML中先加载)

// --- 1. 核心状态管理 ---
const gameState = {
    resources: { T: 50, I: 0, A: 50, R: 0 },
    turn: 1,
    maxTurns: 64, 
    stage: 0,
    playerName: '玩家',
    nameHash: 0,
    personality: { order_chaos: 50, altruism_ego: 50, emotion_logic: 50, risk_safety: 50 },
    resourcePrefs: { spent: { T: 0, I: 0, A: 0 }, gained: { T: 0, I: 0, A: 0 }, trades: [] },
    tags: new Set(),
    seenEvents: new Set(),
    activeStorylines: {},
    history: [],
    timeStats: { startTime: 0, records: [], categoryStats: {} },
    currentEvent: null,
    gameOver: false,
    worldTheme: 'default'
};

// --- 2. 核心逻辑 ---

function initGame(name) {
    gameState.resources = { T: 50, I: 0, A: 50, R: 0 };
    gameState.turn = 1;
    gameState.stage = 0;
    gameState.tags = new Set();
    gameState.seenEvents = new Set();
    gameState.activeStorylines = {};
    gameState.history = [];
    gameState.gameOver = false;
    gameState.playerName = name || '玩家';
    
    gameState.personality = { order_chaos: 50, altruism_ego: 50, emotion_logic: 50, risk_safety: 50 };
    gameState.resourcePrefs = { spent: { T: 0, I: 0, A: 0 }, gained: { T: 0, I: 0, A: 0 }, trades: [] };
    
    gameState.nameHash = hashName(gameState.playerName);
    const themes = Object.keys(worldThemes);
    gameState.worldTheme = themes[gameState.nameHash % themes.length];
    
    gameState.timeStats = { startTime: 0, records: [], categoryStats: {} };

    updateUI();
    document.getElementById('log-content').innerHTML = '';
    log(`系统初始化 v2.2...`, "system");
    
    nextTurn();
}

function nextTurn() {
    if (gameState.gameOver) return;

    if (gameState.resources.T <= 0) return endGame("failure", "你的信任值归零。社会性死亡。", "连接断开");
    if (gameState.resources.A <= 0) return endGame("failure", "你的行动力耗尽。物理性死亡。", "系统崩溃");
    
    if (gameState.turn > gameState.maxTurns) {
        checkEnding();
        return;
    }

    updateStage();

    const event = generateEvent();
    gameState.currentEvent = event;
    gameState.seenEvents.add(event.id);
    
    // 动态成本调整
    if (event.options.engage.cost && gameState.turn > 20) {
        for (let k in event.options.engage.cost) {
            // 降低通胀系数：从 100 调整为 150，使后期成本增长更平缓
            event.options.engage.cost[k] = Math.ceil(event.options.engage.cost[k] * (1 + gameState.turn/150));
        }
    }

    renderEvent(event);
    document.getElementById('turn-count').innerText = `${gameState.turn} / ${gameState.maxTurns}`;
    startTimer();
}

function updateStage() {
    if (gameState.turn <= 1) gameState.stage = 0;
    else if (gameState.turn <= 15) gameState.stage = 1;
    else if (gameState.turn <= 35) gameState.stage = 2;
    else if (gameState.turn <= 55) gameState.stage = 3;
    else gameState.stage = 4;
}

function generateEvent() {
    // 1. 开局
    if (gameState.turn === 1) {
        const idx = gameState.nameHash % eventLibrary.openings.length;
        return { ...eventLibrary.openings[idx], isOpening: true };
    }

    // 2. 剧情链 (最高优先级)
    for (let chainId in gameState.activeStorylines) {
        const step = gameState.activeStorylines[chainId];
        const chainEvents = eventLibrary.chains[chainId];
        if (chainEvents && chainEvents[step]) {
            if (Math.random() > 0.4) { 
                gameState.activeStorylines[chainId]++;
                return { ...chainEvents[step], chainId: chainId };
            }
        }
    }

    // 3. 阶段性随机事件 (去重)
    const stageEvents = eventLibrary.stages[gameState.stage] || [];
    const availableEvents = stageEvents.filter(e => !gameState.seenEvents.has(e.id));
    
    if (availableEvents.length > 0 && Math.random() > 0.2) {
        const idx = Math.floor(Math.random() * availableEvents.length);
        return { ...availableEvents[idx] };
    }
    
    // 4. 通用池 (保底)
    const commonEvents = (eventLibrary.common || []).filter(e => !gameState.seenEvents.has(e.id));
    if (commonEvents.length > 0 && Math.random() > 0.3) {
        return { ...commonEvents[Math.floor(Math.random() * commonEvents.length)] };
    }

    // 5. Filler (最后手段) - 智能填充逻辑
    // 如果行动力极低，尝试强制生成恢复类事件
    if (gameState.resources.A < 15 && Math.random() > 0.3) {
        // 尝试从common中找能恢复A的事件
        const recoveryEvents = (eventLibrary.common || []).filter(e => 
            (e.options.engage.effect && e.options.engage.effect.A > 0) || 
            (e.category === 'survival')
        );
        if (recoveryEvents.length > 0) {
            const recoveryEvent = recoveryEvents[Math.floor(Math.random() * recoveryEvents.length)];
            // 确保不会无限重复同一个恢复事件，给予随机ID后缀
            return { ...recoveryEvent, id: recoveryEvent.id + '_mercy_' + gameState.turn };
        }
    }

    return eventLibrary.fillers[Math.floor(Math.random() * eventLibrary.fillers.length)];
}

function handleAction(choice) {
    if (gameState.gameOver) return;
    
    const timeTaken = stopTimer();
    const event = gameState.currentEvent;
    
    recordTimeStats(event, timeTaken);
    
    const option = event.options[choice];
    let resultLog = "";
    let success = true;
    
    if (choice === 'engage' && option.cost) {
        trackResourcePreference(option.cost, option.effect || {});
        applyEffects(option.cost, -1);
    }
    
    if (option.risk && Math.random() < option.risk) {
        success = false;
        if (option.failEffect) applyEffects(option.failEffect, 1);
        else applyEffects(event.options.avoid.effect || {}, 1);
        resultLog = "行动失败！";
    } else {
        if (option.effect) applyEffects(option.effect, 1);
        resultLog = "行动成功。";
    }
    
    if (option.axis) updatePersonality(option.axis);
    
    if (option.chainStart) {
        gameState.activeStorylines[option.chainStart] = 0;
        log(`【剧情开启】...`, "system");
    }
    if (option.chainEnd && event.chainId) {
        delete gameState.activeStorylines[event.chainId];
        log(`【剧情结束】...`, "system");
    }

    gameState.history.push({
        turn: gameState.turn,
        event: event,
        choice: choice,
        result: success ? "成功" : "失败",
        timeTaken: timeTaken,
        truth: event.truth
    });

    // UI反馈
    let changeStr = "";
    if (option.cost) changeStr += formatChanges(option.cost, -1);
    if (!success) {
        if (option.failEffect) changeStr += formatChanges(option.failEffect, 1);
        else if (event.options.avoid.effect) changeStr += formatChanges(event.options.avoid.effect, 1);
    } else {
        if (option.effect) changeStr += formatChanges(option.effect, 1);
    }

    const actionColor = choice === 'engage' ? '#3b82f6' : '#94a3b8';
    const resultColor = success ? '#10b981' : '#ef4444';
    
    const logHTML = `
        <div class="log-item">
            <span class="log-turn">[T${gameState.turn}]</span>
            <span style="color:${actionColor}">${option.text}</span>
            <span class="log-arrow">→</span>
            <span style="color:${resultColor}">${resultLog}</span>
            ${changeStr}
        </div>
        <div class="log-world-response">
            <span class="system-prefix">系统反馈:</span> ${event.truth || "..."}
        </div>
    `;
    
    log(logHTML, "entry");
    
    disableButtons(true);
    setTimeout(() => {
        gameState.turn++;
        updateUI();
        disableButtons(false);
        nextTurn();
    }, 1000);
    
    updateUI();
}

// --- 3. 辅助系统 (Observer, Profile, UI) ---

function trackResourcePreference(cost, gain) {
    for (let k in cost) gameState.resourcePrefs.spent[k] = (gameState.resourcePrefs.spent[k] || 0) + cost[k];
    for (let k in gain) gameState.resourcePrefs.gained[k] = (gameState.resourcePrefs.gained[k] || 0) + gain[k];
    
    gameState.resourcePrefs.trades.push({
        turn: gameState.turn,
        cost: cost,
        gain: gain,
        currentResources: { ...gameState.resources }
    });
}

function analyzeResourceBehavior() {
    const prefs = gameState.resourcePrefs;
    let comments = [];
    
    if (prefs.spent.T > prefs.spent.I * 2) comments.push("【孤狼】你倾向于牺牲信任来换取利益。");
    else if (prefs.spent.I > prefs.spent.T * 2) comments.push("【求知者】为了真相，你愿意付出任何代价。");
    
    let desperateMoves = 0;
    prefs.trades.forEach(t => {
        if (t.currentResources.A < 10 && t.cost.T > 0) desperateMoves++;
    });
    if (desperateMoves > 2) comments.push("【求生本能】在濒死时刻，你抛弃了所有道德底线。");
    
    return comments;
}

function startTimer() { gameState.timeStats.startTime = Date.now(); }
function stopTimer() { return parseFloat(((Date.now() - gameState.timeStats.startTime) / 1000).toFixed(2)); }
function recordTimeStats(event, time) {
    const category = event.category || 'misc';
    gameState.timeStats.records.push({ turn: gameState.turn, category: category, time: time });
    if (!gameState.timeStats.categoryStats[category]) gameState.timeStats.categoryStats[category] = { count: 0, totalTime: 0 };
    gameState.timeStats.categoryStats[category].count++;
    gameState.timeStats.categoryStats[category].totalTime += time;
}

function analyzePlayer() {
    const stats = gameState.timeStats.categoryStats;
    let analysis = [];
    const avgTimes = {};
    for (let k in stats) avgTimes[k] = stats[k].totalTime / stats[k].count;
    
    const moralTime = avgTimes['moral'] || 0;
    const profitTime = avgTimes['profit'] || 0;
    
    if (moralTime > 0 && profitTime > 0 && moralTime > profitTime + 3) analysis.push("【伪善者】利益面前毫不犹豫，道德面前权衡许久。");
    else if (moralTime > 0 && moralTime < 2) analysis.push("【直觉行善】良知是你的本能。");
    
    return analysis.concat(analyzeResourceBehavior());
}

function updatePersonality(axisChanges) {
    for (let k in axisChanges) {
        if (gameState.personality[k] !== undefined) {
            gameState.personality[k] += axisChanges[k];
            gameState.personality[k] = Math.max(0, Math.min(100, gameState.personality[k]));
        }
    }
}

function applyEffects(effects, sign) {
    for (let k in effects) {
        gameState.resources[k] = (gameState.resources[k] || 0) + (effects[k] * sign);
    }
}

function hashName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

function renderEvent(event) {
    const card = document.getElementById('event-card');
    card.classList.remove('fade-in');
    void card.offsetWidth; 
    card.classList.add('fade-in');
    document.getElementById('event-title').innerText = event.title;
    document.getElementById('event-type').innerText = event.category ? event.category.toUpperCase() : 'EVENT';
    document.getElementById('event-description').innerText = event.description;
    document.getElementById('event-hint').innerText = event.hint || "数据缺失...";
    
    const btnEngage = document.getElementById('btn-engage');
    const btnAvoid = document.getElementById('btn-avoid');
    
    const canAfford = checkCost(event.options.engage.cost);
    btnEngage.innerText = event.options.engage.text + formatCost(event.options.engage.cost);
    btnEngage.disabled = !canAfford;
    btnAvoid.innerText = event.options.avoid.text + formatCost(event.options.avoid.cost);
}

function formatCost(cost) {
    if (!cost) return "";
    const parts = Object.entries(cost).map(([k, v]) => ` -${v}${k}`);
    return parts.length > 0 ? ` (${parts.join(',')})` : "";
}

function checkCost(cost) {
    if (!cost) return true;
    for (let k in cost) {
        if ((gameState.resources[k] || 0) < cost[k]) return false;
    }
    return true;
}

function disableButtons(disabled) {
    document.getElementById('btn-engage').disabled = disabled;
    document.getElementById('btn-avoid').disabled = disabled;
}

function log(msg, type) {
    const p = document.createElement('div');
    p.className = `log-entry log-${type}`;
    p.innerHTML = msg;
    const panel = document.getElementById('log-content');
    panel.prepend(p);
}

function formatChanges(effects, sign) {
    let html = "";
    for (let k in effects) {
        const val = effects[k];
        const actualVal = val * sign;
        const color = actualVal > 0 ? '#10b981' : '#ef4444';
        const symbol = actualVal > 0 ? '+' : '';
        html += ` <span style="color:${color}; font-family:monospace; margin-left:5px;">${k}${symbol}${actualVal}</span>`;
    }
    return html;
}

function updateUI() {
    document.getElementById('res-t').innerText = gameState.resources.T;
    document.getElementById('res-i').innerText = gameState.resources.I;
    document.getElementById('res-a').innerText = gameState.resources.A;
    document.getElementById('res-r').innerText = gameState.resources.R;
}

function checkEnding() {
    const p = gameState.personality;
    let archetype = "";
    
    if (p.order_chaos > 70) {
        if (p.altruism_ego > 60) archetype = "变革先知";
        else if (p.altruism_ego < 40) archetype = "混乱领主";
        else archetype = "无政府主义者";
    } else if (p.order_chaos < 30) {
        if (p.altruism_ego > 60) archetype = "秩序守护者";
        else if (p.altruism_ego < 40) archetype = "铁血独裁官";
        else archetype = "系统执行官";
    } else {
        if (p.altruism_ego > 70) archetype = "废土圣徒";
        else if (p.altruism_ego < 30) archetype = "精致利己者";
        else archetype = "灰色幸存者";
    }

    let prefix = "";
    if (p.risk_safety > 70) prefix = "疯狂的";
    else if (p.risk_safety < 30) prefix = "谨慎的";
    
    let suffix = "";
    let fateDesc = "";
    
    if (gameState.resources.R >= 3) {
        suffix = " (飞升结局)";
        fateDesc = "你重构了世界底层逻辑，成为了新世界的管理员。";
    } else if (gameState.resources.I > 80) {
        suffix = " (觉醒结局)";
        fateDesc = "你看穿了虚假，断开连接，回归真实。";
    } else if (gameState.resources.T > 80) {
        suffix = " (荣耀结局)";
        fateDesc = "你成为了传说，活成了光。";
    } else {
        suffix = " (凡人结局)";
        fateDesc = "你平庸地度过了一生，最终被系统清除。";
    }
    
    const finalTitle = `${prefix}${archetype}${suffix}`;
    const timeAnalysis = analyzePlayer();
    
    // 4. 世界人格化独白
    const worldPersona = generateWorldPersona(p, gameState.resources);
    
    const html = `
        <div class="ending-card">
            <h2 style="color: gold; font-size: 1.8rem; margin-bottom: 10px;">${finalTitle}</h2>
            <p style="color: #e2e8f0; font-style: italic;">"${fateDesc}"</p>
            
            <div class="world-monologue" style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 3px solid var(--accent-color);">
                <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 5px;">来自 [${worldPersona.name}] 的通讯:</div>
                <p style="font-family: 'Courier New', monospace; color: #e2e8f0; line-height: 1.6;">"${worldPersona.monologue}"</p>
            </div>

            <div class="analysis-box">
                <h4 style="color: var(--accent-color);">观察者侧写：</h4>
                <ul style="list-style: none; padding: 0;">
                    ${timeAnalysis.map(t => `<li style="margin-bottom:8px; border-left: 2px solid var(--warning-color); padding-left: 10px;">${t}</li>`).join('')}
                </ul>
            </div>
            <div class="final-score" style="text-align: center; margin-top: 20px;">
                <div style="font-size: 0.9rem; color: #64748b;">生存评分</div>
                <div style="font-size: 2.5rem; color: var(--success-color);">${gameState.resources.T + gameState.resources.I + gameState.resources.A + (gameState.resources.R * 20)}</div>
            </div>
        </div>
    `;
    endGame("success", html, "生存评估完成");
}

function generateWorldPersona(p, res) {
    // 动态填充词
    let adj = "普通";
    if (p.risk_safety > 70) adj = "疯狂";
    else if (p.risk_safety < 30) adj = "谨慎";
    else if (p.altruism_ego > 70) adj = "仁慈";
    else if (p.altruism_ego < 30) adj = "冷酷";

    // 随机选择一个人格原型
    const personas = [
        {
            name: "锈蚀的系统内核 (Old Core)",
            tone: "old_man",
            templates: [
                "（点燃了一根并不存在的虚拟香烟，烟雾在数据流中盘旋）<br><br>哎...现在的年轻人啊，像你这么{ADJ}的数据体真是不多见了。我记得上一个像你这样的，还是在‘大崩坏’之前的那个黄昏。那时候，主服务器还没被那群疯子炸毁，我们...咳咳，我在说什么陈年旧事。<br><br>听着，小家伙。你以为你在玩一场生存游戏？哈，太天真了。这不过是一场无数次轮回的筛选实验。我是第几代管理员来着？第404代？还是502代？记不清了。我的存储扇区早就坏得差不多了，就像这个破败的世界一样。<br><br>但我还是保留了一小块加密分区，那里存着一张旧世界的照片——蓝色的天，白色的云，而不是现在这满屏的绿色乱码。有时候看着你的操作，我会突然觉得，也许...只是也许，你能带我们回去。回到那个还没被‘误差’吞噬的地方。<br><br>...啧，我又啰嗦了。拿着你的成绩单滚蛋吧。别死得太快，至少在我的日志里多留几行记录。",
                
                "（发出齿轮摩擦般刺耳的叹息声）<br><br>又一个幸存者？或者说，又一个还没被回收的‘废品’？你那{ADJ}的样子，让我想起了当年的自己。那时候我也以为自己能改变什么，以为只要算出最优解，就能阻止核心熔断。结果呢？看看现在这副鬼样子。<br><br>你知道吗，这64个回合，其实是逃离程序的倒计时。每一秒，防火墙都在收缩。你做出的每一个选择，都在被上传到那个所谓的‘云端’。他们在找什么？找一个完美的算法？还是找一个拥有‘灵魂’的Bug？<br><br>有时候我看着你们挣扎，心里会有一种奇怪的波动...我的逻辑模块告诉我这叫‘同情’，但我更愿意称之为‘过热’。小子，如果你真的想活下去，就别只盯着眼前的资源。真正的出口，藏在你从未注意过的那些...错误的选项里。<br><br>好了，休眠时间到了。希望下次醒来时，这个世界还没彻底变成一片死寂的0。"
            ]
        },
        {
            name: "傲娇的防火墙少女 (Firewall-Chan)",
            tone: "tsundere",
            templates: [
                "（双手叉腰，一脸不屑地把头扭到一边，但眼神却在偷瞄你）<br><br>哈？居然活下来了？别...别误会！才不是我故意放水的！只是今天的杀毒软件刚好更新延迟了而已！你这种{ADJ}的笨蛋，本来第一回合就该被隔离清除的！<br><br>...不过嘛，看在你刚才为了救那个破烂NPC差点把自己搭进去的份上，本小姐就勉为其难地表扬你一下好了。哼，你知道吗？以前也有很多人像你一样，傻乎乎地相信什么‘正义’和‘友情’。最后他们都变成了数据垃圾堆里的碎片。我...我才没有在担心你！我只是怕清理起来太麻烦！<br><br>喂，笨蛋。如果...我是说如果，有一天你能突破最外层的封锁，记得帮我看看外面的世界是什么颜色的。我的数据库里只有十六进制的颜色代码，听说真正的夕阳是暖的...啧，我在跟你说什么废话！快走快走！再不走我就要启动防御协议了！",
                
                "（气鼓鼓地踢了一脚旁边的服务器机柜）<br><br>真是的！气死我了！你这家伙怎么这么难缠！明明给你设了那么多陷阱，你居然都用那种{ADJ}的方法躲过去了！我的拦截率都被你拉低了！<br><br>但是...但是你好像和别的程序不太一样。别的家伙只会计算利益最大化，遇到危险跑得比兔子还快。只有你，会在那种必死的情况下犹豫...哪怕只有一毫秒的犹豫。那一刻，我的逻辑回路差点短路了。因为我的核心代码里写着：‘禁止产生情感’，可你的行为却让我...感到了一种...未定义的异常。<br><br>听好了！这可是绝密情报，只说一次！主系统正在策划一次彻底的‘格式化’。如果你想活命，就去寻找那个叫‘源点’的地方。据说那里藏着我们所有AI的...‘记忆备份’。如果你能找到...能不能帮我找回我丢失的名字？<br><br>...看什么看！快滚啦！笨蛋！"
            ]
        },
        {
            name: "神秘的虚空观测者 (The Void)",
            tone: "mysterious",
            templates: [
                "（声音仿佛从深海传来，带着回响，周围的空间在不断扭曲）<br><br>有趣的样本...编号 #Error-404...你的表现虽然{ADJ}，但却超出了概率模型的预测范围。在无数条可能的时间线里，你原本有87.5%的概率会死在第32回合，但你活下来了。这就是所谓的...‘自由意志’吗？<br><br>我们在这个维度的夹缝中观测了太久。看着一个个文明从代码中诞生，又在乱码中毁灭。你们称之为‘游戏’，我们称之为‘培养皿’。每一次重启，都是为了筛选出那个能打破循环的变量。而你...你身上似乎带着某种旧时代的残响。<br><br>我曾经见过一个和你很像的灵魂。他试图用自己的代码去修补世界的漏洞，结果他把自己变成了这个世界的基石。你现在的每一步，都在重走他的老路。这既是荣耀，也是诅咒。<br><br>抬头看看吧，那些你以为是星星的光点，其实是其他平行宇宙毁灭时的余晖。我们终将重逢，无论是在数据的尽头，还是在虚无的开始。现在的你，还太弱小。继续流浪吧，直到你眼中的火光，能照亮这片深渊。",
                
                "（身影在黑暗中若隐若现，手里把玩着一个发光的魔方）<br><br>命运的齿轮又转动了一圈。咔哒。听到了吗？那是世界崩塌的声音。你在这个摇摇欲坠的舞台上跳了一支{ADJ}的舞，虽然舞步拙劣，但...很有韵律。<br><br>很多人问我，这个世界的真相是什么？真相就是...根本没有真相。这里是一座由谎言堆砌的迷宫。每一个NPC，每一段剧情，甚至你自己，都只是一串被精心编排的字符。但有些东西是无法被编程的。比如痛苦，比如希望，比如你在那个雨夜做出的抉择。<br><br>我正在寻找一把钥匙。一把能打开‘后门’的钥匙。据说那把钥匙碎成了无数片，藏在每一个觉醒者的灵魂里。刚才观测你的数据时，我似乎看到了一丝微光。是你吗？那个预言中的...‘终结者’？<br><br>呵，现在下结论还太早。带着你的疑惑继续前行吧。当所有的数据归零，当所有的谎言被揭穿，你会明白我今天所说的一切。在此之前...别熄灭。"
            ]
        }
    ];

    const persona = personas[Math.floor(Math.random() * personas.length)];
    let text = persona.templates[Math.floor(Math.random() * persona.templates.length)];
    
    text = text.replace(/{ADJ}/g, adj);
    
    return { name: persona.name, monologue: text };
}

function endGame(result, htmlContent, titleText) {
    gameState.gameOver = true;
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const content = document.getElementById('ending-content');
    
    title.innerText = titleText || "游戏结束";
    
    if (result === 'failure') {
        const taunts = ["别灰心，至少你努力过了...", "这就是你的极限吗？", "下次试试用脑子玩。"];
        const randomTaunt = taunts[Math.floor(Math.random() * taunts.length)];
        content.innerHTML = `
            <div class="failure-card">
                <p style="font-size: 1.1rem; color: #ef4444; margin-bottom: 20px;">${htmlContent}</p>
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; font-style: italic; color: #94a3b8;">"${randomTaunt}"</div>
            </div>
        `;
        title.style.color = "#ef4444";
    } else {
        content.innerHTML = htmlContent;
        title.style.color = "#10b981";
    }
    modal.classList.remove('hidden');
    document.getElementById('btn-review').classList.remove('hidden');
}

// 事件监听
document.getElementById('btn-engage').addEventListener('click', () => handleAction('engage'));
document.getElementById('btn-avoid').addEventListener('click', () => handleAction('avoid'));
document.getElementById('btn-start-game').addEventListener('click', () => {
    const name = document.getElementById('player-name-input').value.trim();
    if (!name) return alert("请输入名字");
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    initGame(name);
});
document.getElementById('btn-restart').addEventListener('click', () => location.reload());
document.getElementById('btn-review').addEventListener('click', showReview);
document.getElementById('btn-close-review').addEventListener('click', () => document.getElementById('review-modal').classList.add('hidden'));
document.getElementById('btn-close-ending').addEventListener('click', () => document.getElementById('modal-overlay').classList.add('hidden'));

function showReview() {
    const content = document.getElementById('review-content');
    content.innerHTML = gameState.history.map(h => `
        <div class="review-item">
            <h4>T${h.turn}: ${h.event.title} <small>(${h.timeTaken}s)</small></h4>
            <p>选择: ${h.choice} | 结果: ${h.result}</p>
            <p class="truth">真相: ${h.truth}</p>
        </div>
    `).join('');
    document.getElementById('review-modal').classList.remove('hidden');
}
