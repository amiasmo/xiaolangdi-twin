/* app.js - tabs, dashboard UI, Sandbox, Replay, Challenge display. Physics is in model.js, rules in game.js. */

/* ===== GLOSSARY: plain-language definitions shown as tooltips (hover, keyboard focus or tap) ===== */
const GLOSSARY = {
  peak: ['Peak release discharge', 'The largest flow let out of the dam during the regulation, in cubic metres per second (m³/s). A bigger peak flushes more sediment, but it has to stay within what the river channel can carry.'],
  days: ['Release duration', 'How many days the high release lasts. Longer releases move more sediment and help the delta, but they use more reservoir water.'],
  reserve: ['Water reserved for supply', 'The share of available reservoir water you keep back for users. In this model it is a hard limit: the release can only use the water left after the reserve.'],
  storage: ['Reservoir storage', 'How full the reservoir is, as a percentage of its volume.'],
  capacity: ['Channel capacity', 'The largest flow the lower river channel can carry before it overflows its banks (bankfull capacity), in m³/s. In this model it rises a little when strong flows scour the riverbed.'],
  bankfull: ['Bankfull capacity', 'The flow at which a river fills its channel up to the top of its banks. Above it, water spills onto the floodplain.'],
  availability: ['Water availability', 'How wet the year is: dry, normal or wet. It sets how much water reaches the reservoir. These are teaching categories with sample values, not forecasts.'],
  sediment: ['Incoming sediment', 'How much sediment the river carries into the reservoir this year. A teaching category with sample values.'],
  demand: ['Demand', 'How much water downstream users need this year: low, medium or high. A teaching category.'],
  flushing: ['Flushing (scouring)', 'Strong, sustained flow lifts sediment from the reservoir and the riverbed and carries it downstream towards the sea.'],
  delta: ['Delta', 'The low-lying land where the Yellow River meets the sea. It needs both water and sediment to stay healthy.'],
  total: ['Total score', 'A weighted average of the four meters, from 0 to 100. These are teaching scores, not real measurements or operating targets.'],
  lijin: ['Lijin gauge', 'A river gauge on the lower Yellow River near the sea. Replay values are measured here, so they are not the dam release itself.'],
  ssc: ['Sediment concentration', 'How much sediment is in the water, in kilograms per cubic metre (kg/m³).']
};
const T = (k, label) => `<span class="term" tabindex="0" data-term="${k}">${label}</span>`;
(function () {   // one shared tooltip element, positioned next to whichever term is hovered, focused or tapped
  const tip = document.createElement('div'); tip.id = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip);
  let cur = null, y0 = 0;
  const hide = () => { if (cur) cur.removeAttribute('aria-describedby'); cur = null; tip.hidden = true; };
  function show(el) {
    const g = GLOSSARY[el.dataset.term]; if (!g) return;
    if (cur && cur !== el) cur.removeAttribute('aria-describedby');
    cur = el; y0 = scrollY; el.setAttribute('aria-describedby', 'tip'); tip.innerHTML = `<b>${g[0]}</b>${g[1]}`; tip.hidden = false;
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    tip.style.top = (r.bottom + 8 + h > innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8) + 'px';
  }
  const term = e => e.target.closest && e.target.closest('.term');
  document.addEventListener('mouseover', e => { const t = term(e); if (t) show(t); });
  document.addEventListener('mouseout', e => { const t = term(e); if (t && t !== document.activeElement) hide(); });   // a tapped or focused term stays open until blur, Escape or another tap
  document.addEventListener('focusin', e => { const t = term(e); if (t) show(t); });
  document.addEventListener('focusout', e => { if (term(e)) hide(); });
  document.addEventListener('click', e => { const t = term(e);   // tap on touch screens
    if (t) { e.preventDefault(); if (cur !== t) show(t); } else hide(); });   // preventDefault: a term inside a <label> must not move focus to the slider
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
  addEventListener('scroll', () => { if (cur && Math.abs(scrollY - y0) > 30) hide(); }, { passive: true });   // tooltips are fixed, so a real scroll closes them
  addEventListener('resize', () => { if (cur) hide(); });
})();

/* ===== CONFIG: slider ranges, units, defaults (edit here) ===== */
const CONFIG = {
  runMs: 4000,   // animation length
  controls: [
    { id: 'peak', label: 'Peak release discharge', unit: 'm³/s', min: 500, max: 5000, step: 100, def: 2500, scope: 'all' },
    { id: 'days', label: 'Release duration', unit: 'days', min: 3, max: 20, step: 1, def: 10, scope: 'all' },
    { id: 'reserve', label: 'Water reserved for supply', unit: '%', min: 0, max: 60, step: 5, def: 25, scope: 'all' },
    { id: 'availability', label: 'Water availability', type: 'select', options: ['dry', 'normal', 'wet'], def: 'normal', scope: 'sandbox' },
    { id: 'sediment', label: 'Incoming sediment', type: 'select', options: ['low', 'medium', 'high'], def: 'medium', scope: 'sandbox' },
    { id: 'demand', label: 'Demand', type: 'select', options: ['low', 'medium', 'high'], def: 'medium', scope: 'sandbox' },
    { id: 'storage', label: 'Reservoir storage', unit: '%', min: 0, max: 100, step: 5, def: 55, scope: 'sandbox' },
    { id: 'capacity', label: 'Channel capacity', unit: 'm³/s', min: 1000, max: 6000, step: 100, def: 2800, scope: 'sandbox' }
  ],
  meters: [
    { id: 'flood', label: 'Flood safety', color: '#a99bff', desc: `Drops when the peak release is larger than the ${T('capacity', 'channel capacity')}.` },
    { id: 'reservoir', label: 'Reservoir health', color: '#ffb454', desc: `Rewards ${T('flushing', 'flushing')} sediment out and keeping storage near mid-level.` },
    { id: 'supply', label: 'Water supply', color: '#3de0ff', desc: 'Share of demand served, plus water kept for next year and the reserve.' },
    { id: 'ecology', label: 'Ecology', color: '#6fd6a0', desc: `Rewards longer high flows and sediment and water reaching the ${T('delta', 'delta')}.` }
  ]
};

