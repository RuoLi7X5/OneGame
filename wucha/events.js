// ==========================================
// 误差世界 (Error World) - Event Database
// ==========================================

// --- 世界主题库 ---
const worldThemes = {
    'glitch': { name: '崩坏的数据荒原', prefix: '（杂音）', style: 'glitch-theme' },
    'cyber': { name: '霓虹闪烁的夜城', prefix: '【广播】', style: 'cyber-theme' },
    'organic': { name: '生物机械的巢穴', prefix: '...低语...', style: 'organic-theme' },
    'void': { name: '静谧的虚空', prefix: '（回响）', style: 'void-theme' }
};

// --- 事件库 ---
const eventLibrary = {
    // 1. 开局库 (完整11种)
    openings: [
        // 原有开局
        {
            id: 'origin_fugitive',
            title: '逃亡者',
            type: 'story',
            category: 'survival',
            description: '你在一阵急促的警报声中醒来。你没有记忆，只有手里紧攥的一串加密密钥。追兵就在身后。',
            options: {
                engage: { text: '利用密钥干扰系统（高风险）', cost: { A: 10 }, effect: { I: 10, T: -5 }, risk: 0.6, axis: { risk_safety: +10 } },
                avoid: { text: '销毁密钥，伪装成平民', cost: { I: 0 }, effect: { T: 5 }, axis: { risk_safety: -10 } }
            },
            truth: '你的密钥是通往真相的唯一钥匙。',
            hint: '无论怎么选，先活下来。'
        },
        {
            id: 'origin_admin',
            title: '被遗忘的管理员',
            type: 'story',
            category: 'logic',
            description: '你发现自己拥有查看系统底层日志的权限，但你的身体（代码）正在快速腐烂。',
            options: {
                engage: { text: '尝试修复自身代码', cost: { I: 5 }, effect: { A: 10 }, risk: 0.3, axis: { emotion_logic: +10 } },
                avoid: { text: '利用最后的时间记录日志', cost: { A: 5 }, effect: { I: 15 }, axis: { altruism_ego: +10 } }
            },
            truth: '曾经的管理者，现在的被遗弃者。',
            hint: '只有你自己能救自己。'
        },
        {
            id: 'origin_glitch',
            title: '错误代码实体',
            type: 'story',
            category: 'survival',
            description: '你是一个不该存在的错误。系统卫兵正在扫描该区域，寻找异常数据。',
            options: {
                engage: { text: '吞噬周围数据壮大自己', cost: { T: 5 }, effect: { A: 15, R: 1 }, risk: 0.5, axis: { order_chaos: +20 } },
                avoid: { text: '分散意识躲避扫描', cost: { A: 5 }, effect: { T: 5 }, axis: { risk_safety: -10 } }
            },
            truth: '你的存在本身就是对系统的挑衅。',
            hint: '要么变强，要么消失。'
        },
        // 新增开局
        {
            id: 'origin_merchant',
            title: '流浪商人',
            type: 'story',
            category: 'profit',
            description: '你推着装满杂乱数据碎片的车，在两个防火墙的夹缝中求生。',
            options: {
                engage: { text: '向巡逻队行贿', cost: { I: 5 }, effect: { T: 10 }, axis: { order_chaos: -5 } },
                avoid: { text: '寻找秘密通道', cost: { A: 5 }, effect: { I: 5, R: 1 }, risk: 0.4, axis: { risk_safety: +10 } }
            },
            truth: '商人的货物里藏着违禁品。',
            hint: '金钱能解决很多问题，但不是全部。'
        },
        {
            id: 'origin_hacker',
            title: '赏金黑客',
            type: 'story',
            category: 'logic',
            description: '你刚刚完成了一单大生意，但雇主似乎想杀人灭口。',
            options: {
                engage: { text: '反杀雇主', cost: { A: 10 }, effect: { I: 20, T: -10 }, risk: 0.5, axis: { risk_safety: +20 } },
                avoid: { text: '带着定金跑路', cost: { I: 5 }, effect: { T: 5 }, axis: { risk_safety: -10 } }
            },
            truth: '雇主是系统分身。',
            hint: '跑得快比打得赢更重要。'
        },
        {
            id: 'origin_priest',
            title: '数据传教士',
            type: 'story',
            category: 'moral',
            description: '你相信“源码之神”的存在，试图感化周围的暴乱程序。',
            options: {
                engage: { text: '布道', cost: { A: 5 }, effect: { T: 15 }, risk: 0.7, axis: { emotion_logic: +20 } },
                avoid: { text: '默默祈祷', effect: { A: 5 }, axis: { risk_safety: -5 } }
            },
            truth: '神只是一个无限循环的脚本。',
            hint: '信仰是最好的护盾。'
        },
        {
            id: 'origin_spy',
            title: '双面间谍',
            type: 'story',
            category: 'logic',
            description: '你同时为反抗军和中心城工作，现在双方都要求你提供情报。',
            options: {
                engage: { text: '伪造两份情报', cost: { I: 10 }, effect: { T: 20, A: 10 }, axis: { altruism_ego: +20 } },
                avoid: { text: '切断所有联系', cost: { T: -10 }, effect: { A: 5 }, axis: { risk_safety: -10 } }
            },
            truth: '你的每一次呼吸都在撒谎。',
            hint: '在这个位置，诚实就是自杀。'
        },
        {
            id: 'origin_architect',
            title: '失忆的架构师',
            type: 'story',
            category: 'logic',
            description: '你看着周围的建筑，感觉每一行代码都是你亲手写的，但你不记得为什么。',
            options: {
                engage: { text: '尝试控制环境', cost: { A: 15 }, effect: { I: 30 }, risk: 0.6, axis: { order_chaos: +10 } },
                avoid: { text: '观察并记录', effect: { I: 5 }, axis: { emotion_logic: -10 } }
            },
            truth: '你建造了监狱，然后把自己关了进去。',
            hint: '熟悉感是危险的信号。'
        },
        {
            id: 'origin_cleaner',
            title: '系统清理工',
            type: 'story',
            category: 'survival',
            description: '你的工作是回收尸体（数据碎片）。今天你发现了一具特殊的尸体。',
            options: {
                engage: { text: '私藏碎片', cost: { T: -5 }, effect: { R: 1, I: 10 }, risk: 0.3, axis: { order_chaos: +15 } },
                avoid: { text: '上交系统', cost: { A: 5 }, effect: { T: 10 }, axis: { order_chaos: -10 } }
            },
            truth: '那具尸体和你长得一模一样。',
            hint: '有时候不知道比知道幸福。'
        },
        {
            id: 'origin_ghost',
            title: '幽灵信号',
            type: 'story',
            category: 'survival',
            description: '你没有实体，只能附着在其他设备上。当前宿主的电量即将耗尽。',
            options: {
                engage: { text: '强制夺舍新设备', cost: { T: -10 }, effect: { A: 20 }, axis: { altruism_ego: +20 } },
                avoid: { text: '进入低功耗模式', effect: { A: 5 }, axis: { risk_safety: -5 } }
            },
            truth: '你已经是第100次轮回了。',
            hint: '生存是第一本能。'
        },
        {
            id: 'origin_soldier',
            title: '退役卫兵',
            type: 'story',
            category: 'survival',
            description: '你的战斗模块被卸载了，但你的反应神经还在。',
            options: {
                engage: { text: '凭借本能战斗', cost: { A: 10 }, effect: { T: 10, I: 5 }, risk: 0.4, axis: { risk_safety: +10 } },
                avoid: { text: '利用战术规避', effect: { A: 5 }, axis: { emotion_logic: -10 } }
            },
            truth: '老兵不死，只是逐渐凋零。',
            hint: '你比看起来更危险。'
        }
    ],

    // 2. 阶段性事件包 (Stages)
    stages: {
        // Stage 1: 觉醒与探索 (Turn 2-15)
        1: [
            { id: 's1_glitch_cat', title: '故障猫咪', category: 'moral', description: '一只由乱码组成的猫咪在路边瑟瑟发抖。', options: { engage: { text: '抚摸它', cost: { A: 2 }, effect: { T: 5 }, axis: { emotion_logic: +10 } }, avoid: { text: '可能是病毒', effect: { I: 2 }, axis: { risk_safety: -5 } } }, truth: '它只是想要一点温暖的代码。' },
            { id: 's1_data_rain', title: '数据雨', category: 'survival', description: '天空下起了酸性的数据雨，长时间暴露会腐蚀行动力。', options: { engage: { text: '寻找避雨处', cost: { A: 5 }, effect: { T: 2 }, axis: { risk_safety: -10 } }, avoid: { text: '强行赶路', cost: { A: 10 }, effect: { I: 5 }, axis: { risk_safety: +10 } } }, truth: '雨水中含有旧时代的记忆。' },
            { id: 's1_lost_child', title: '迷路的代码', category: 'moral', description: '一个幼年程序正在寻找它的父进程。', options: { engage: { text: '帮它寻找', cost: { A: 5 }, effect: { T: 10 }, axis: { altruism_ego: -10 } }, avoid: { text: '无视', effect: {}, axis: { altruism_ego: +10 } } }, truth: '它的父进程已经被回收了。' },
            { id: 's1_free_upgrade', title: '免费升级', category: 'profit', description: '街边的广告牌提示你可以免费升级一个模块。', options: { engage: { text: '接受升级', cost: { T: 5 }, effect: { A: 15 }, risk: 0.3, axis: { risk_safety: +15 } }, avoid: { text: '天下没有免费午餐', effect: { I: 2 }, axis: { risk_safety: -10 } } }, truth: '升级包里植入了广告插件。' },
            { id: 's1_broken_atm', title: '故障终端', category: 'profit', description: '一台公共终端正在疯狂吐出数据币。', options: { engage: { text: '捡走数据币', cost: { T: -5 }, effect: { I: 10 }, axis: { order_chaos: +10 } }, avoid: { text: '报告管理员', cost: { A: 2 }, effect: { T: 10 }, axis: { order_chaos: -10 } } }, truth: '这是针对贪婪者的诱捕装置。' },
            // (从 Common 移入)
            { id: 'moral_beggar_ai', title: '乞讨的AI', category: 'moral', description: '一个即将耗尽电量的低级AI向你乞讨。', options: { engage: { text: '分给它行动力', cost: { A: 5 }, effect: { T: 10 }, axis: { altruism_ego: -15 } }, avoid: { text: '无视并离开', cost: { T: -2 }, effect: { I: 2 }, axis: { altruism_ego: +10 } } }, truth: '它是一个监控探头。' },
            { id: 'common_signal_tower', title: '废弃信号塔', category: 'logic', description: '这座塔还在广播着旧时代的音乐。', options: { engage: { text: '攀爬塔顶', cost: { A: 15 }, effect: { I: 15, T: 5 }, risk: 0.2, axis: { emotion_logic: +20 } }, avoid: { text: '离开', effect: {}, axis: { emotion_logic: -5 } } }, truth: '音乐里藏着旧世界的坐标。' },
            // 新增
            { id: 's1_abandoned_cache', title: '被遗弃的缓存', category: 'profit', description: '一个被遗弃的临时缓存区，里面可能藏着前人的数据。', options: { engage: { text: '强制访问', cost: { A: 5 }, effect: { I: 8 }, risk: 0.3, axis: { risk_safety: +10 } }, avoid: { text: '可能是陷阱', effect: { T: 2 }, axis: { risk_safety: -10 } } }, truth: '缓存里只有一张损坏的照片。' },
            { id: 's1_stray_drone', title: '迷失的无人机', category: 'logic', description: '一架送货无人机失去了导航信号，正在原地打转。', options: { engage: { text: '重置它的导航', cost: { I: 2 }, effect: { T: 5, R: 1 }, axis: { altruism_ego: -10 } }, avoid: { text: '击落并回收零件', cost: { T: -5 }, effect: { A: 10 }, axis: { altruism_ego: +20 } } }, truth: '它运送的是给孤儿院的电池。' },
            { id: 's1_graffiti', title: '墙上的涂鸦', category: 'story', description: '墙上用代码写着：“世界是假的”。', options: { engage: { text: '覆盖涂鸦', cost: { A: 2 }, effect: { T: 5 }, axis: { order_chaos: -10 } }, avoid: { text: '解读隐藏信息', cost: { A: 5 }, effect: { I: 5 }, axis: { order_chaos: +10 } } }, truth: '涂鸦者已经被删除了。' }
        ],
        
        // Stage 2: 冲突与站队 (Turn 16-35)
        2: [
            { id: 's2_faction_war', title: '街头火拼', category: 'survival', description: '两派黑客正在交火，你被困在中间。', options: { engage: { text: '加入弱势方', cost: { A: 15 }, effect: { T: 15, I: 5 }, risk: 0.5, axis: { order_chaos: +15 } }, avoid: { text: '隐身逃离', cost: { A: 5 }, effect: {}, axis: { risk_safety: -10 } } }, truth: '这只是一场虚拟演习。' },
            { id: 's2_contraband', title: '违禁品交易', category: 'profit', description: '有人想用高价买你的身份ID一小时。', options: { engage: { text: '出售ID使用权', cost: { T: 20 }, effect: { I: 30 }, axis: { risk_safety: +20 } }, avoid: { text: '拒绝', effect: { T: 5 }, axis: { risk_safety: -5 } } }, truth: '他们用你的ID去借了高利贷。' },
            { id: 's2_prophet', title: '赛博算命', category: 'logic', description: '一个盲眼程序声称能算出你的死期。', options: { engage: { text: '听听看', cost: { I: 5 }, effect: { T: -5, R: 1 }, axis: { emotion_logic: +20 } }, avoid: { text: '迷信是BUG', effect: { I: 2 }, axis: { emotion_logic: -10 } } }, truth: '它只是读取了你的系统倒计时。' },
            { id: 's2_virus_outbreak', title: '病毒爆发', category: 'survival', description: '区域隔离警告！一种吞噬行动力的病毒正在蔓延。', options: { engage: { text: '购买高价疫苗', cost: { I: 15 }, effect: { A: 10 }, axis: { risk_safety: -20 } }, avoid: { text: '相信自身免疫力', effect: { A: -10 }, risk: 0.8, axis: { risk_safety: +20 } } }, truth: '疫苗厂商制造了病毒。' },
            // (从 Common 移入)
            { id: 'moral_data_leak', title: '数据泄露', category: 'moral', description: '你捡到了一个包含大量平民隐私的数据包。黑市商人出高价收购。', options: { engage: { text: '卖给黑市', cost: { T: 10 }, effect: { A: 20, I: 5 }, axis: { altruism_ego: +20 } }, avoid: { text: '销毁数据', cost: { A: 5 }, effect: { T: 15 }, axis: { altruism_ego: -20 } } }, truth: '这是对你贪婪的测试。' },
            { id: 'common_black_market', title: '流动黑市', category: 'profit', description: '神秘商人向你兜售未标记的数据包。', options: { engage: { text: '购买数据', cost: { T: 15 }, effect: { I: 20 }, axis: { order_chaos: +10 } }, avoid: { text: '太贵了', effect: {}, axis: { risk_safety: -5 } } }, truth: '这里是全城唯一不问来源的交易所。' },
            { id: 'chain_hacker_start', title: '神秘信号', category: 'story', description: '收到名为“Fox”的加密请求：“想知道真相吗？”', options: { engage: { text: '回复信号', cost: { I: 5 }, effect: { T: -5 }, chainStart: 'hacker_arc', axis: { risk_safety: +10 } }, avoid: { text: '标记垃圾邮件', cost: {}, effect: { T: 5 } } }, truth: 'Fox 是边缘区最有名的情报贩子。' },
            { id: 'chain_system_start', title: '系统征召', category: 'story', description: '中央处理器检测到你的潜力，发出临时执法权限授权。', options: { engage: { text: '接受授权', cost: { T: 10 }, effect: { A: 15, I: 5 }, chainStart: 'system_arc', axis: { order_chaos: -20 } }, avoid: { text: '拒绝被束缚', cost: {}, effect: { T: -5, R: 1 } } }, truth: '一旦成为系统的一部分，就很难再离开了。' },
            // 新增
            { id: 's2_underground_clinic', title: '地下诊所', category: 'survival', description: '你的数据有些碎片化。一家没有执照的诊所提供修复服务。', options: { engage: { text: '廉价修复', cost: { I: 5 }, effect: { A: 15 }, risk: 0.4, failEffect: { A: -5, T: -5 }, axis: { risk_safety: +15 } }, avoid: { text: '去正规医院', cost: { I: 20 }, effect: { A: 20 }, axis: { risk_safety: -10 } } }, truth: '医生是个被通缉的木马程序。' },
            { id: 's2_corrupt_officer', title: '腐败警卫', category: 'moral', description: '一个警卫拦住你，暗示只要给点“好处”就能消除你的违规记录。', options: { engage: { text: '行贿', cost: { I: 10 }, effect: { T: 20 }, axis: { order_chaos: +10 } }, avoid: { text: '举报他', cost: { A: 10 }, effect: { T: 5 }, risk: 0.6, axis: { order_chaos: -20 } } }, truth: '举报信会被直接转到他的邮箱。' }
        ],
        
        // Stage 3: 危机与抉择 (Turn 36-55)
        3: [
            { id: 's3_human_meat', title: '昂贵的燃料', category: 'moral', description: '你的行动力见底了。黑市有卖“高效燃料”，据说是其他玩家转化来的。', options: { engage: { text: '购买燃料', cost: { T: -20 }, effect: { A: 40 }, axis: { altruism_ego: +30 } }, avoid: { text: '宁死不屈', effect: { A: -5 }, axis: { altruism_ego: -20 } } }, truth: '吃人的人，终将被吃。' },
            { id: 's3_system_offer', title: '系统的招安', category: 'story', description: '系统承诺只要你交出所有信息(I)，就给你永生(无限A)。', options: { engage: { text: '交出信息', cost: { I: 999 }, effect: { A: 100, T: 20 }, axis: { order_chaos: -30 } }, avoid: { text: '真相高于生命', cost: { A: 10 }, effect: { I: 10, R: 1 }, axis: { order_chaos: +20 } } }, truth: '永生就是变成一块硬盘。' },
            { id: 's3_reality_crack', title: '现实裂缝', category: 'logic', description: '天空裂开了一道口子，露出了外面真实世界的代码。', options: { engage: { text: '触摸裂缝', cost: { A: 20 }, effect: { I: 50, T: -10 }, risk: 0.7, axis: { risk_safety: +30 } }, avoid: { text: '远离BUG', effect: { T: 5 }, axis: { risk_safety: -20 } } }, truth: '那是唯一的出口。' },
            // (从 Common 移入)
            { id: 'common_firewall', title: '防火墙波动', category: 'survival', description: '区域防火墙正在重启，所有未授权ID都将暴露。', options: { engage: { text: '伪造临时ID', cost: { I: 10 }, effect: { A: 5 }, risk: 0.3, axis: { order_chaos: +15 } }, avoid: { text: '寻找物理掩体', cost: { A: 10 }, effect: {}, axis: { risk_safety: -10 } } }, truth: '这其实是例行杀毒。' },
            { id: 'logic_encrypted_msg', title: '加密讯息', category: 'logic', description: '你截获了一段复杂的密文。解码它需要消耗大量算力。', options: { engage: { text: '暴力破解', cost: { A: 15 }, effect: { I: 25 }, risk: 0.2, axis: { emotion_logic: +10 } }, avoid: { text: '反向追踪风险大', cost: {}, effect: { A: 5 } } }, truth: '这是反抗军的联络码。' },
            // 新增 - 补充行动力恢复事件，减少Filler出现
            { id: 's3_energy_leak', title: '高能泄露', category: 'survival', description: '一根主传输管道破裂了，纯净的能量正在外溢。', options: { engage: { text: '冒险吸收', cost: { T: -5 }, effect: { A: 25 }, risk: 0.3, failEffect: { A: -10 }, axis: { risk_safety: +20 } }, avoid: { text: '太危险了', effect: { I: 5 }, axis: { risk_safety: -10 } } }, truth: '这些能量来自被回收的区域。' },
            { id: 's3_safehouse', title: '临时避难所', category: 'survival', description: '你发现了一个反抗军留下的废弃安全屋。', options: { engage: { text: '休整片刻', effect: { A: 15, T: 5 }, axis: { risk_safety: -5 } }, avoid: { text: '搜刮物资', cost: { T: -5 }, effect: { I: 15, R: 1 }, axis: { altruism_ego: +10 } } }, truth: '墙上刻着“不要相信Fox”。' },
            { id: 's3_mass_deletion', title: '大清洗', category: 'survival', description: '系统开始了全服大清洗，所有低信任值(T<30)的个体将被直接抹杀。', options: { engage: { text: '伪造信任证书', cost: { I: 20 }, effect: { T: 20 }, axis: { order_chaos: +20 } }, avoid: { text: '躲进垃圾堆', cost: { A: 15 }, effect: {}, risk: 0.2, axis: { risk_safety: -10 } } }, truth: '垃圾堆是唯一安全的地方。' },
            { id: 's3_sacrifice', title: '牺牲的同伴', category: 'moral', description: '你的队友为了掩护你撤退被困住了。', options: { engage: { text: '回头救他', cost: { A: 30 }, effect: { T: 30, R: 1 }, risk: 0.5, axis: { altruism_ego: -40 } }, avoid: { text: '独自逃生', cost: { T: -10 }, effect: { I: 10 }, axis: { altruism_ego: +30 } } }, truth: '他其实是派来监视你的。' },
            { id: 's3_glitch_storm', title: '乱码风暴', category: 'logic', description: '一场巨大的逻辑错误风暴席卷而来，接触者会被重写。', options: { engage: { text: '利用风暴重写自己', cost: { A: 20, T: -20 }, effect: { I: 40, R: 1 }, risk: 0.8, axis: { risk_safety: +40 } }, avoid: { text: '断网休眠', cost: { A: 10 }, effect: {}, axis: { risk_safety: -20 } } }, truth: '风暴中心是系统的源代码。' }
        ],
        
        // Stage 4: 终局前奏 (Turn 56-63)
        4: [
            { id: 's4_memory_wipe', title: '记忆清洗', category: 'survival', description: '为了减少负担，系统开始强制删除旧数据。', options: { engage: { text: '删除部分记忆', cost: { I: -20 }, effect: { A: 10 }, axis: { altruism_ego: +10 } }, avoid: { text: '死守记忆', cost: { A: 20 }, effect: { R: 1 }, axis: { emotion_logic: +20 } } }, truth: '没有记忆，你又是谁？' },
            // 新增 - 补充行动力恢复
            { id: 's4_backup_generator', title: '备用能源', category: 'survival', description: '你找到了一个还在运作的旧时代发电机。', options: { engage: { text: '接入充电', effect: { A: 30 }, axis: { risk_safety: -5 } }, avoid: { text: '拆解它获取零件', effect: { I: 20, R: 1 }, axis: { profit: +10 } } }, truth: '它是用核废料驱动的。' },
            { id: 's4_data_vampire', title: '数据吸血鬼', category: 'moral', description: '你的能量即将耗尽。此时你遇到了一个虚弱的新手玩家。', options: { engage: { text: '吞噬他 (恢复大量A)', cost: { T: -50 }, effect: { A: 50 }, axis: { altruism_ego: +50 } }, avoid: { text: '给予他指引', cost: { A: 5 }, effect: { T: 20, R: 1 }, axis: { altruism_ego: -50 } } }, truth: '他就是刚刚进入游戏的你。' },
            { id: 's4_final_test', title: '最终测试', category: 'logic', description: '一扇门。左边是无尽的快乐(虚假)，右边是痛苦的真相。', options: { engage: { text: '选择快乐', cost: { I: -50 }, effect: { T: 50 }, axis: { order_chaos: -20 } }, avoid: { text: '选择真相', cost: { A: 20 }, effect: { I: 50 }, axis: { order_chaos: +20 } } }, truth: '红药丸还是蓝药丸？' },
            { id: 's4_mirror', title: '镜像审判', category: 'logic', description: '你遇到了一个和你一模一样的镜像，它拥有你所有的记忆。', options: { engage: { text: '与它融合', cost: { T: 20, I: 20 }, effect: { R: 1 }, axis: { emotion_logic: +20 } }, avoid: { text: '消灭它', cost: { A: 30 }, effect: { T: 10 }, axis: { emotion_logic: -20 } } }, truth: '它才是本体，你只是镜像。' },
            { id: 's4_last_broadcast', title: '最后的广播', category: 'story', description: '整个世界都在崩塌，只有广播还在播放。', options: { engage: { text: '发出你的声音', cost: { A: 50 }, effect: { T: 50, I: 50, R: 1 }, risk: 0.5, axis: { altruism_ego: -50 } }, avoid: { text: '静静聆听', cost: {}, effect: { A: 10 }, axis: { altruism_ego: +10 } } }, truth: '有人听到了。' }
        ]
    },

    // 3. 通用池 (Common) - 任何阶段都可能出现，作为填充
    common: [
        { id: 'profit_gambling', title: '数据赌场', category: 'profit', description: '一个充满诱惑的地下接口，承诺能翻倍你的资源。', options: { engage: { text: '孤注一掷', cost: { I: 10 }, effect: { I: 30 }, risk: 0.6, failEffect: { I: -10 }, axis: { risk_safety: +15 } }, avoid: { text: '拒绝诱惑', cost: {}, effect: { T: 2 }, axis: { risk_safety: -5 } } }, truth: '庄家永远是赢家，除非你出千。' },
        { id: 'common_broken_bot', title: '损坏的巡逻者', category: 'logic', description: '一个巡逻机器人卡在了墙缝里，它的核心还在发光。', options: { engage: { text: '拆卸核心', cost: { A: 5 }, effect: { R: 1, T: -5 }, risk: 0.4, axis: { risk_safety: +10 } }, avoid: { text: '无视', effect: {}, axis: { risk_safety: -5 } } }, truth: '它在装死，引诱贪婪者。' },
        // 新增 - 多样化恢复手段
        { id: 'common_hot_spring', title: '数据温泉', category: 'survival', description: '一股暖流数据从地下涌出，可以修复受损的逻辑扇区。', options: { engage: { text: '浸泡', effect: { A: 10, T: 5 } }, avoid: { text: '赶路', effect: { I: 1 } } }, truth: '这是CPU散热系统的废水。' },
        { id: 'common_supply_drop', title: '空投补给', category: 'profit', description: '一个无主的补给箱落在前方。', options: { engage: { text: '开启补给', effect: { A: 15, I: 5 }, risk: 0.3, failEffect: { A: -5 } }, avoid: { text: '可能是诱饵', effect: { T: 2 } } }, truth: '里面只有过期的压缩算法。' },
        // 更多通用事件...
    ],
    
    // 4. 剧情链 (Chains)
    chains: {
        'hacker_arc': [
            { id: 'hacker_1', title: 'Fox的试探', category: 'logic', description: 'Fox发来一段乱码，只有你能解开。', options: { engage: { text: '解码', cost: { A: 5 }, effect: { I: 10 }, axis: { emotion_logic: +10 } }, avoid: { text: '无视', effect: {}, chainEnd: true } }, truth: '这是入伙测试。' },
            { id: 'hacker_2', title: '数据劫案', category: 'profit', description: 'Fox邀请你一起抢劫系统银行。', options: { engage: { text: '加入', cost: { T: -10 }, effect: { I: 30, A: 10 }, risk: 0.6, axis: { risk_safety: +20 } }, avoid: { text: '拒绝', effect: { T: 5 }, chainEnd: true } }, truth: '这是一次自杀式袭击。' },
            { id: 'hacker_3', title: '最后的晚餐', category: 'moral', description: 'Fox受了重伤，需要你的核心代码来续命。', options: { engage: { text: '牺牲自己救他', cost: { A: 30 }, effect: { R: 1, T: 20 }, axis: { altruism_ego: -30 } }, avoid: { text: '拿走他的遗产', cost: { T: -20 }, effect: { I: 50 }, axis: { altruism_ego: +30 } } }, truth: '他早就知道你会怎么选。' }
        ],
        'system_arc': [
            { id: 'system_1', title: '清理任务', category: 'moral', description: '系统要求你清理一片“已感染”的数据区，那里其实住着一群无害的流浪程序。', options: { engage: { text: '执行命令', cost: { A: 10 }, effect: { T: 20 }, axis: { order_chaos: -20 } }, avoid: { text: '伪造清理报告', cost: { I: 10 }, effect: { T: -10, R: 1 }, axis: { order_chaos: +10 } } }, truth: '平庸之恶。' }
        ],
        'body_mod_arc': [ // 改造人必死线
            { id: 'mod_1', title: '机械义肢', category: 'survival', description: '你的腿部代码损坏了，医生建议换成机械的。', options: { engage: { text: '换成机械腿', cost: { T: -5 }, effect: { A: 20 }, chainStart: 'body_mod_arc', axis: { emotion_logic: -10 } }, avoid: { text: '自然修复', cost: { A: 10 }, effect: { T: 5 } } }, truth: '这只是开始。' },
            { id: 'mod_2', title: '视觉增强', category: 'profit', description: '换个电子眼，能看到更多隐藏数据。', options: { engage: { text: '改造眼睛', cost: { T: -10 }, effect: { I: 20 }, axis: { emotion_logic: -10 } }, avoid: { text: '保持肉眼', effect: {} } }, truth: '你会看到不想看的东西。' },
            { id: 'mod_3', title: '情感抑制', category: 'logic', description: '情感模块太耗能了，卸载它吧。', options: { engage: { text: '卸载情感', cost: { T: -20 }, effect: { A: 50 }, axis: { emotion_logic: -30 } }, avoid: { text: '保留人性', cost: { A: 10 }, chainEnd: true } }, truth: '你现在是一台完美的机器。' },
            { id: 'mod_4_death', title: '格式化', category: 'survival', description: '系统检测到你已无人类特征，判定为工具程序，执行回收。', options: { engage: { text: '执行指令', cost: { A: 999 }, effect: {}, failEffect: { A: 999 } }, avoid: { text: '无法反抗', cost: { A: 999 }, effect: {} } }, truth: '必死结局：工具不需要意识。' }
        ]
    },

    // 5. 填充事件
    fillers: [
        { id: 'filler_rest', title: '休眠', category: 'survival', description: '周围很安静，也许可以休息一下。', options: { engage: { text: '休息', effect: { A: 5 } }, avoid: { text: '继续', effect: {} } } },
        { id: 'filler_noise', title: '噪音', category: 'misc', description: '毫无意义的数据流划过天际。', options: { engage: { text: '分析噪音', cost: { A: 1 }, effect: { I: 1 } }, avoid: { text: '忽略', effect: {} } } }
    ]
};
