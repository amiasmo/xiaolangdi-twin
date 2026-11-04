/* app.js - tabs, dashboard UI, Sandbox, Replay, Challenge display. Physics is in model.js, rules in game.js. */

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
    { id: 'flood', label: 'Flood safety', color: '#ffc857' },
    { id: 'reservoir', label: 'Reservoir health', color: '#ff8a4c' },
    { id: 'supply', label: 'Water supply', color: '#3de0ff' },
    { id: 'ecology', label: 'Ecology', color: '#6fbf8a' }
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
let data = { rounds: [], events: [], timeline: [] };

/* ---------- tabs and modes ---------- */
function showTab(name) {
  document.querySelectorAll('.tabpanel').forEach(p => p.hidden = p.id !== 'tab-' + name);
  document.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name));
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab]'); if (t) showTab(t.dataset.tab);
  const m = e.target.closest('.toggle [data-mode]'); if (m) setMode(m.dataset.mode);
});
// Elements with data-modes="a b" are only visible in those modes
function setMode(m) {
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
      w.innerHTML = `<label for="c-${c.id}">${c.label}</label><select id="c-${c.id}">` +
        c.options.map(o => `<option ${o === c.def ? 'selected' : ''}>${o}</option>`).join('') + '</select>';
    } else {
      w.innerHTML = `<label for="c-${c.id}">${c.label}: <output id="o-${c.id}"></output> ${c.unit}</label>` +
        `<input type="range" id="c-${c.id}" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.def}">`;
      w.querySelector('input').addEventListener('input', e => { $('o-' + c.id).textContent = e.target.value; setPct(e.target); });
      w.querySelector('output').textContent = c.def; setPct(w.querySelector('input'));
    }
    $('controls').appendChild(w);
  });
  $('meterList').innerHTML = CONFIG.meters.map(m =>
    `<div class="meter"><span>${m.label}: <b id="mv-${m.id}">–</b></span>
     <div class="bar"><i id="m-${m.id}" style="background:${m.color}"></i></div></div>`).join('');
}
const setPct = el => el.style.setProperty('--pct', ((el.value - el.min) / (el.max - el.min) * 100) + '%');   // slider fill
function setControl(id, v) {
  const el = $('c-' + id); el.value = v; if (el.type === 'range') setPct(el);
  const o = $('o-' + id); if (o) o.textContent = v;
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

/* ---------- run history graph (Challenge: every round; Sandbox: every run) ---------- */
let sandboxHist = [];
function drawRunChart() {
  const h = mode === 'challenge' ? Game.history : sandboxHist;
  const line = (label, key, color, dash) => ({ type: 'line', label, data: h.map(x => key === 'score' ? Math.round(x.score) : Math.round(x.meters[key])),
    borderColor: color, backgroundColor: color, borderDash: dash || [], pointRadius: 4, tension: .25 });
  makeChart('runChart', { yTitle: 'Score (0 to 100)', yMax: 100,
    data: { labels: h.map((x, i) => (mode === 'challenge' ? 'Round ' : 'Run ') + (x.round || i + 1)),
      datasets: [...CONFIG.meters.map(m => line(m.label, m.id, m.color)), line('Total score', 'score', '#ffffff', [6, 4])] } });
}
function setMeters(m) {
  CONFIG.meters.forEach(c => {
    const v = m ? Math.round(m[c.id]) : 0;
    $('m-' + c.id).style.width = v + '%'; $('mv-' + c.id).textContent = m ? v : '–';
  });
}
function showState(storage, capacity) {
  $('stateBox').textContent = `Reservoir storage left: ${Math.round(storage)}%. Channel capacity: ${Math.round(capacity)} m³/s.`;
}

/* ---------- schematic ---------- */
const waterColor = s => {   // blue (clear) -> brown (muddy)
  const a = [58, 140, 200], b = [150, 105, 55];
  return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * s)).join(',') + ')';
};
// Header chip mirrors the scene's own run state (the 'running' class set by animateRun)
new MutationObserver(() => {
  const r = Scene.host.classList.contains('running'), el = $('simState');
  el.dataset.state = r ? 'running' : 'idle'; el.textContent = r ? 'Simulation running' : 'Simulation idle';
}).observe(Scene.host, { attributes: true, attributeFilter: ['class'] });
function drawSchematic(o) { Scene.update(o); }   // o: storage %, gate 0..1, sed 0..1, delta 0..1 (see js/schematic.js)
// Animate ~4 s: open gate, level moves to the end value, jets/river flow, then close the gate
function animateRun(o, done) {
  const svg = Scene.host;
  drawSchematic({ storage: o.storage0, gate: 0, sed: o.sed, delta: 0, peak: o.peak, src: o.src, ssc: o.ssc });
  requestAnimationFrame(() => {
    svg.classList.add('running');
    drawSchematic({ storage: o.storage1, gate: o.peak / 5000, sed: o.sed, delta: o.delta, peak: o.peak, src: o.src, ssc: o.ssc });
  });
  setTimeout(() => {
    svg.classList.remove('running');
    drawSchematic({ storage: o.storage1, gate: 0, sed: o.sed, delta: o.delta, peak: o.peak, src: o.src, ssc: o.ssc });
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
  if (busy) return; busy = true; $('runBtn').disabled = true;
  if (mode === 'challenge') runChallenge(); else runSandbox();
});
function finishRun(res, inp, meters, extra) {
  setMeters(meters); drawRunChart(); showState(res.storage, res.capacity);
  $('resultText').textContent = explain(res, inp) + (extra || '');
  busy = false;
}
function runSandbox() {
  const inp = getInputs(), res = runScenario(inp);
  const sc = Object.keys(GAME_CONFIG.weights).reduce((s, k) => s + GAME_CONFIG.weights[k] * res.meters[k], 0);
  sandboxHist.push({ round: sandboxHist.length + 1, meters: res.meters, score: sc });
  animateRun({ storage0: inp.storage, storage1: res.storage, peak: inp.peak, sed: { low: .2, medium: .5, high: .9 }[inp.sediment],
    delta: Math.min(1, res.sedOut / 40) }, () => {
    finishRun(res, inp, res.meters);
    setControl('storage', Math.round(res.storage / 5) * 5); setControl('capacity', Math.round(res.capacity / 100) * 100); // carry on
    $('runBtn').disabled = false;
  });
}

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
    <span class="chip">Water: ${r.water_availability}</span><span class="chip">Sediment: ${r.sediment_level}</span>
    <span class="chip">Demand: ${r.demand_level}</span>${pol}` +
    (hints ? `<p class="small">Hint: keep the peak release below the channel capacity (${Math.round(Game.capacity)} m³/s now), and keep enough water reserved for supply.</p>` : '');
  $('resultText').textContent = 'Set the controls, then press Run regulation.';
  $('teaching').textContent = ''; $('nextBtn').hidden = true; $('runBtn').disabled = false; busy = false;
  setVerdict(null); drawRunChart();
  setMeters(null); showState(Game.storage, Game.capacity);
  drawSchematic({ storage: Game.storage, gate: 0, sed: { low: .2, medium: .5, high: .9 }[r.sediment_level], delta: 0 });
}
function runChallenge() {
  const r = Game.round(), s0 = Game.storage;
  const out = Game.play(getInputs());
  animateRun({ storage0: s0, storage1: out.result.storage, peak: out.inputs.peak,
    sed: { low: .2, medium: .5, high: .9 }[r.sediment_level], delta: Math.min(1, out.result.sedOut / 40) }, () => {
    finishRun(out.result, out.inputs, out.meters, ' ' + out.violations.join(' '));
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
  sandboxHist = []; setVerdict(null); drawRunChart();
  setMeters(null); showState(55, 2800); $('resultText').textContent = 'Set the controls, then press Run regulation.';
  $('runBtn').disabled = false; busy = false;
  drawSchematic({ storage: 55, gate: 0, sed: .5, delta: 0 });
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
  const { yTitle, yMax, ...rest } = cfg;
  const tick = { color: '#93a8c4' }, grid = { color: 'rgba(94,196,255,.10)' };
  rest.options = { maintainAspectRatio: false,
    scales: { x: { ticks: tick, grid },
              y: { ticks: tick, grid, min: yMax != null ? 0 : undefined, max: yMax, title: { display: !!yTitle, text: yTitle, color: '#93a8c4' } } },
    plugins: { legend: { labels: { color: '#e8f1ff' } } } };
  charts[id] = new Chart($(id), { type: 'bar', ...rest });
}

/* ---------- Replay (real events, data/events.json) ---------- */
function showEvent() {
  const idx = +$('eventSel').value, e = data.events[idx]; if (!e) return;
  const cards = [
    ['Peak flow at Lijin gauge', e.peak_flow_lijin + ' m³/s'],
    ['Event duration', e.duration_days + ' days' + (e.events > 1 ? ` (${e.events} events)` : '')],
    ['Max sediment concentration', e.max_ssc + ' kg/m³'],
    ['Water delivered to sea', e.water_to_sea_km3 + ' km³'],
    ['Sediment delivered to sea', e.sediment_to_sea_mt + ' Mt'],
    ['Bankfull capacity', e.bankfull_capacity ? '≈ ' + e.bankfull_capacity + ' m³/s' : 'not in dataset']
  ];
  $('eventCards').innerHTML = cards.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('') +
    `<div style="grid-column:1/-1">${e.notes}<br><span class="small">Source: ${e.source}. Dates: ${e.start} to ${e.end}, ${e.year}.</span></div>`;
  // Bar chart of sediment delivered to the sea in every event year; the selected year is highlighted
  makeChart('replayChart', { yTitle: 'Sediment delivered to sea (Mt)',
    data: { labels: data.events.map(x => String(x.year)),
      datasets: [{ label: 'Sediment delivered to the sea, Lijin gauge (Mt)', data: data.events.map(x => x.sediment_to_sea_mt),
        backgroundColor: data.events.map((x, i) => i === idx ? '#ffc857' : '#2c4a73') }] } });
  drawSchematic({ storage: 60, gate: 0, sed: Math.min(1, e.max_ssc / 80), delta: 0, peak: e.peak_flow_lijin, src: 'lijin', ssc: e.max_ssc });
}
$('eventSel').addEventListener('change', showEvent);
$('replayBtn').addEventListener('click', () => {
  const e = data.events[$('eventSel').value];
  // The reservoir levels 60 -> 45 are only illustrative: the dataset has no reservoir level
  animateRun({ storage0: 60, storage1: 45, peak: e.peak_flow_lijin, sed: Math.min(1, e.max_ssc / 80),
    delta: Math.min(1, e.sediment_to_sea_mt / 140), src: 'lijin', ssc: e.max_ssc }, () => {});
});

/* ---------- start-up ---------- */
async function init() {
  buildControls();
  try {
    const get = n => fetch(`data/${n}.json`).then(r => r.json());
    [data.rounds, data.events, data.timeline] = await Promise.all([get('rounds'), get('events'), get('timeline')]);
  } catch (err) { $('resultText').textContent = 'Could not load data files. Serve the folder over http (see README).'; return; }
  $('eventSel').innerHTML = data.events.map((e, i) => `<option value="${i}">${e.year}</option>`).join('');
  // Timeline: each entry lists its sources as links
  $('timelineList').innerHTML = data.timeline.map(t => {
    const src = (t.sources || []).map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join(' · ');
    return `<li id="tl-${t.id}"><b>${t.date}: ${t.title}</b><br>${t.text}<br><span class="small">Sources: ${src}</span></li>`;
  }).join('');
  setMode('challenge');
}
init();