/* Key lessons. "tag" links a lesson to the timeline entry that has the same "lesson" tag in data/timeline.json */
const LESSONS = [
  { tag: 'flood', text: 'Releasing more than the channel can carry endangers people downstream, but the safe limit is not fixed: scouring raised the real lower river\'s minimum bankfull capacity from about 1,800 m³/s (2002) to about 4,500 m³/s (2020).' },
  { tag: 'sediment', text: 'Flushing sediment needs strong, sustained flow, and that water is also needed for supply. Sanmenxia\'s early siltation is why sediment management became central to the river.' },
  { tag: 'balance', text: 'No single goal can be maximised. Real regulation has moved from preventing dry-ups to coordinating flood safety, sediment, supply and ecology together.' }
];

const $ = id => document.getElementById(id);
let mode = 'challenge', busy = false, charts = {};
// Run button: disabled + aria-busy while a regulation is animating (spinner is CSS)
function setRunning(on) { const b = $('runBtn'); b.disabled = on; if ($('histTable')) { if (on) $('histTable').dataset.busy = 'true'; else delete $('histTable').dataset.busy; } if (on) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy'); }
let data = { rounds: [], events: [], timeline: [] };

/* ---------- tabs and modes ---------- */
function showTab(name) {
  document.querySelectorAll('.tabpanel').forEach(p => p.hidden = p.id !== 'tab-' + name);
  document.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name));
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab]'); if (t) { showTab(t.dataset.tab); if (t.dataset.goto && $(t.dataset.goto)) $(t.dataset.goto).scrollIntoView({ behavior: REDUCE_MOTION ? 'auto' : 'smooth' }); }
  const m = e.target.closest('.toggle [data-mode]'); if (m) setMode(m.dataset.mode);
});
// Elements with data-modes="a b" are only visible in those modes
function setBanner(m) {
  const real = m === 'replay', b = $('banner');
  b.dataset.kind = real ? 'real' : 'teach';
  b.innerHTML = real
    ? `<span class="badge">Real measurements</span><span>Replay shows measured values at the ${T('lijin', 'Lijin gauge')}, not the dam release. The reservoir level in the animation is illustrative.</span>`
    : `<span class="badge">Teaching model</span><span>Scores, thresholds and starting values here are teaching assumptions, not real operating targets or a forecast.</span>`;
  b.insertAdjacentHTML('beforeend', '<button type="button" class="banner-link" data-tab="about" data-goto="about-real">What is real?</button>');
}
function setMode(m) {
  setBanner(m);
  mode = m; $('dashboard').dataset.mode = m;   // lets CSS give Replay a full-width layout
  document.querySelectorAll('.toggle button').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  document.querySelectorAll('[data-modes]').forEach(el => el.hidden = !el.dataset.modes.split(' ').includes(m));
  $('debrief').hidden = true; $('dashboard').hidden = false;
  if (m === 'challenge') startGame(); else if (m === 'sandbox') resetSandbox(); else showEvent();
}

/* ---------- controls and meters ---------- */
function buildControls() {
  CONFIG.controls.forEach(c => {
    const w = document.createElement('div');
    w.className = 'ctl'; w.dataset.modes = c.scope === 'all' ? 'challenge sandbox' : 'sandbox';
    if (c.type === 'select') {
      w.innerHTML = `<label for="c-${c.id}">${T(c.id, c.label)}</label><select id="c-${c.id}">` +
        c.options.map(o => `<option ${o === c.def ? 'selected' : ''}>${o}</option>`).join('') + '</select>';
    } else {
      w.innerHTML = `<label for="c-${c.id}">${T(c.id, c.label)}: <output id="o-${c.id}"></output> ${c.unit}</label>` +
        `<input type="range" id="c-${c.id}" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.def}">`;
      w.querySelector('input').addEventListener('input', e => { $('o-' + c.id).textContent = e.target.value; setPct(e.target); });
      w.querySelector('output').textContent = c.def; setPct(w.querySelector('input'));
    }
    $('controls').appendChild(w);
  });
  const W = GAME_CONFIG.weights, O = GAME_CONFIG.outcome;
  const bar = id => `<div class="bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-labelledby="mn-${id}" id="mb-${id}">
      <i id="m-${id}"></i><u class="tick" style="left:${id === 'total' ? O.failScore : O.failBelow}%"></u><u class="tick" style="left:${O.passAbove}%"></u></div>`;
  const foot = id => `<div class="meter-foot"><span class="status" id="ms-${id}" data-s="idle">Not run yet</span><span class="delta" id="md-${id}"></span></div>`;
  const wTxt = CONFIG.meters.map(m => `${m.label.toLowerCase()} ${Math.round(W[m.id] * 100)}%`).join(', ');
  $('meterList').innerHTML =
    `<div class="meter total"><div class="meter-head"><span class="meter-name" id="mn-total">${T('total', 'Total score')}</span>
       <span class="meter-val"><b id="mv-total">–</b><small>/100</small></span></div>${bar('total')}${foot('total')}
       <p class="meter-desc">Weighted average: ${wTxt}.</p></div>` +
    CONFIG.meters.map(m => `<div class="meter"><div class="meter-head"><span class="meter-name" id="mn-${m.id}">${m.label}</span>
       <span class="meter-val"><b id="mv-${m.id}">–</b><small>/100</small></span></div>${bar(m.id)}${foot(m.id)}
       <p class="meter-desc">${m.desc}</p></div>`).join('') +
    `<p class="meter-key small">Bar marks: ${O.failBelow} (below this a round fails) and ${O.passAbove} (needed for a clean pass). Teaching thresholds, not real operating limits.</p>`;
}
const setPct = el => el.style.setProperty('--pct', ((el.value - el.min) / (el.max - el.min) * 100) + '%');   // slider fill
function setControl(id, v) {
  const el = $('c-' + id); el.value = v; if (el.type === 'range') setPct(el);
  const o = $('o-' + id); if (o) o.textContent = v;
  updateDock();
}
function getInputs() {
  const o = {};
  CONFIG.controls.forEach(c => { const v = $('c-' + c.id).value; o[c.id] = c.type === 'select' ? v : +v; });
  return o;
}
/* Verdict badge: success / mixed / failed, shown above the result sentence (the lesson still follows) */
const VERDICT = { pass: 'Round passed', mixed: 'Round passed with problems', fail: 'Round failed' };
function setVerdict(status, weak) {
  const v = $('verdict'); if (!status) { v.hidden = true; return; }
  v.hidden = false; v.dataset.status = status;
  v.textContent = VERDICT[status] + (status === 'fail' && weak.length ? ': ' + weak.join(', ') + ' too low' : '') + '. Lesson learnt below.';
}

