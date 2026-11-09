/* i18n.js - English / Chinese switch.
   In Chinese mode the text on the page is translated by lookup:
     DICT   exact English text -> Chinese
     RULES  sentences that contain numbers
     data/i18n_zh.json  Chinese for the texts in the data files (optional)
   Anything without a translation stays in English. To add one, edit DICT or the JSON file. */
(function () {
  'use strict';
  const KEY = 'rm-lang';
  let lang = 'en', observer = null;
  const CJK = /[\u3000-\u9fff\uff00-\uffef]/;

  /* ---------------- 1) exact texts ---------------- */
  const D = {
    // intro + start page
    'River Manager': '河流管理者',
    'A Digital Twin Lite of Xiaolangdi Water-Sediment Regulation': '小浪底水沙调控“轻量数字孪生”',
    'Best with sound on': '建议开启声音观看',
    'This site works better on a PC': '本网站在电脑上浏览效果更佳',
    'Development and Management of the Yellow River Basin · Autumn 2026 · Group 2': '黄河流域开发与管理 · 2026年秋 · 第2组',
    'Tsinghua University': '清华大学', 'Play intro video': '播放介绍视频', 'Mute': '静音', 'SKIP': '跳过', 'Enter': '进入', 'Start page': '开始页面',
    // header, tabs, footer
    'Simulator': '模拟器', 'Governance Timeline': '治理时间线', 'About and Method': '关于与方法', 'Sections': '栏目', 'Mode': '模式',
    'Course project,': '课程项目：', 'Development and Management of the Yellow River Basin': '《黄河流域开发与管理》',
    'Autumn 2026 · Group 2': '2026年秋 · 第2组', 'Replay intro': '重播片头',
    // banner
    'Simplified educational model. Not a forecast.': '简化的教学模型，并非预测。',
    'Teaching model': '教学模型', 'Real measurements': '实测数据', 'What is real?': '哪些是真实的？',
    'Scores, thresholds and starting values here are teaching assumptions, not real operating targets or a forecast.': '这里的分数、阈值和初始值均为教学假设，不是真实的运行目标，也不是预测。',
    'Replay shows measured values at the': '回放显示的是在',
    ', not the dam release. The reservoir level in the animation is illustrative.': '测得的数值，并非大坝放水量。动画中的水库水位仅为示意。',
    // top bar
    'Challenge': '挑战', 'Sandbox': '沙盒', 'Replay': '回放', 'Difficulty': '难度', 'Easy': '简单', 'Normal': '普通', 'Reset': '重置',
    'Simulation idle': '模拟待机', 'Simulation running': '模拟运行中',
    // controls
    'Controls': '控制', 'Meters': '指标',
    'Peak release discharge': '放水峰值流量', 'Release duration': '放水历时', 'Water reserved for supply': '供水预留水量',
    'Water availability': '来水情况', 'Incoming sediment': '入库泥沙', 'Demand': '需水量', 'Reservoir storage': '水库蓄水量', 'Channel capacity': '河道过流能力',
    'days': '天', 'dry': '枯水', 'normal': '平水', 'wet': '丰水', 'low': '低', 'medium': '中', 'high': '高',
    // meters
    'Flood safety': '防洪安全', 'Reservoir health': '水库健康', 'Water supply': '供水保障', 'Ecology': '生态', 'Total score': '总分',
    'Share of demand served, plus water kept for next year and the reserve.': '满足需水的比例，加上留给来年的水量和预留水量。',
    'Rewards': '奖励将泥沙', 'channel capacity': '河道过流能力', 'flushing': '冲刷', 'delta': '三角洲',
    'Drops when the peak release is larger than the': '当放水峰值超过',
    'sediment out and keeping storage near mid-level.': '排出水库，并使库容保持在中等水平。',
    'Rewards longer high flows and sediment and water reaching the': '奖励更长时间的高流量，以及抵达',
    'Not run yet': '尚未运行', 'Critical': '危急', 'Needs attention': '需关注', 'Healthy': '良好',
    'no change vs last run': '与上次相比无变化', 'no change': '无变化',
    '% of capacity': '% 库容',
    // run area
    'Schematic, not a hydraulic model: the three gates open in turn as the peak release rises (all open at 5,000 m³/s). This illustrates release size, not real gate operation.': '示意图，并非水力学模型：随着放水峰值上升，三个闸门依次开启（5,000 m³/s 时全部开启）。它只表示放水大小，并非真实的闸门运行。',
    'Release': '放水', 'm³/s for': 'm³/s，持续', 'days,': '天，预留', '% of water reserved': '% 的水量用于供水',
    'Run regulation': '运行调控', 'Regulation results': '调控结果', 'Back to current': '返回当前',
    'Set the peak release, duration and reserve, then press Run regulation.': '设置放水峰值、历时和预留水量，然后点击“运行调控”。',
    'After each run you get the total score, why each meter moved and a few things to try. Scores come from a simplified teaching model.': '每次运行后，你会看到总分、各项指标变化的原因和一些可以尝试的方向。分数来自简化的教学模型。',
    'Why the scores moved': '分数为何变化', 'Things to try next': '接下来可以尝试', 'Policy not met': '未满足政策要求',
    'Next round': '下一轮', 'See debrief': '查看总结', 'Policy': '政策',
    'Water': '来水', 'Sediment': '泥沙',
    'Could not load data files. Serve the folder over http (see README).': '无法加载数据文件。请通过 http 打开该文件夹（见 README）。',
    // history
    'Run history': '运行历史', 'No runs yet.': '还没有运行记录。', 'No rounds played yet.': '还没有玩过任何一轮。',
    'Every run is saved here so you can compare settings and scores side by side, spot your best run and replay any of them.': '每次运行都会保存在这里，方便你并排比较设置和分数、找出最佳一次，并回放任意一次。',
    'Dashed lines mark the teaching thresholds used for the status colours. Star = best total score.': '虚线表示用于状态颜色的教学阈值。星标 = 总分最高。',
    'Line chart of the four meter scores and the total score for every run': '每次运行四项指标得分与总分的折线图',
    'Round': '轮次', 'Run': '运行', 'Peak': '峰值', 'Days': '天数', 'Reserve': '预留', 'Total': '总分', 'Flood': '防洪', 'Reservoir': '水库', 'Supply': '供水',
    'Result': '结果', 'Best': '最佳', 'Passed': '通过', 'Mixed': '有问题', 'Failed': '失败',
    // replay mode
    'Past regulation event': '历史调控事件', 'Play animation': '播放动画',
    'Real measurements at the Lijin gauge near the sea, not the dam release. The reservoir level in the animation is illustrative.': '数据为近海利津水文站的实测值，并非大坝放水量。动画中的水库水位仅为示意。',
    'Peak flow at Lijin gauge': '利津站洪峰流量', 'Event duration': '事件历时', 'Max sediment concentration': '最大含沙量',
    'Water delivered to sea': '入海水量', 'Sediment delivered to sea': '入海沙量', 'Bankfull capacity': '平滩流量', 'not in dataset': '数据集中没有',
    'Lijin gauge': '利津水文站',
    'Sediment delivered to sea (Mt)': '入海沙量（Mt）', 'Sediment delivered to the sea, Lijin gauge (Mt)': '入海沙量，利津站（Mt）',
    // debrief
    'Debrief': '总结', 'Final score:': '最终得分：', 'Management style:': '管理风格：', 'Rounds passed:': '通过轮数：',
    '· passed with problems:': '· 有问题通过：', '· failed:': '· 失败：',
    'Failed rounds are where the lessons were learnt.': '失败的轮次正是学到教训的地方。',
    'Balanced': '均衡型', 'Flood-first': '防洪优先', 'Water-saver': '节水型', 'Sediment-first': '泥沙优先', 'Ecology-first': '生态优先',
    'Key lessons': '主要启示', 'Play again': '再玩一次',
    'Your bars are release settings in this simplified game, so compare them as an order of magnitude only.': '柱状图是这个简化游戏中的放水设置，只能作数量级上的比较。',
    'Peak flow (m³/s)': '洪峰流量（m³/s）', 'Your peak release': '你的放水峰值', 'Real mean, Lijin 2002 to 2013': '实测平均值，利津站 2002 至 2013',
    'Real minimum': '实测最小值', 'Real maximum': '实测最大值', 'Score (0 to 100)': '得分（0 至 100）',
    'Releasing more than the channel can carry endangers people downstream, but the safe limit is not fixed: scouring raised the real lower river\'s minimum bankfull capacity from about 1,800 m³/s (2002) to about 4,500 m³/s (2020).': '放水超过河道所能承受的流量会危及下游居民，但安全限度并不是固定的：冲刷使黄河下游实际最小平滩流量从约 1,800 m³/s（2002年）提高到约 4,500 m³/s（2020年）。',
    'Flushing sediment needs strong, sustained flow, and that water is also needed for supply. Sanmenxia\'s early siltation is why sediment management became central to the river.': '冲沙需要强劲而持续的流量，而这些水同样是供水所需。三门峡早期的淤积，正是泥沙管理成为治河核心的原因。',
    'No single goal can be maximised. Real regulation has moved from preventing dry-ups to coordinating flood safety, sediment, supply and ecology together.': '没有哪个目标可以单独最大化。现实中的调控已从防止断流，转向统筹防洪安全、泥沙、供水和生态。',
    // timeline tab
    'Each entry links to its sources. Where sources disagree on a date, the entry says so.': '每个条目都附有来源链接。若各来源对日期说法不一，条目中会注明。',
    'Xiaolangdi Dam at a glance.': '小浪底水利枢纽一览。',
    'Infographic about the Xiaolangdi Dam on the Yellow River': '黄河小浪底水利枢纽信息图',
    'Open the Xiaolangdi Dam infographic full size in a new tab': '在新标签页中打开小浪底信息图大图',
    'Sources:': '来源：', 'Sources': '参考文献',
    'More sources are linked inside each Governance Timeline entry.': '更多来源已在每条治理时间线条目中给出链接。',
    // schematic (SVG)
    'Cross-section of the Xiaolangdi reservoir, dam and lower river': '小浪底水库、大坝与下游河道剖面图',
    'Dam, reservoir and river schematic': '大坝、水库与河流示意图',
    'RESERVOIR LEVEL': '水库水位', 'PEAK RELEASE': '放水峰值', 'FLOW INTENSITY': '水流强度', 'SEDIMENT LOAD': '泥沙负荷', 'GATES': '闸门',
    'GATE OPENING': '闸门开度', 'CHANNEL CAPACITY': '河道过流能力', 'PEAK FLOW (LIJIN)': '洪峰流量（利津）', 'SEDIMENT CONC.': '含沙量',
    'BANKFULL CAPACITY': '平滩流量', 'IDLE': '静止', 'LOW': '低', 'MEDIUM': '中', 'HIGH': '高', 'CLOSED': '关闭', 'ILLUSTRATIVE': '仅为示意', 'STORAGE': '库容',
    'RESERVOIR': '水库', 'DAM': '大坝', 'DOWNSTREAM RIVER': '下游河道', 'UPSTREAM': '上游', 'DOWNSTREAM': '下游', 'SPILLWAY': '泄洪道', 'SEA': '大海',
    'FULL POOL': '正常蓄水位', 'RELEASE vs CHANNEL CAPACITY': '放水量 对比 河道过流能力', 'ABOVE CAPACITY': '超出过流能力', 'WITHIN CAPACITY': '未超过流能力',
    // glossary tooltips
    'Flushing (scouring)': '冲刷（排沙）', 'Delta': '三角洲', 'Sediment concentration': '含沙量',
    'The largest flow let out of the dam during the regulation, in cubic metres per second (m³/s). A bigger peak flushes more sediment, but it has to stay within what the river channel can carry.': '调控期间大坝放出的最大流量，单位为立方米每秒（m³/s）。峰值越大，冲走的泥沙越多，但必须控制在河道能够承受的范围内。',
    'How many days the high release lasts. Longer releases move more sediment and help the delta, but they use more reservoir water.': '大流量放水持续的天数。历时越长，输送的泥沙越多，对三角洲也越有利，但会消耗更多水库水量。',
    'The share of available reservoir water you keep back for users. In this model it is a hard limit: the release can only use the water left after the reserve.': '为用水户留存的可用水库水量的比例。在本模型中这是硬性限制：放水只能使用扣除预留后剩下的水。',
    'How full the reservoir is, as a percentage of its volume.': '水库的充满程度，以占库容的百分比表示。',
    'The largest flow the lower river channel can carry before it overflows its banks (bankfull capacity), in m³/s. In this model it rises a little when strong flows scour the riverbed.': '下游河道在漫滩之前所能承载的最大流量（平滩流量），单位 m³/s。在本模型中，强流量冲刷河床时它会略有提高。',
    'The flow at which a river fills its channel up to the top of its banks. Above it, water spills onto the floodplain.': '河水充满河槽、齐平河岸顶部时的流量。超过它，水就会漫上滩地。',
    'How wet the year is: dry, normal or wet. It sets how much water reaches the reservoir. These are teaching categories with sample values, not forecasts.': '当年的干湿程度：枯水、平水或丰水，决定进入水库的水量。这些是带示例数值的教学类别，不是预测。',
    'How much sediment the river carries into the reservoir this year. A teaching category with sample values.': '河流今年带入水库的泥沙量。这是带示例数值的教学类别。',
    'How much water downstream users need this year: low, medium or high. A teaching category.': '下游用水户今年需要的水量：低、中或高。这是教学类别。',
    'Strong, sustained flow lifts sediment from the reservoir and the riverbed and carries it downstream towards the sea.': '强劲而持续的水流把泥沙从水库和河床中冲起，并带向下游和入海口。',
    'The low-lying land where the Yellow River meets the sea. It needs both water and sediment to stay healthy.': '黄河入海处的低洼土地。它需要水和泥沙共同补给才能保持健康。',
    'A weighted average of the four meters, from 0 to 100. These are teaching scores, not real measurements or operating targets.': '四项指标的加权平均，范围 0 至 100。这些是教学分数，不是真实测量值或运行目标。',
    'A river gauge on the lower Yellow River near the sea. Replay values are measured here, so they are not the dam release itself.': '位于黄河下游近海处的水文站。回放数值在此测得，因此不是大坝放水量本身。',
    'How much sediment is in the water, in kilograms per cubic metre (kg/m³).': '水中含有的泥沙量，单位为千克每立方米（kg/m³）。',
    // suggestions without numbers
    'Flood safety: a larger release, still below the channel capacity, reduces risk when a big flood is arriving. It uses more water.': '防洪安全：在不超过河道过流能力的前提下加大放水，可在大洪水来临时降低风险，但会消耗更多水。',
    'Reservoir health: flushing was too weak for the sediment arriving. A higher peak, held for longer and kept below capacity, moves more sediment out.': '水库健康：冲刷力度不足以应对来沙。提高峰值、延长历时，并保持在过流能力以下，可以排出更多泥沙。',
    'Reservoir health: storage ended far from mid-level. Changing how much water you release or reserve moves it back.': '水库健康：蓄水量最终远离中等水平。调整放水量或预留水量可以使其回到中间。',
    'Water supply: the release was cut back by the reserve. Shorten or lower the planned release, or reconsider the reserve, because a higher reserve leaves less water to release.': '供水保障：放水被预留水量限制而削减。可缩短或降低计划放水，或重新考虑预留，因为预留越高，可放的水越少。',
    'Water supply: keeping more water behind the dam, with a shorter release or a higher reserve, helps users and next year.': '供水保障：在坝后多留一些水，缩短放水时间或提高预留，对用水户和来年都有利。',
    'Ecology: a longer release helps the delta, but it uses more water that supply also needs.': '生态：延长放水有利于三角洲，但会消耗供水同样需要的水。',
    'Ecology: more flow and sediment reaching the delta helps, so check the peak and the duration together.': '生态：更多水和泥沙抵达三角洲是有益的，因此请同时考虑峰值和历时。',
    'Every meter is healthy. Try a different trade-off, for example a lower peak or a shorter release, and compare the runs in the history below.': '所有指标都很健康。试试不同的取舍，例如更低的峰值或更短的放水，并在下方的历史记录中比较各次运行。'
  };
  const NAMES = { 'flood safety': '防洪安全', 'reservoir health': '水库健康', 'water supply': '供水保障', 'ecology': '生态' };
  const nameCN = s => NAMES[s.toLowerCase()] || s;
  const STYLE_CN = { pass: '本轮通过', mixed: '本轮通过，但存在问题', fail: '本轮失败' };

  /* ---------------- 2) sentences with numbers ---------------- */
  const N = '([\\d,.]+)';
  const rx = (s, f) => [new RegExp('^' + s + '$'), f];
  const CLAUSES = [
    rx('the ' + N + ' m³\\/s peak was above the channel capacity of ' + N + ' m³\\/s, so flood safety was penalised', m => `放水峰值 ${m[1]} m³/s 超过了河道过流能力 ${m[2]} m³/s，因此防洪安全被扣分`),
    rx('the peak release stayed within the channel capacity', () => '放水峰值未超过河道过流能力'),
    rx('strong flow scoured the riverbed and raised capacity to ' + N + ' m³\\/s', m => `强劲的水流冲刷了河床，使过流能力提高到 ${m[1]} m³/s`),
    rx('the flow was too weak for the sediment load, so deposition cut capacity to ' + N + ' m³\\/s', m => `水流不足以输送入库泥沙，淤积使过流能力降至 ${m[1]} m³/s`),
    rx('the planned release was larger than the water left after the supply reserve, so it was cut back to what the reserve allowed', () => '计划放水量大于扣除供水预留后剩余的水量，因此被削减到预留所允许的水平')
  ];
  const lc = c => c[0].toLowerCase() + c.slice(1);
  function explainTr(core) {
    if (!core.endsWith('.')) return null;
    const out = [];
    for (const c of core.slice(0, -1).split('; ')) {
      const k = lc(c); let got = null;
      for (const [re, f] of CLAUSES) { const m = re.exec(k); if (m) { got = f(m); break; } }
      if (!got) return null; out.push(got);
    }
    return out.join('；') + '。';
  }
  const RULES = [
    rx('AI-generated video \\((.+)\\) · Illustrative (history of the Yellow River|introduction to the project)', m => `AI 生成视频（${m[1]}）· 示意性${m[2].startsWith('history') ? '黄河历史' : '项目介绍'}`),
    rx('Round (\\d+) of (\\d+)', m => `第 ${m[1]} / ${m[2]} 轮`),
    rx('Round (\\d+)', m => `第${m[1]}轮`),
    rx('Run (\\d+)', m => `第${m[1]}次运行`),
    rx('Replay (Round|Run) (\\d+)', m => `回放第${m[2]}${m[1] === 'Round' ? '轮' : '次运行'}`),
    rx('Weighted average: (.+)\\.', m => '加权平均：' + m[1].split(', ').map(p => { const q = /^(.+?) (\d+%)$/.exec(p); return q ? nameCN(q[1]) + ' ' + q[2] : p; }).join('、') + '。'),
    rx('Bar marks: (\\d+) \\(below this a round fails\\) and (\\d+) \\(needed for a clean pass\\)\\. Teaching thresholds, not real operating limits\\.', m => `刻度线：${m[1]}（低于此值该轮失败）和 ${m[2]}（完全通过所需）。这是教学阈值，不是真实的运行限值。`),
    rx('([+−])(\\d+) vs last run', m => `与上次相比 ${m[1]}${m[2]}`),
    rx('(\\d+) out of 100, (.+)', m => `${m[1]} 分（满分 100），${lk(m[2]) || m[2]}`),
        rx('Hint: keep the peak release below the channel capacity \\(' + N + ' m³\\/s now\\), and keep enough water reserved for supply\\.', m => `提示：让放水峰值保持在河道过流能力（目前 ${m[1]} m³/s）以下，并为供水预留足够的水。`),
    rx('(Round passed with problems|Round passed|Round failed)(?:: (.+) too low)?\\. Lesson learnt below\\.', m => ({ 'Round passed': STYLE_CN.pass, 'Round passed with problems': STYLE_CN.mixed, 'Round failed': STYLE_CN.fail }[m[1]]) + (m[2] ? '：' + m[2].split(', ').map(nameCN).join('、') + '过低' : '') + '。下方是本轮的启示。'),
    [/^[A-Z][^]*\.$/, (m, node, core) => explainTr(core)],
    rx('The peak that reached the river, ' + N + ' m³\\/s, was above the channel capacity of ' + N + ' m³\\/s, and the penalty grows with the overshoot\\.', m => `到达河道的峰值 ${m[1]} m³/s 超过了河道过流能力 ${m[2]} m³/s，超出越多，扣分越重。`),
    rx('The peak stayed within capacity \\(' + N + ' m³\\/s\\), but the release was small next to the ' + N + ' m³\\/s flood arriving, which adds flood risk\\.', m => `放水峰值未超过过流能力（${m[1]} m³/s），但与即将到来的 ${m[2]} m³/s 洪水相比放水偏小，增加了洪水风险。`),
    rx('The peak stayed within capacity, but the reservoir ended (\\d+)% full, which cuts the score\\.', m => `放水峰值未超过过流能力，但水库最终蓄满了 ${m[1]}%，导致扣分。`),
    rx('The peak of ' + N + ' m³\\/s stayed within the channel capacity of ' + N + ' m³\\/s\\.', m => `${m[1]} m³/s 的峰值未超过河道过流能力 ${m[2]} m³/s。`),
    rx('(?:([\\d.,-]+) sediment units stayed in the reservoir, which lowers the score and takes up storage\\.|Net flushing removed ([\\d.,-]+) sediment units, which helps\\.) ([\\d.,-]+) units of old deposit remain(?:, and storage ended at (\\d+)%, far from mid-level\\.|\\.)',
      m => (m[1] ? `${m[1]} 个单位的泥沙留在水库中，既降低得分又占用库容。` : `净冲刷带走了 ${m[2]} 个单位的泥沙，这是有利的。`) + ` 旧淤积还剩 ${m[3]} 个单位` + (m[4] ? `，库容最终为 ${m[4]}%，远离中等水平。` : '。')),
    rx('The planned release was more than the water left after the (\\d+)% reserve, so it was cut back by ([\\d.,]+)% of the reservoir volume\\.', m => `计划放水量超过了扣除 ${m[1]}% 预留后剩余的水量，因此被削减了相当于库容 ${m[2]}% 的水量。`),
    rx('(\\d+)% of the water was reserved and (\\d+)% of the reservoir was left after supplying users\\.', m => `预留了 ${m[1]}% 的水，向用水户供水后水库还剩 ${m[2]}%。`),
    rx('The release lasted (\\d+) days, ' + N + ' m³\\/s reached the delta and ([\\d.,-]+) sediment units passed the dam(; very high peaks start to lower this score\\.|\\.)', m => `放水持续 ${m[1]} 天，有 ${m[2]} m³/s 到达三角洲，${m[3]} 个单位的泥沙通过了大坝` + (m[4] === '.' ? '。' : '；过高的峰值会开始降低这一得分。')),
    rx('Flood safety: bring the peak release closer to the channel capacity \\(' + N + ' m³\\/s\\)\\. Weaker flows flush less sediment, so watch reservoir health\\.', m => `防洪安全：让放水峰值更接近河道过流能力（${m[1]} m³/s）。流量变小会冲走更少泥沙，因此要留意水库健康。`),
    rx('Lesson: (.+)', m => { const x = lk(m[1]); return x == null ? null : '启示：' + x; }),
    rx('Best so far: (.+), total (\\d+)', m => `目前最佳：${lk(m[1]) || m[1]}，总分 ${m[2]}`),
    rx('Replaying (.+) from your history…', m => `正在回放历史记录中的${lk(m[1]) || m[1]}…`),
    rx('Showing (.+), a past run\\. Scores and explanations are from that run\\.', m => `正在显示${lk(m[1]) || m[1]}，这是一次历史运行。分数和解释均来自那次运行。`),
    rx('Peak ' + N + ' m³\\/s for (\\d+) days, (\\d+)% reserved', m => `峰值 ${m[1]} m³/s，持续 ${m[2]} 天，预留 ${m[3]}%`),
    rx('Result: (Passed|Mixed|Failed)', m => '结果：' + D[m[1]]),
    rx('(Flood safety|Reservoir health|Water supply|Ecology): (\\d+)', m => `${D[m[1]]}：${m[2]}`),
    rx('Final score', () => '最终得分'),
    rx('Lines show real peak flows at the Lijin gauge for regulation events 2002 to 2013 \\(mean (\\d+), range (\\d+) to (\\d+) m³\\/s; Wang et al\\., 2017\\)\\.\\s+Your bars are release settings in this simplified game, so compare them as an order of magnitude only\\.',
      m => `折线表示 2002 至 2013 年调控事件中利津站的实测洪峰流量（平均 ${m[1]}，范围 ${m[2]} 至 ${m[3]} m³/s；Wang 等，2017）。柱状图是这个简化游戏中的放水设置，只能作数量级上的比较。`),
    rx('Related: (.+)', m => { const i = m[1].indexOf(', '); return '相关：' + (i < 0 ? m[1] : m[1].slice(0, i) + '，' + (lk(m[1].slice(i + 2)) || m[1].slice(i + 2))); }),
    rx('([\\d.,]+) days(?: \\((\\d+) events\\))?', m => `${m[1]} 天` + (m[2] ? `（${m[2]} 次事件）` : '')),
    rx('Source: (.+)\\. Dates: (.+) to (.+), (\\d{4})\\.', m => `来源：${m[1]}。日期：${m[2]} 至 ${m[3]}，${m[4]}年。`),
    // schematic
    rx('(\\d+)% STORAGE', m => `库容 ${m[1]}%`),
    rx('(\\d+) \\/ (\\d+) OPEN', m => `${m[1]} / ${m[2]} 开启`),
    rx('([\\d.,]+) kg\\/m³ MAX', m => `最大 ${m[1]} kg/m³`),
    rx('(CAPACITY|BANKFULL) ([\\d,]+)', m => (m[1] === 'CAPACITY' ? '过流能力 ' : '平滩流量 ') + m[2]),
    rx('(DELIVERED|PEAK FLOW|RELEASE) ([\\d,]+) m³\\/s', m => ({ DELIVERED: '实际放水', 'PEAK FLOW': '洪峰流量', RELEASE: '放水量' }[m[1]]) + ' ' + m[2] + ' m³/s'),
    rx('Dam schematic\\. Reservoir (.+?)\\. (?:Peak ([\\d,]+) cubic metres per second\\. )?Flow (\\w+)\\. Gates (.+?)\\.(?: Channel capacity ([\\d,]+) cubic metres per second, (release above capacity|release within capacity)\\.)?',
      m => `大坝示意图。水库${lk(m[1].toUpperCase()) || m[1]}。` + (m[2] ? `放水峰值 ${m[2]} 立方米每秒。` : '') + `水流${lk(m[3].toUpperCase()) || m[3]}。闸门${lk(m[4].toUpperCase()) || lk(m[4].replace(/ open$/i, '').toUpperCase()) || m[4]}。` + (m[5] ? `河道过流能力 ${m[5]} 立方米每秒，${m[6].endsWith('above capacity') ? '放水量超过过流能力' : '放水量未超过过流能力'}。` : ''))
  ];

  function lk(core, node) {
    if (Object.prototype.hasOwnProperty.call(D, core)) return D[core];
    for (const [re, f] of RULES) { const m = re.exec(core); if (m) { const r = f(m, node, core); if (r != null) return r; } }
    return null;
  }
  // text that is only "." closes a sentence that a glossary term split in two
  function dotAfterTerm(node) {
    const p = node && node.previousSibling, k = p && p.dataset && p.dataset.term;
    return { capacity: '时将下降。', delta: '的泥沙和水量。', flushing: '' }[k] ?? null;
  }
  function tr(s, node) {
    if (s.trim() === '.') { const d = dotAfterTerm(node); return d == null ? s : d; }
    const whole = s.trim();
    if (Object.prototype.hasOwnProperty.call(D, whole)) {          // exact text including any leading punctuation
      const o = D[whole], w = /^(\s*)[^]*?(\s*)$/.exec(s);
      return (CJK.test(o[0]) ? '' : w[1]) + o + (CJK.test(o[o.length - 1]) ? '' : w[2]);
    }
    const m = /^(\s*[:;,.]*\s*)([^]*?)(\s*)$/.exec(s);
    const core = m[2]; if (!core || !/[A-Za-z]/.test(core)) return s;
    let out = lk(core, node); if (out == null) return s;
    let pre = m[1], suf = m[3];
    if (CJK.test(out[0])) pre = pre.replace(/,/g, '，').replace(/:/g, '：').replace(/;/g, '；').replace(/\./g, '。').replace(/\s+/g, '');
    if (CJK.test(out[out.length - 1])) suf = '';
    return pre + out + suf;
  }
  window.tr = (s, node) => (lang === 'zh' && typeof s === 'string') ? tr(s, node) : s;   // used by app.js for the charts
  window.getLang = () => lang;

  /* ---------------- DOM translation ---------------- */
  const rec = new WeakMap();            // text node -> { en, zh }
  const ATTRS = ['aria-label', 'title', 'alt', 'aria-valuetext'];
  const skip = n => { const p = n.parentElement; return !p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.tagName) || p.closest('[data-no-i18n],[data-lang]'); };

  function doText(n) {
    if (skip(n)) return;
    const v = n.nodeValue, r = rec.get(n);
    if (r && v === r.zh) return;                      // our own change
    const en = v, zh = lang === 'zh' ? tr(en, n) : en;
    if (zh === en) { rec.delete(n); return; }
    // keep <option> values stable (the model reads them): give the option an explicit value before its text changes
    const p = n.parentElement; if (p && p.tagName === 'OPTION' && !p.hasAttribute('value')) p.setAttribute('value', p.textContent);
    rec.set(n, { en, zh }); n.nodeValue = zh;
  }
  function restoreText(n) { const r = rec.get(n); if (r && n.nodeValue === r.zh) n.nodeValue = r.en; rec.delete(n); }
  function doAttr(el, a) {
    if (!el.hasAttribute(a) || el.closest('[data-no-i18n],[data-lang]')) return;
    const st = (el._i18n = el._i18n || {}), v = el.getAttribute(a), r = st[a];
    if (r && v === r.zh) return;
    const zh = lang === 'zh' ? tr(v, null) : v;
    if (zh === v) { delete st[a]; return; }
    st[a] = { en: v, zh }; el.setAttribute(a, zh);
  }
  function restoreAttr(el, a) { const r = el._i18n && el._i18n[a]; if (r && el.getAttribute(a) === r.zh) el.setAttribute(a, r.en); if (el._i18n) delete el._i18n[a]; }

  function walk(root, restore) {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = []; for (let n = tw.nextNode(); n; n = tw.nextNode()) list.push(n);
    list.forEach(n => restore ? restoreText(n) : doText(n));
    const els = root.nodeType === 1 ? [root, ...root.querySelectorAll('[aria-label],[title],[alt],[aria-valuetext]')] : root.querySelectorAll('[aria-label],[title],[alt],[aria-valuetext]');
    els.forEach(el => ATTRS.forEach(a => restore ? restoreAttr(el, a) : doAttr(el, a)));
  }
  function onMutations(list) {
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttr(m.target, m.attributeName);
      else m.addedNodes.forEach(n => { if (n.nodeType === 3) doText(n); else if (n.nodeType === 1) walk(n); });
    }
  }
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(onMutations);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  function stopObserver() { if (observer) { observer.disconnect(); observer = null; } }

  /* ---------------- switching ---------------- */
  const TITLE = { en: document.title, zh: '河流管理者：小浪底水沙调控“轻量数字孪生”' };
  function setLang(l, save) {
    lang = l === 'zh' ? 'zh' : 'en';
    if (save !== false) { try { localStorage.setItem(KEY, lang); } catch (e) { } }
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = TITLE[lang];
    if (lang === 'zh') { walk(document.body); startObserver(); }
    else { stopObserver(); walk(document.body, true); }
    document.querySelectorAll('[data-anchor]').forEach(el => { el.id = el.closest('[data-lang]').dataset.lang === lang ? el.dataset.anchor : ''; });
    document.querySelectorAll('[data-lang-toggle]').forEach(b => {
      b.textContent = lang === 'zh' ? 'EN' : '中文';
      b.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换到中文');
      b.title = b.getAttribute('aria-label');
    });
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-lang-toggle]'); if (b) setLang(lang === 'zh' ? 'en' : 'zh'); });

  // optional Chinese for the data files: data/i18n_zh.json = { "English text": "中文", ... }
  fetch('data/i18n_zh.json').then(r => r.ok ? r.json() : null).then(j => { if (j) { Object.assign(D, j); if (lang === 'zh') walk(document.body); } }).catch(() => { });
  if (window.Chart) Chart.defaults.font.family = "'Space Grotesk','Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif";

  let start = 'en';
  try { start = new URLSearchParams(location.search).get('lang') || localStorage.getItem(KEY) || 'en'; } catch (e) { }
  setLang(start, false);
})();