/* ---------- results card: idle state, summary, reasons and suggestions (all read from the model result) ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtN = n => Math.round(n).toLocaleString('en-US');
const histNow = () => mode === 'challenge' ? Game.history : sandboxHist;
function lastRun(at) { const h = histNow(), i = at == null ? h.length - 1 : at; return i >= 1 ? h[i - 1] : null; }   // the run before run #at (default: the newest)
function showResultsIdle(msg) {
  $('resIdle').hidden = false; $('resBody').hidden = true; setVerdict(null); $('replayNote').hidden = true;
  $('resIdleText').textContent = msg || 'Set the peak release, duration and reserve, then press Run regulation.';
  $('rsScore').dataset.v = 0; $('teaching').textContent = ''; $('nextBtn').hidden = true;
}
// one sentence per meter: which model quantity drove the score
function reasons(res, inp) {
  const eff = effPeak(res, inp), cap = Math.round(inp.capacity), st = Math.round(res.storage);
  const flood = res.overBankfull ? `The peak that reached the river, ${fmtN(eff)} m³/s, was above the channel capacity of ${fmtN(cap)} m³/s, and the penalty grows with the overshoot.`
    : inp.inflowPeak && eff < 0.6 * inp.inflowPeak ? `The peak stayed within capacity (${fmtN(cap)} m³/s), but the release was small next to the ${fmtN(inp.inflowPeak)} m³/s flood arriving, which adds flood risk.`
    : res.storage > 90 ? `The peak stayed within capacity, but the reservoir ended ${st}% full, which cuts the score.`
    : `The peak of ${fmtN(eff)} m³/s stayed within the channel capacity of ${fmtN(cap)} m³/s.`;
  const reservoir = (res.sedStored > 0 ? `${res.sedStored} sediment units stayed in the reservoir, which lowers the score and takes up storage.`
    : `Net flushing removed ${Math.abs(res.sedStored)} sediment units, which helps.`) +
    ` ${res.sedStock} units of old deposit remain` + (Math.abs(res.storage - 50) > 25 ? `, and storage ended at ${st}%, far from mid-level.` : '.');
  const supply = res.overdraw > 0 ? `The planned release was more than the water left after the ${inp.reserve}% reserve, so it was cut back by ${res.overdraw}% of the reservoir volume.`
    : `${inp.reserve}% of the water was reserved and ${st}% of the reservoir was left after supplying users.`;
  const ecology = `The release lasted ${inp.days} days, ${fmtN(res.deltaFlow)} m³/s reached the delta and ${res.sedOut} sediment units passed the dam` +
    (eff > 4500 ? '; very high peaks start to lower this score.' : '.');
  return { flood, reservoir, supply, ecology };
}
// suggestions point at levers and trade-offs; they never set the controls
function suggestions(res, inp, meters) {
  const low = Object.keys(meters).filter(k => meters[k] < GAME_CONFIG.outcome.passAbove).sort((x, y) => meters[x] - meters[y]).slice(0, 2), out = [];
  low.forEach(k => {
    if (k === 'flood') out.push(res.overBankfull ? `Flood safety: bring the peak release closer to the channel capacity (${fmtN(inp.capacity)} m³/s). Weaker flows flush less sediment, so watch reservoir health.`
      : 'Flood safety: a larger release, still below the channel capacity, reduces risk when a big flood is arriving. It uses more water.');
    if (k === 'reservoir') out.push(res.sedStored > 0 ? 'Reservoir health: flushing was too weak for the sediment arriving. A higher peak, held for longer and kept below capacity, moves more sediment out.'
      : 'Reservoir health: storage ended far from mid-level. Changing how much water you release or reserve moves it back.');
    if (k === 'supply') out.push(res.overdraw > 0 ? 'Water supply: the release was cut back by the reserve. Shorten or lower the planned release, or reconsider the reserve, because a higher reserve leaves less water to release.'
      : 'Water supply: keeping more water behind the dam, with a shorter release or a higher reserve, helps users and next year.');
    if (k === 'ecology') out.push(inp.days < 10 ? 'Ecology: a longer release helps the delta, but it uses more water that supply also needs.' : 'Ecology: more flow and sediment reaching the delta helps, so check the peak and the duration together.');
  });
  if (!out.length) out.push('Every meter is healthy. Try a different trade-off, for example a lower peak or a shorter release, and compare the runs in the history below.');
  return out;
}
function renderResults(res, inp, meters, violations, at) {
  $('resIdle').hidden = true; $('resBody').hidden = false;
  const W = GAME_CONFIG.weights, total = Math.round(Object.keys(W).reduce((s, k) => s + W[k] * meters[k], 0)), last = lastRun(at);
  const sb = $('rsScore'), [s] = meterStatus(total, true); sb.dataset.s = s; tweenNumber(sb, total);
  const dl = $('rsDelta');
  if (last) { const d = total - Math.round(last.score); dl.dataset.d = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
    dl.textContent = d === 0 ? 'no change vs last run' : (d > 0 ? '+' : '−') + Math.abs(d) + ' vs last run'; } else { dl.textContent = ''; dl.dataset.d = ''; }
  $('resultText').textContent = explain(res, inp);
  const why = reasons(res, inp);
  $('resWhy').innerHTML = CONFIG.meters.map(c => {
    const v = Math.round(meters[c.id]), [ms, label] = meterStatus(v), p = last ? Math.round(last.meters[c.id]) : null, d = p == null ? null : v - p;
    return `<li data-s="${ms}"><div class="why-head"><b>${c.label}</b><span class="why-v">${v}</span><span class="status" data-s="${ms}">${label}</span>` +
      (d == null ? '' : `<span class="delta" data-d="${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}">${d === 0 ? 'no change' : (d > 0 ? '+' : '−') + Math.abs(d)}</span>`) + `</div><p>${why[c.id]}</p></li>`;
  }).join('') + (violations || []).map(v => `<li data-s="bad" class="why-policy"><div class="why-head"><b>Policy not met</b></div><p>${esc(v)}</p></li>`).join('');
  $('resNext').innerHTML = suggestions(res, inp, meters).map(t => `<li>${esc(t)}</li>`).join('');
}

/* ---------- run history graph (Challenge: every round; Sandbox: every run) ---------- */
let sandboxHist = [];
const STATUS_TXT = { pass: 'Passed', mixed: 'Mixed', fail: 'Failed' };
// dashed teaching-threshold lines (the same 40 / 60 used for the meter status colours)
const thresholdPlugin = { id: 'thresholds', beforeDatasetsDraw(chart) {
  const O = GAME_CONFIG.outcome, { ctx, chartArea: a, scales: { y } } = chart;
  ctx.save(); ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(232,241,255,.3)'; ctx.fillStyle = 'rgba(147,168,196,.9)'; ctx.font = '10px sans-serif';
  [O.failBelow, O.passAbove].forEach(v => { const yy = y.getPixelForValue(v); ctx.beginPath(); ctx.moveTo(a.left, yy); ctx.lineTo(a.right, yy); ctx.stroke(); ctx.fillText(String(v), a.left + 4, yy - 3); });
  ctx.restore(); } };
function drawRunChart() {
  const h = histNow(), ch = mode === 'challenge';
  $('histIdle').hidden = h.length > 0; $('histBody').hidden = !h.length;
  $('histIdleText').textContent = ch ? 'No rounds played yet.' : 'No runs yet.';
  if (!h.length) { $('histBest').hidden = true; if (charts.runChart) { charts.runChart.destroy(); delete charts.runChart; } return; }
  const label = (x, i) => (ch ? 'Round ' : 'Run ') + (x.round || i + 1);
  const best = h.reduce((b, x, i) => x.score > h[b].score ? i : b, 0);
  const bestEl = $('histBest'); bestEl.hidden = h.length < 2;
  bestEl.textContent = h.length < 2 ? '' : `Best so far: ${label(h[best], best)}, total ${Math.round(h[best].score)}`;
  // comparison table: settings and scores side by side, best run highlighted
  const cell = v => { const r = Math.round(v), [s] = meterStatus(r); return `<td data-s="${s}">${r}</td>`; };
  $('histTable').innerHTML = `<thead><tr><th scope="col">${ch ? 'Round' : 'Run'}</th><th scope="col">${T('peak', 'Peak')} <small>m³/s</small></th>
    <th scope="col">${T('days', 'Days')}</th><th scope="col">${T('reserve', 'Reserve')} <small>%</small></th>
    <th scope="col">Total</th><th scope="col">Flood</th><th scope="col">Reservoir</th><th scope="col">Supply</th><th scope="col">Ecology</th>${ch ? '<th scope="col">Result</th>' : ''}<th scope="col"><span class="sr-only">Replay</span></th></tr></thead><tbody>` +
    h.map((x, i) => { const [ts] = meterStatus(Math.round(x.score), true), d = i ? Math.round(x.score) - Math.round(h[i - 1].score) : null;
      return `<tr${i === best && h.length > 1 ? ' class="best"' : ''}><th scope="row">${label(x, i)}${i === best && h.length > 1 ? ' <span class="best-tag">Best</span>' : ''}</th>
        <td>${fmtN(x.inp.peak)}</td><td>${x.inp.days}</td><td>${x.inp.reserve}</td>
        <td data-s="${ts}" class="tot"><b>${Math.round(x.score)}</b>${d == null ? '' : `<span class="delta" data-d="${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}">${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)}</span>`}</td>
        ${CONFIG.meters.map(m => cell(x.meters[m.id])).join('')}${ch ? `<td><span class="status" data-s="${{ pass: 'ok', mixed: 'warn', fail: 'bad' }[x.status]}">${STATUS_TXT[x.status]}</span></td>` : ''}
        <td><button type="button" class="hist-replay" data-replay="${i}" aria-label="Replay ${label(x, i)}">Replay</button></td></tr>`; }).join('') + '</tbody>';
  // chart: four meters plus the total; star marks the best total
  const line = (lb, key, color) => ({ type: 'line', label: lb, data: h.map(x => Math.round(x.meters[key])), borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 3, tension: 0 });
  makeChart('runChart', { yTitle: 'Score (0 to 100)', yMax: 100, plugins: [thresholdPlugin],
    legend: { position: 'bottom', labels: { color: '#e8f1ff', usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 14 } },
    tooltip: { callbacks: { title: it => label(h[it[0].dataIndex], it[0].dataIndex),
      afterBody: it => { const x = h[it[0].dataIndex]; return [`Peak ${fmtN(x.inp.peak)} m³/s for ${x.inp.days} days, ${x.inp.reserve}% reserved`].concat(x.status ? ['Result: ' + STATUS_TXT[x.status]] : []); } } },
    data: { labels: h.map(label), datasets: [...CONFIG.meters.map(m => line(m.label, m.id, m.color)),
      { type: 'line', label: 'Total score', data: h.map(x => Math.round(x.score)), borderColor: '#ffffff', backgroundColor: '#ffffff', borderWidth: 3, tension: 0,
        pointStyle: c => c.dataIndex === best && h.length > 1 ? 'star' : 'circle', pointRadius: c => c.dataIndex === best && h.length > 1 ? 10 : 4 }] } });
}

/* ---------- replay a past run: re-animate the stored result (the model is not re-run) ---------- */
const animOf = (res, inp, s0, sedLevel) => ({ storage0: s0, storage1: res.storage, peak: inp.peak, sed: { low: .2, medium: .5, high: .9 }[sedLevel],
  delta: Math.min(1, res.sedOut / 40), cap: inp.capacity, eff: effPeak(res, inp), over: res.overBankfull });
function showHistoryRun(i) {
  const x = histNow()[i];
  setMeters(x.meters, i); renderResults(x.result, x.inp, x.meters, x.violations, i); showState(x.result.storage, x.result.capacity);
  if (mode === 'challenge') { setVerdict(x.status, x.weak); $('teaching').textContent = 'Lesson: ' + x.lesson; }
  $('nextBtn').hidden = true;
}
function restoreCurrent() {
  const h = histNow(), ch = mode === 'challenge', played = ch ? h.length === Game.i + 1 : h.length > 0;
  $('replayNote').hidden = true;
  if (played) {
    const x = h[h.length - 1]; showHistoryRun(h.length - 1); drawSchematic({ ...x.anim, storage: x.anim.storage1, gate: 0 });
    if (ch) { $('nextBtn').textContent = Game.isLast() ? 'See debrief' : 'Next round'; $('nextBtn').hidden = false; }
  } else {
    showResultsIdle(); setMeters(null);
    if (ch) { showState(Game.storage, Game.capacity); drawSchematic({ storage: Game.storage, gate: 0, sed: { low: .2, medium: .5, high: .9 }[Game.round().sediment_level], delta: 0, cap: Game.capacity }); }
    else { const v = id => +$('c-' + id).value; showState(v('storage'), v('capacity'));
      drawSchematic({ storage: v('storage'), gate: 0, sed: { low: .2, medium: .5, high: .9 }[$('c-sediment').value], delta: 0, cap: v('capacity') }); }
  }
}
function replayRun(i) {
  const x = histNow()[i]; if (!x || busy) return;
  busy = true; const run = $('runBtn'), was = run.disabled; run.disabled = true; $('histTable').dataset.busy = 'true';
  const name = (mode === 'challenge' ? 'Round ' : 'Run ') + (x.round || i + 1);
  $('replayNote').hidden = false; $('replayNoteText').textContent = `Replaying ${name} from your history…`; $('replayBack').hidden = true;
  animateRun(x.anim, () => {
    showHistoryRun(i); busy = false; run.disabled = was; delete $('histTable').dataset.busy;
    $('replayNoteText').textContent = `Showing ${name}, a past run. Scores and explanations are from that run.`; $('replayBack').hidden = false;
  });
}
$('histTable').addEventListener('click', e => { const b = e.target.closest('[data-replay]'); if (b) replayRun(+b.dataset.replay); });
$('replayBack').addEventListener('click', () => { if (!busy) restoreCurrent(); });

const REDUCE_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
function tweenNumber(el, to) {            // count the shown number to its new value (instant if reduced motion)
  cancelAnimationFrame(el._raf);
  const from = +el.dataset.v || 0; el.dataset.v = to;
  if (REDUCE_MOTION || from === to) { el.textContent = to; return; }
  const t0 = performance.now(), ms = 700;
  const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * e); if (k < 1) el._raf = requestAnimationFrame(step); };
  el._raf = requestAnimationFrame(step);
}
// status uses the game's own thresholds (GAME_CONFIG.outcome), nothing new is invented here
function meterStatus(v, isTotal) {
  const O = GAME_CONFIG.outcome, lo = isTotal ? O.failScore : O.failBelow;
  return v < lo ? ['bad', 'Critical'] : v < O.passAbove ? ['warn', 'Needs attention'] : ['ok', 'Healthy'];
}
function setMeter(id, v, prev, isTotal) {            // v: rounded score or null (idle); prev: previous run's score or null
  const bar = $('m-' + id), st = $('ms-' + id), dl = $('md-' + id), box = $('mb-' + id);
  if (v == null) {
    bar.style.width = '0%'; bar.dataset.s = 'idle'; $('mv-' + id).textContent = '–'; $('mv-' + id).dataset.v = 0;
    cancelAnimationFrame($('mv-' + id)._raf); box.removeAttribute('aria-valuenow'); box.removeAttribute('aria-valuetext');
    st.dataset.s = 'idle'; st.textContent = 'Not run yet'; dl.textContent = ''; dl.dataset.d = ''; return;
  }
  const [s, label] = meterStatus(v, isTotal);
  bar.style.width = v + '%'; bar.dataset.s = s; tweenNumber($('mv-' + id), v);
  box.setAttribute('aria-valuenow', v); box.setAttribute('aria-valuetext', `${v} out of 100, ${label}`);
  st.dataset.s = s; st.textContent = label;
  if (prev == null) { dl.textContent = ''; dl.dataset.d = ''; }
  else { const d = v - prev; dl.dataset.d = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
    dl.textContent = d === 0 ? 'no change vs last run' : (d > 0 ? '+' : '−') + Math.abs(d) + ' vs last run'; }
}
function setMeters(m, at) {
  const last = lastRun(at);   // the run before this one
  CONFIG.meters.forEach(c => setMeter(c.id, m ? Math.round(m[c.id]) : null, m && last ? Math.round(last.meters[c.id]) : null));
  const W = GAME_CONFIG.weights;
  const tot = m ? Math.round(Object.keys(W).reduce((s, k) => s + W[k] * m[k], 0)) : null;
  setMeter('total', tot, m && last ? Math.round(last.score) : null, true);
}
function showState(storage, capacity) {
  $('stateBox').innerHTML = `<dl class="state"><div><dt>${T('storage', 'Reservoir storage')}</dt><dd>${Math.round(storage)} <small>% of capacity</small></dd></div>
    <div><dt>${T('capacity', 'Channel capacity')}</dt><dd>${Math.round(capacity).toLocaleString('en-US')} <small>m³/s</small></dd></div></dl>`;
}

/* ---------- schematic ---------- */
// Header chip mirrors the scene's own run state (the 'running' class set by animateRun)
new MutationObserver(() => {
  const r = Scene.host.classList.contains('running'), el = $('simState');
  el.dataset.state = r ? 'running' : 'idle'; el.textContent = r ? 'Simulation running' : 'Simulation idle';
}).observe(Scene.host, { attributes: true, attributeFilter: ['class'] });
function drawSchematic(o) { Scene.update(o); }   // o: storage %, gate 0..1, sed 0..1, delta 0..1 (see js/schematic.js)
// Animate ~4 s: open gate, level moves to the end value, jets/river flow, then close the gate
// peak the release actually reached: the planned peak is cut back when the supply reserve limits the water (model: releaseVol / plannedVol)
const effPeak = (res, inp) => res.plannedVol > 0 ? inp.peak * res.releaseVol / res.plannedVol : inp.peak;
function animateRun(o, done) {
  const svg = Scene.host;
  drawSchematic({ storage: o.storage0, gate: 0, sed: o.sed, delta: 0, peak: o.peak, src: o.src, ssc: o.ssc, cap: o.cap, eff: o.eff, over: o.over });
  requestAnimationFrame(() => {
    svg.classList.add('running');
    drawSchematic({ storage: o.storage1, gate: o.peak / 5000, sed: o.sed, delta: o.delta, peak: o.peak, src: o.src, ssc: o.ssc, cap: o.cap, eff: o.eff, over: o.over });
  });
  setTimeout(() => {
    svg.classList.remove('running');
    drawSchematic({ storage: o.storage1, gate: 0, sed: o.sed, delta: o.delta, peak: o.peak, src: o.src, ssc: o.ssc, cap: o.cap, eff: o.eff, over: o.over });
    done();
  }, CONFIG.runMs);
}

/* ---------- result sentence ---------- */
function explain(r, inp) {
  const s = [];
  s.push(r.overBankfull
    ? `the ${inp.peak} m³/s peak was above the channel capacity of ${Math.round(inp.capacity)} m³/s, so flood safety was penalised`
    : 'the peak release stayed within the channel capacity');
  s.push(r.bedChange >= 0
    ? `strong flow scoured the riverbed and raised capacity to ${r.capacity} m³/s`
    : `the flow was too weak for the sediment load, so deposition cut capacity to ${r.capacity} m³/s`);
  if (r.overdraw > 0) s.push('the planned release was larger than the water left after the supply reserve, so it was cut back to what the reserve allowed');
  const t = s.join('; ') + '.';
  return t[0].toUpperCase() + t.slice(1);
}

/* ---------- run button (Challenge and Sandbox) ---------- */
$('runBtn').addEventListener('click', () => {
  if (busy) return; busy = true; setRunning(true); $('replayNote').hidden = true;
  if (mode === 'challenge') runChallenge(); else runSandbox();
});
function finishRun(res, inp, meters, violations) {
  $('runBtn').removeAttribute('aria-busy'); delete $('histTable').dataset.busy;   // history Replay buttons are usable again   // Challenge keeps the button disabled until Next round; Sandbox re-enables it
  setMeters(meters); drawRunChart(); showState(res.storage, res.capacity);
  renderResults(res, inp, meters, violations);
  busy = false;
}
function runSandbox() {
  const inp = getInputs(), res = runScenario(inp);
  const sc = Object.keys(GAME_CONFIG.weights).reduce((s, k) => s + GAME_CONFIG.weights[k] * res.meters[k], 0);
  const anim = animOf(res, inp, inp.storage, inp.sediment);
  sandboxHist.push({ round: sandboxHist.length + 1, meters: res.meters, score: sc, inp, result: res, violations: [], anim });
  animateRun(anim, () => {
    finishRun(res, inp, res.meters);
    setControl('storage', Math.round(res.storage / 5) * 5); setControl('capacity', Math.round(res.capacity / 100) * 100); // carry on
    setRunning(false);
  });
}

/* Dock readout: echoes the current slider values so the Run button sits next to what it will run */
function updateDock() {
  const v = id => $('c-' + id) ? +$('c-' + id).value : null;
  if (v('peak') == null || v('days') == null || v('reserve') == null) return;
  $('dockSummary').innerHTML = `Release <b>${v('peak').toLocaleString('en-US')}</b> m³/s for <b>${v('days')}</b> days, <b>${v('reserve')}</b>% of water reserved`;
}
$('controls').addEventListener('input', updateDock);

/* ---------- Challenge UI ---------- */
function startGame() {
  Game.start(data.rounds, $('difficulty').value);
  CONFIG.controls.slice(0, 3).forEach(c => setControl(c.id, c.def));
  renderRound();
}
function renderRound() {
  const r = Game.round(), n = data.rounds.length;
  const hints = r.id === 1 || GAME_CONFIG.difficulty[Game.diff].hints;
  $('roundInd').textContent = `Round ${r.id} of ${n}`;
  const pol = Game.activePolicies().map(p => `<p><span class="chip">Policy</span><b>${p.title}</b>: ${p.rule}</p>`).join('');
  $('roundCard').innerHTML = `<h3>${r.title}</h3><p>${r.special_event}</p>
    <span class="chip">${T('availability', 'Water')}: ${r.water_availability}</span><span class="chip">${T('sediment', 'Sediment')}: ${r.sediment_level}</span>
    <span class="chip">${T('demand', 'Demand')}: ${r.demand_level}</span>${pol}` +
    (hints ? `<p class="small">Hint: keep the peak release below the channel capacity (${Math.round(Game.capacity)} m³/s now), and keep enough water reserved for supply.</p>` : '');
  showResultsIdle(); setRunning(false); busy = false;
  drawRunChart();
  setMeters(null); showState(Game.storage, Game.capacity);
  drawSchematic({ storage: Game.storage, gate: 0, sed: { low: .2, medium: .5, high: .9 }[r.sediment_level], delta: 0, cap: Game.capacity });
}
function runChallenge() {
  const r = Game.round(), s0 = Game.storage;
  const out = Game.play(getInputs()), anim = animOf(out.result, out.inputs, s0, r.sediment_level);
  Object.assign(Game.history[Game.history.length - 1], { anim, lesson: r.teaching_note });
  animateRun(anim, () => {
    finishRun(out.result, out.inputs, out.meters, out.violations);
    setVerdict(out.status, out.weak);
    $('teaching').textContent = 'Lesson: ' + r.teaching_note;
    $('nextBtn').textContent = Game.isLast() ? 'See debrief' : 'Next round'; $('nextBtn').hidden = false;
  });
}
$('nextBtn').addEventListener('click', () => { if (Game.isLast()) showDebrief(); else { Game.next(); renderRound(); } });
$('resetBtn').addEventListener('click', () => mode === 'challenge' ? startGame() : resetSandbox());
$('difficulty').addEventListener('change', startGame);
function resetSandbox() {
  CONFIG.controls.forEach(c => setControl(c.id, c.def));
  sandboxHist = []; showResultsIdle(); drawRunChart();
  setMeters(null); showState(55, 2800); 
  setRunning(false); busy = false;
  drawSchematic({ storage: 55, gate: 0, sed: .5, delta: 0, cap: CONFIG.controls.find(c => c.id === 'capacity').def });
}

/* ---------- Debrief ---------- */
function showDebrief() {
  const d = Game.debrief();
  $('dashboard').hidden = true;

  // Real peak flows at Lijin (data/events.json): mean, min and max are computed here, not typed in
  const peaks = data.events.map(e => e.peak_flow_lijin);
  const mean = peaks.reduce((a, b) => a + b, 0) / peaks.length;
  const lo = Math.min(...peaks), hi = Math.max(...peaks);
  const n = Game.history.length;
  const flat = v => Game.history.map(() => v);   // a horizontal reference line

  // Each lesson links to the timeline entry that carries the same "lesson" tag
  const lessons = LESSONS.map(l => {
    const t = data.timeline.find(x => x.lesson === l.tag);
    return `<li>${l.text}` + (t ? ` <button data-tab="timeline">Related: ${t.date}, ${t.title}</button>` : '') + '</li>';
  }).join('');

  $('debrief').hidden = false;
  $('debrief').innerHTML = `<h2>Debrief</h2><p>Final score: <b>${Math.round(d.score)} / 100</b>. Management style: <b>${d.style}</b></p>
    <p>Rounds passed: <b>${d.passed}</b> · passed with problems: <b>${d.mixed}</b> · failed: <b>${d.failed}</b>. Failed rounds are where the lessons were learnt.</p>
    <ul>${CONFIG.meters.map(m => `<li>${m.label}: ${Math.round(d.avg[m.id])}</li>`).join('')}</ul>
    <div class="chartbox"><canvas id="debriefChart"></canvas></div>
    <p class="small">Lines show real peak flows at the Lijin gauge for regulation events 2002 to 2013 (mean ${Math.round(mean)}, range ${lo} to ${hi} m³/s; Wang et al., 2017).
    Your bars are release settings in this simplified game, so compare them as an order of magnitude only.</p>
    <h3>Key lessons</h3><ol>${lessons}</ol><button id="againBtn">Play again</button>`;
  $('againBtn').onclick = () => { $('debrief').hidden = true; $('dashboard').hidden = false; startGame(); };

  makeChart('debriefChart', {
    yTitle: 'Peak flow (m³/s)',
    data: { labels: Game.history.map(h => 'Round ' + h.round), datasets: [
      { type: 'bar', label: 'Your peak release', data: Game.history.map(h => h.peak), backgroundColor: '#ffb454' },
      { type: 'line', label: 'Real mean, Lijin 2002 to 2013', data: flat(Math.round(mean)), borderColor: '#3de0ff', pointRadius: 0 },
      { type: 'line', label: 'Real minimum', data: flat(lo), borderColor: '#3de0ff', borderDash: [6, 4], pointRadius: 0 },
      { type: 'line', label: 'Real maximum', data: flat(hi), borderColor: '#3de0ff', borderDash: [6, 4], pointRadius: 0 }] }
  });
}
// Wrapper: destroys the old chart, tolerates Chart.js being offline. cfg.yTitle = optional y-axis label.
function makeChart(id, cfg) {
  if (charts[id]) charts[id].destroy();
  if (typeof Chart === 'undefined') return;
  let { yTitle, yMax, tooltip, legend, plugins, ...rest } = cfg;
  // language: translate chart text (canvas text is not part of the page, so i18n.js cannot reach it)
  const L = window.tr || (s => s);
  yTitle = yTitle && L(yTitle);
  if (rest.data) { rest.data.labels = rest.data.labels.map(x => L(x)); rest.data.datasets.forEach(d => { d.label = L(d.label); }); }
  if (tooltip && tooltip.callbacks) { const cb = tooltip.callbacks;
    tooltip = { ...tooltip, callbacks: { title: it => L(cb.title(it)), afterBody: it => cb.afterBody(it).map(x => L(x)) } }; }
  const tick = { color: '#93a8c4' }, grid = { color: 'rgba(94,196,255,.10)' };
  rest.options = { maintainAspectRatio: false, animation: REDUCE_MOTION ? false : undefined, interaction: tooltip ? { mode: 'index', intersect: false } : undefined,
    scales: { x: { ticks: tick, grid },
              y: { ticks: tick, grid, min: yMax != null ? 0 : undefined, max: yMax, title: { display: !!yTitle, text: yTitle, color: '#93a8c4' } } },
    plugins: { legend: legend || { labels: { color: '#e8f1ff' } }, tooltip: tooltip || {} } };
  if (plugins) rest.plugins = plugins;
  charts[id] = new Chart($(id), { type: 'bar', ...rest });
}

/* ---------- Replay (real events, data/events.json) ---------- */
function showEvent() {
  const idx = +$('eventSel').value, e = data.events[idx]; if (!e) return;
  const cards = [
    [T('lijin', 'Peak flow at Lijin gauge'), e.peak_flow_lijin + ' m³/s'],
    ['Event duration', e.duration_days + ' days' + (e.events > 1 ? ` (${e.events} events)` : '')],
    [T('ssc', 'Max sediment concentration'), e.max_ssc + ' kg/m³'],
    ['Water delivered to sea', e.water_to_sea_km3 + ' km³'],
    ['Sediment delivered to sea', e.sediment_to_sea_mt + ' Mt'],
    [T('bankfull', 'Bankfull capacity'), e.bankfull_capacity ? '≈ ' + e.bankfull_capacity + ' m³/s' : 'not in dataset']
  ];
  $('eventCards').innerHTML = cards.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('') +
    `<div style="grid-column:1/-1">${e.notes}<br><span class="small">Source: ${e.source}. Dates: ${e.start} to ${e.end}, ${e.year}.</span></div>`;
  // Bar chart of sediment delivered to the sea in every event year; the selected year is highlighted
  makeChart('replayChart', { yTitle: 'Sediment delivered to sea (Mt)',
    data: { labels: data.events.map(x => String(x.year)),
      datasets: [{ label: 'Sediment delivered to the sea, Lijin gauge (Mt)', data: data.events.map(x => x.sediment_to_sea_mt),
        backgroundColor: data.events.map((x, i) => i === idx ? '#ffc857' : '#2c4a73') }] } });
  drawSchematic({ storage: 60, gate: 0, sed: Math.min(1, e.max_ssc / 80), delta: 0, peak: e.peak_flow_lijin, src: 'lijin', ssc: e.max_ssc, cap: e.bankfull_capacity || null });
}
$('eventSel').addEventListener('change', showEvent);
$('replayBtn').addEventListener('click', () => {
  const e = data.events[$('eventSel').value];
  // The reservoir levels 60 -> 45 are only illustrative: the dataset has no reservoir level
  animateRun({ storage0: 60, storage1: 45, peak: e.peak_flow_lijin, sed: Math.min(1, e.max_ssc / 80),
    delta: Math.min(1, e.sediment_to_sea_mt / 140), src: 'lijin', ssc: e.max_ssc, cap: e.bankfull_capacity || null }, () => {});
});

/* ---------- start-up ---------- */
async function init() {
  buildControls();
  try {
    const get = n => fetch(`data/${n}.json`).then(r => r.json());
    [data.rounds, data.events, data.timeline] = await Promise.all([get('rounds'), get('events'), get('timeline')]);
  } catch (err) { showResultsIdle('Could not load data files. Serve the folder over http (see README).'); return; }
  $('eventSel').innerHTML = data.events.map((e, i) => `<option value="${i}">${e.year}</option>`).join('');
  // Timeline: each entry lists its sources as links
  $('timelineList').innerHTML = data.timeline.map(t => {
    const src = (t.sources || []).map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join(' · ');
    return `<li id="tl-${t.id}"><b>${t.date}: ${t.title}</b><br>${t.text}<br><span class="small">Sources: ${src}</span></li>`;
  }).join('');
  setMode('challenge');
}
init();

/* ---------- language switch: redraw what is drawn on canvases, and the parts built from stored values ---------- */
document.addEventListener('langchange', () => {
  if (!data.rounds.length) return;                         // data not loaded yet
  if (!$('debrief').hidden) showDebrief();                 // debrief screen (has its own chart)
  else { drawRunChart(); if (mode === 'replay') showEvent(); }
});
