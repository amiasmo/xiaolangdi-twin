/* schematic.js - scene renderer for the dam / reservoir / river diagram.
   Visual layer only: app.js calls Scene.update(state); no physics here.
   STEP 1: composition + API. (Waves, flow ribbons, particles, HUD follow in later steps.)
   state: { storage 0..100, gate 0..1, sed 0..1, delta 0..1 } */
const Scene = (function () {
  const host = document.getElementById('schematic');
  const Y_FULL = 120, Y_BED = 314;                       // full-pool and bed levels (viewBox units)
  const faceX = y => 392 + (y - 100) * 0.2542;           // downstream dam face x at height y
  const BAYS = [271, 238, 205];                          // opening heights, lowest opens first

  const bays = BAYS.map((y, i) => `
    <g class="bay" data-i="${i}">
      <rect class="bay-frame" x="${faceX(y) - 41}" y="${y - 3}" width="40" height="26" rx="3"/>
      <rect class="bay-hole" x="${faceX(y) - 38}" y="${y}" width="34" height="20" rx="2"/>
      <rect class="bay-glow" x="${faceX(y) - 38}" y="${y}" width="34" height="20" rx="2"/>
      <rect class="bay-door" x="${faceX(y) - 38}" y="${y}" width="34" height="20" rx="2"/>
      <circle class="bay-lamp" cx="${faceX(y) - 49}" cy="${y + 10}" r="2.6"/>
      <text class="bay-id" x="${faceX(y) - 55}" y="${y + 13}" text-anchor="end">G${i + 1}</text>
    </g>`).join('');

  const HUD = [['lvl', 'RESERVOIR LEVEL'], ['peak', 'PEAK RELEASE'], ['int', 'FLOW INTENSITY'], ['sed', 'SEDIMENT LOAD'], ['gate', 'GATES'], ['open', 'GATE OPENING'], ['cap', 'CHANNEL CAPACITY']];
  const hudSvg = HUD.map(([id, l], i) => `<text class="hud-l" x="534" y="${35 + i * 20}" data-h="${id}-l">${l}</text><text class="hud-v" x="782" y="${35 + i * 20}" text-anchor="end" data-h="${id}-v">–</text>`).join('');
  const hudHtml = HUD.map(([id, l]) => `<div><span data-h="${id}-l">${l}</span><b data-h="${id}-v">–</b></div>`).join('');
  const jetsSvg = BAYS.map(() => '<g class="jet"><path class="jet-body"/><path class="jet-core"/></g>').join('');
  host.innerHTML = `
  <svg viewBox="0 0 800 400" role="img" aria-label="Cross-section of the Xiaolangdi reservoir, dam and lower river">
    <defs>
      <pattern id="sc-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#3de0ff" stroke-opacity=".06"/></pattern>
      <linearGradient id="sc-sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#06142a"/><stop offset="1" stop-color="#0a2140"/></linearGradient>
      <linearGradient id="sc-water" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3fb8c9"/><stop offset=".5" stop-color="#1f6f9f"/><stop offset="1" stop-color="#0b2f57"/></linearGradient>
      <linearGradient id="sc-concrete" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#4a5568"/><stop offset=".55" stop-color="#8b97aa"/><stop offset="1" stop-color="#b4bfd0"/></linearGradient>
      <linearGradient id="sc-land" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#14233a"/><stop offset="1" stop-color="#0a1426"/></linearGradient>
      <linearGradient id="sc-rivfade" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#6fd6ea" stop-opacity=".38"/><stop offset=".45" stop-color="#6fd6ea" stop-opacity="0"/><stop offset="1" stop-color="#b4803f" stop-opacity=".34"/></linearGradient>
      <linearGradient id="sc-sea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#11507f"/><stop offset="1" stop-color="#092745"/></linearGradient>
      <pattern id="sc-tex" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#fff" opacity=".35"/><circle cx="4" cy="4" r=".5" fill="#000" opacity=".4"/></pattern>
      <linearGradient id="sc-wet" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#0b2f57" stop-opacity=".75"/><stop offset="1" stop-color="#0b2f57" stop-opacity="0"/></linearGradient>
      <radialGradient id="sc-plumeg"><stop offset="0" stop-color="#c98f3a" stop-opacity=".85"/><stop offset="1" stop-color="#c98f3a" stop-opacity="0"/></radialGradient>
      <clipPath id="sc-damclip"><polygon points="352,100 392,100 452,338 352,338"/></clipPath>
      <clipPath id="sc-basin"><path d="M20 120 C40 170 70 240 130 278 C190 306 270 314 352 314 L352 120 Z"/></clipPath>
    </defs>

    <rect width="800" height="400" fill="url(#sc-sky)"/>
    <rect width="800" height="400" fill="url(#sc-grid)"/>
    <path d="M0 150 L70 95 L150 125 L230 80 L330 112 L352 100 L470 140 L560 118 L680 150 L800 130 V400 H0Z" fill="#0b1b33" opacity=".7"/>

    <!-- reservoir: basin (land), water, surface line -->
    <path d="M0 100 L20 120 C40 170 70 240 130 278 C190 306 270 314 352 314 L352 400 H0Z" fill="url(#sc-land)"/>
    <g clip-path="url(#sc-basin)">
      <g id="sc-level"><path id="sc-waterbody" d="M0 120 H360 V330 H0Z" fill="url(#sc-water)"/>
        <rect id="sc-tint" x="0" y="120" width="360" height="210" fill="#b07a3c" opacity="0"/>
        <path id="sc-surface" d="M0 120 H360" stroke="#9ff3ff" stroke-opacity=".75" stroke-width="1.5" fill="none"/>
        <path id="sc-sheen" d="M0 120 H360" stroke="#fff" stroke-opacity=".18" stroke-width="3" fill="none" transform="translate(0 3)"/></g>
    </g>
    <path d="M20 120 C40 170 70 240 130 278 C190 306 270 314 352 314" fill="none" stroke="#3de0ff" stroke-opacity=".35"/>

    <!-- level marker (JS positions it) -->
    <g id="sc-mark" class="sc-mk" font-family="JetBrains Mono, ui-monospace, Menlo, Consolas, monospace" font-size="10" letter-spacing="1">
      <line x1="236" x2="352" y1="0" y2="0" stroke="#ffc857" stroke-dasharray="4 3" stroke-opacity=".9"/>
      <path d="M352 0 l-8 -4 v8z" fill="#ffc857"/>
      <text id="sc-mark-t" x="340" y="-6" text-anchor="end" fill="#ffe2b8">STORAGE</text>
    </g>
    <line x1="236" x2="352" y1="120" y2="120" stroke="#3de0ff" stroke-opacity=".3" stroke-dasharray="2 4"/>
    <text class="sc-sec" x="236" y="115" font-family="JetBrains Mono, monospace" font-size="9" letter-spacing="1.5" fill="#6f8aa8">FULL POOL</text>

    <!-- downstream: ground, river, sea -->
    <path d="M352 314 H800 V400 H352Z" fill="url(#sc-land)"/>
    <rect x="700" y="290" width="100" height="110" fill="url(#sc-sea)"/>
    <path d="M436 334 C520 348 600 318 700 336" fill="none" stroke="#3de0ff" stroke-opacity=".16" stroke-width="47" stroke-linecap="round"/>
    <path d="M436 334 C520 348 600 318 700 336" fill="none" stroke="#0a1426" stroke-width="44" stroke-linecap="round"/>
    <path id="sc-over" d="M436 334 C520 348 600 318 700 336" fill="none" stroke="#ff6b6b" stroke-width="40" stroke-dasharray="5 7" stroke-linecap="round" opacity="0"/>
    <path id="sc-river" d="M436 334 C520 348 600 318 700 336" fill="none" stroke="#5d7f9c" stroke-width="26" stroke-linecap="round"/>
    <path id="sc-river-fade" d="M436 334 C520 348 600 318 700 336" fill="none" stroke="url(#sc-rivfade)" stroke-width="26" stroke-linecap="round"/>
    <path id="sc-river-deep" d="M436 334 C520 348 600 318 700 336" fill="none" stroke="#0b2f57" stroke-opacity=".38" stroke-width="12" stroke-linecap="round"/>
    <path class="sc-glint" d="M436 334 C520 348 600 318 700 336" transform="translate(0 -5)"/>
    <path class="sc-glint g2" d="M436 334 C520 348 600 318 700 336" transform="translate(0 4)"/>
    <path class="sc-stream" d="M436 334 C520 348 600 318 700 336" transform="translate(0 -6)"/>
    <path class="sc-stream" d="M436 334 C520 348 600 318 700 336" transform="translate(0 6)"/>
    <ellipse id="sc-plume" cx="712" cy="336" rx="30" ry="22" fill="url(#sc-plumeg)" opacity="0"/>
    <ellipse id="sc-delta" cx="700" cy="336" rx="20" ry="14" fill="#b4803f"/>

    <!-- valley wall behind the dam, ground shadow -->
    <path d="M392 100 L480 122 L600 150 L800 168 V320 H452Z" fill="#0f1f38" stroke="#3de0ff" stroke-opacity=".12"/>
    <ellipse cx="478" cy="341" rx="46" ry="7" fill="#000" opacity=".35"/>
    <!-- dam: side plane (thickness), front face, texture, joints, wet upstream toe -->
    <polygon points="392,100 418,91 478,330 452,338" fill="#5b667a" stroke="#d5deec" stroke-opacity=".25"/>
    <polygon points="352,100 392,100 452,338 352,338" fill="url(#sc-concrete)" stroke="#d5deec" stroke-opacity=".4"/>
    <g clip-path="url(#sc-damclip)">
      <rect x="350" y="98" width="110" height="242" fill="url(#sc-tex)" opacity=".5"/>
      <g stroke="#0b1424" stroke-opacity=".28" fill="none">
        <path d="M360 100V338M372 100V338M384 100L412 338M396 100L430 338"/>
        <path d="M352 128H460M352 156H460M352 184H460M352 212H460M352 240H460M352 268H460M352 296H460M352 324H460" stroke-opacity=".16"/>
      </g>
      <rect x="352" y="100" width="18" height="238" fill="url(#sc-wet)"/>
    </g>
    <!-- crest: road, parapet, control house -->
    <rect x="348" y="94" width="48" height="8" rx="2" fill="#c6d0e0"/>
    <path d="M350 92H394" stroke="#e8f1ff" stroke-opacity=".6"/>
    <rect x="358" y="82" width="18" height="12" rx="1.5" fill="#6f7c92" stroke="#d5deec" stroke-opacity=".4"/>
    <rect x="361" y="85" width="5" height="4" fill="#ffc857" opacity=".85"/><rect x="368" y="85" width="5" height="4" fill="#ffc857" opacity=".5"/>
    ${bays}
    <ellipse id="sc-splash" cx="486" cy="334" rx="36" ry="6" fill="#e9f8ff" opacity="0"/>
    <g id="sc-flow">${jetsSvg}</g>

    <g class="sc-lab" font-family="JetBrains Mono, ui-monospace, Menlo, Consolas, monospace" font-size="11" letter-spacing="2" fill="#8fa3bf">
      <text x="30" y="96">RESERVOIR</text>
      <text x="372" y="70" text-anchor="middle">DAM</text>
      <text class="sc-rl" x="540" y="386">DOWNSTREAM RIVER</text>
      <g id="sc-dir" fill="none" stroke="#3de0ff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M640 392l5-4-5-4"/><path d="M652 392l5-4-5-4"/><path d="M664 392l5-4-5-4"/></g>
      <text class="sc-sec" x="344" y="366" text-anchor="end" font-size="9" fill="#6f8aa8">UPSTREAM</text>
      <text class="sc-sec" x="460" y="366" font-size="9" fill="#6f8aa8">DOWNSTREAM</text>
      <text x="476" y="226" fill="#ffb454">SPILLWAY</text>
      <path d="M429 238 L470 224" stroke="#ffb454" stroke-opacity=".6" fill="none" stroke-width="1"/>
      <text x="720" y="276">SEA</text>
    </g>
    <g id="sc-gauge" font-family="JetBrains Mono, ui-monospace, Menlo, Consolas, monospace" font-size="9" letter-spacing="1" display="none">
      <text class="sc-gt" x="560" y="188" fill="#8fa3bf" letter-spacing="1.5">RELEASE vs CHANNEL CAPACITY</text>
      <rect x="560" y="196" width="220" height="9" rx="4.5" fill="#04101f" stroke="#3de0ff" stroke-opacity=".3"/>
      <rect id="sc-g-in" x="560" y="196" width="0" height="9" rx="4.5" fill="#3de0ff"/>
      <rect id="sc-g-out" x="560" y="196" width="0" height="9" fill="#ff6b6b"/>
      <line id="sc-g-cap" x1="0" x2="0" y1="192" y2="209" stroke="#e8f1ff" stroke-width="1.6"/>
      <text class="sc-gt" id="sc-g-rel" x="560" y="222" fill="#cfefff"></text>
      <text class="sc-gt" id="sc-g-state" x="780" y="222" text-anchor="end" font-weight="700"></text>
      <text class="sc-gt" id="sc-g-capt" x="0" y="234" text-anchor="middle" fill="#e8f1ff"></text>
    </g>
    <g id="sc-hud-svg" font-family="JetBrains Mono, ui-monospace, Menlo, Consolas, monospace" font-size="12" letter-spacing=".5">
      <rect x="522" y="12" width="270" height="${16 + HUD.length * 20}" rx="8" fill="#04101f" fill-opacity=".74" stroke="#3de0ff" stroke-opacity=".3"/>
      ${hudSvg}
    </g>
  </svg>
  <div class="sc-hud">${hudHtml}</div>`;

  const q = s => host.querySelector(s);
  const level = q('#sc-level'), tint = q('#sc-tint'), splash = q('#sc-splash'), streams = [...host.querySelectorAll('.sc-stream')], river = q('#sc-river'), delta = q('#sc-delta');
  const rFade = q('#sc-river-fade'), rDeep = q('#sc-river-deep'), glints = [...host.querySelectorAll('.sc-glint')];
  const gauge = q('#sc-gauge'), gIn = q('#sc-g-in'), gOut = q('#sc-g-out'), gCap = q('#sc-g-cap'), gRel = q('#sc-g-rel'), gState = q('#sc-g-state'), gCapT = q('#sc-g-capt'), over = q('#sc-over');
  const plume = q('#sc-plume'), rp = q('#sc-river'), body = q('#sc-waterbody'), surf = q('#sc-surface'), sheen = q('#sc-sheen'), mark = q('#sc-mark'), markT = q('#sc-mark-t');
  const jets = [...host.querySelectorAll('.jet')], bodies = [...host.querySelectorAll('.jet-body')], cores = [...host.querySelectorAll('.jet-core')];
  const SX = BAYS.map(y => faceX(y) - 4), SY = BAYS.map(y => y + 10), LX = [466, 486, 508], LY = 333;   // bay outlets -> landing points in the river
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const lamps = [...host.querySelectorAll('.bay-lamp')], doors = [...host.querySelectorAll('.bay-door')], glows = [...host.querySelectorAll('.bay-glow')];
  const mix = (a, b, s) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * s)).join(',') + ')';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPAN = Y_BED - Y_FULL;

  /* ----- state: tgt = what app.js asked for, cur = what is drawn (level eases toward it) ----- */
  const tgt = { storage: 55, gate: 0, sed: .5, delta: 0, peak: null, src: null, ssc: null, cap: null, eff: null, over: null }, cur = { storage: 55 };
  let raf = 0, last = 0, phase = 0;
  const isRunning = () => host.classList.contains('running');

  /* ----- suspended-sediment particles (Canvas overlay, clipped to the basin) ----- */
  const cv = document.createElement('canvas'); cv.className = 'sc-particles'; cv.setAttribute('aria-hidden', 'true');
  host.appendChild(cv);
  const ctx = cv.getContext('2d'), basin = new Path2D('M20 120 C40 170 70 240 130 278 C190 306 270 314 352 314 L352 120 Z');
  const parts = [];
  function fit() { const dpr = Math.min(2, devicePixelRatio || 1), w = host.clientWidth; cv.width = Math.round(w * dpr); cv.height = Math.round(w / 2 * dpr);
    host.style.setProperty('--ls', Math.min(2.2, Math.max(1, 690 / (w || 800))).toFixed(2));   // keeps in-scene labels ~9.5px on narrow screens
    kick(); }
  new ResizeObserver(fit).observe(host);

  function drawParticles(run, dt) {
    const want = Math.round(10 + tgt.sed * 80);                 // more sediment -> more particles
    while (parts.length < want) parts.push({ x: 30 + Math.random() * 320, y: Math.random(), v: .5 + Math.random() * .8, p: Math.random() * 6.28 });
    parts.length = want;
    const wy = Y_FULL + (1 - cur.storage / 100) * SPAN, k = cv.width / 800;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    if (wy <= Y_BED - 14) {
      ctx.save(); ctx.clip(basin);
      ctx.fillStyle = 'rgba(214,165,84,.55)';
      for (const p of parts) {
        if (run && !RM) { p.x += p.v * (14 + tgt.gate * 90) * dt; p.p += dt * 2; if (p.x > 346) { p.x = 24; p.y = Math.random(); } }
        const y = wy + 6 + p.y * (Y_BED - wy - 12) + (run ? Math.sin(p.p) * 1.5 : 0);
        ctx.fillRect(p.x, y, 1.8, 1.8);
      }
      ctx.restore();
    }
    drawFoam(run, dt); drawSediment(run, dt);
  }

  /* ----- outlet foam: spray where the jets hit the river; rate scales with peak release ----- */
  const foam = []; let acc = 0;
  function drawFoam(run, dt) {
    if (!run || RM || tgt.gate <= 0) { foam.length = 0; return; }
    acc += tgt.gate * 70 * dt;
    while (acc >= 1 && foam.length < 90) {
      acc--; const i = Math.min(BAYS.length - 1, Math.floor(Math.random() * Math.max(1, Math.ceil(tgt.gate * BAYS.length))));
      foam.push({ x: LX[i] + tgt.gate * 10 + (Math.random() - .5) * 14, y: LY, vx: (Math.random() - .2) * 40, vy: -(15 + Math.random() * 55) * (.5 + tgt.gate), life: .4 + Math.random() * .5, t: 0 });
    }
    for (let n = foam.length - 1; n >= 0; n--) {
      const f = foam[n]; f.t += dt; f.vy += 160 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.t > f.life || f.y > LY + 4) { foam.splice(n, 1); continue; }
      ctx.fillStyle = `rgba(236,249,255,${(.8 * (1 - f.t / f.life)).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, 1.1 + tgt.gate, 0, 6.283); ctx.fill();
    }
  }

  /* ----- downstream sediment: particles ride the river path; density from sediment level and sediment out ----- */
  const N = 80, LEN = rp.getTotalLength(), tbl = [];
  for (let i = 0; i <= N; i++) { const p = rp.getPointAtLength(LEN * i / N); tbl.push([p.x, p.y]); }
  const sp = [], SED = ['#d9a441', '#b57a2e', '#c98f3a'];
  const newSp = () => ({ s: .08 + Math.random() * .2, off: Math.random() * 2 - 1, v: .6 + Math.random() * .8, c: SED[Math.floor(Math.random() * 3)] });
  function drawSediment(run, dt) {
    let want = Math.min(160, Math.round((8 + 55 * tgt.sed) * (.5 + tgt.delta * 1.2)));   // flushing (high sediment out) -> denser
    if (!run) want = Math.round(want * .4);                                           // idle: sparse, frozen
    while (sp.length < want) { const p = newSp(); if (run) p.s = Math.random(); sp.push(p); }
    sp.length = want;
    const half = (24 + tgt.gate * 10) * .38, sz = 1.6 + tgt.delta, speed = (40 + 170 * tgt.gate) / LEN;
    for (const p of sp) {
      if (run && !RM) { p.s += p.v * speed * dt; if (p.s >= 1) Object.assign(p, newSp()); }
      const f = p.s * N, i = Math.min(N - 1, Math.floor(f)), t = f - i, a = tbl[i], b = tbl[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      ctx.fillStyle = p.c; ctx.globalAlpha = .8;
      ctx.fillRect(a[0] + dx * t - dy / l * p.off * half, a[1] + dy * t + dx / l * p.off * half, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  /* ----- discharge ribbons: one per open bay, curved from the bay outlet to the river ----- */
  function drawFlow(run) {
    const p = tgt.gate, a = 1 + p * 4;
    host.style.setProperty('--spd', (1.1 - .7 * p).toFixed(2) + 's');       // faster flow at higher peak release
    let open = 0;
    BAYS.forEach((_, i) => {
      const g = clamp01(p * BAYS.length - i);
      jets[i].style.opacity = g > .02 ? 1 : 0;
      if (g <= .02) return; open++;
      const w = 3 + g * (5 + p * 9), sway = run && !RM ? Math.sin(phase * 3 + i * 1.7) * a * .6 : 0;
      const sx = SX[i], sy = SY[i], lx = LX[i] + p * 10;     // leave the gate level, clear the sloped face, drop into the river; arcs nest (upper gate = outer arc) so none cross
      const d = `M${sx.toFixed(1)} ${sy} C${(sx + 52 + p * 34).toFixed(1)} ${(sy - 3 + sway).toFixed(1)} ${(lx - 3).toFixed(1)} ${(sy + (LY - sy) * .5 + sway * .5).toFixed(1)} ${lx} ${LY}`;
      bodies[i].setAttribute('d', d); cores[i].setAttribute('d', d);
      bodies[i].style.strokeWidth = w; cores[i].style.strokeWidth = Math.max(1.5, w * .4);
    });
    splash.setAttribute('opacity', open ? (.12 + .4 * p).toFixed(2) : 0);
    splash.setAttribute('rx', 22 + p * 30);
  }

  /* ----- HUD: every value is read from simulation state (nothing typed in) ----- */
  const hudEl = {}; host.querySelectorAll('[data-h]').forEach(e => (hudEl[e.dataset.h] = hudEl[e.dataset.h] || []).push(e));
  const hudVal = {};
  function setH(id, v, label) {
    if (hudVal[id] !== v) { hudVal[id] = v; hudEl[id + '-v'].forEach(e => e.textContent = v); }
    if (label) hudEl[id + '-l'].forEach(e => e.textContent = label);
  }
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const sliderPeak = () => { const el = document.getElementById('c-peak'); return el ? +el.value : null; };
  function refreshPeak() {                                          // live slider when idle; the run's own value during a run
    const useRun = tgt.src === 'lijin' || isRunning(), v = useRun ? tgt.peak : (sliderPeak() ?? tgt.peak);
    setH('peak', v == null ? '–' : fmt(v) + ' m³/s', tgt.src === 'lijin' ? 'PEAK FLOW (LIJIN)' : 'PEAK RELEASE');
    return v;
  }
  /* ----- release vs channel capacity: both values come from the app (slider/model); no numbers typed here.
     rel = peak actually delivered once a run's result is known, else the planned peak; "over" is the model's own flag after a run ----- */
  const GX = 560, GW = 220;
  function drawGauge() {
    const pk = refreshPeak(), cap = tgt.cap;
    if (pk == null || cap == null) { gauge.setAttribute('display', 'none'); over.setAttribute('opacity', 0); setH('cap', '–'); return; }
    gauge.removeAttribute('display');
    const known = tgt.eff != null && pk === tgt.peak, rel = known ? tgt.eff : pk, cut = known && rel < pk - 0.5;
    const isOver = known && tgt.over != null ? tgt.over : rel > cap, max = Math.max(5000, cap, rel), X = v => GX + GW * v / max;
    gIn.setAttribute('width', Math.max(0, X(Math.min(rel, cap)) - GX).toFixed(1));
    gOut.setAttribute('x', X(cap).toFixed(1)); gOut.setAttribute('width', isOver ? Math.max(0, X(rel) - X(cap)).toFixed(1) : 0);
    gCap.setAttribute('x1', X(cap).toFixed(1)); gCap.setAttribute('x2', X(cap).toFixed(1));
    const cx = Math.min(GX + GW - 52, Math.max(GX + 52, X(cap)));
    gCapT.setAttribute('x', cx.toFixed(1)); gCapT.textContent = (tgt.src === 'lijin' ? 'BANKFULL ' : 'CAPACITY ') + fmt(cap);
    gRel.textContent = (cut ? 'DELIVERED ' : tgt.src === 'lijin' ? 'PEAK FLOW ' : 'RELEASE ') + fmt(rel) + ' m³/s';
    gState.textContent = isOver ? 'ABOVE CAPACITY' : 'WITHIN CAPACITY'; gState.setAttribute('fill', isOver ? '#ff8f8f' : '#9ff3ff');
    over.setAttribute('opacity', isOver ? .6 : 0);
    setH('cap', fmt(cap) + ' m³/s', tgt.src === 'lijin' ? 'BANKFULL CAPACITY' : 'CHANNEL CAPACITY');
    tgt.isOver = isOver;
  }
  document.addEventListener('input', e => {
    if (e.target.id === 'c-peak') drawGauge();
    if (e.target.id === 'c-capacity') { tgt.cap = +e.target.value; tgt.eff = null; tgt.over = null; drawGauge(); }   // sandbox: capacity slider moved
  });

  /* ----- water body + wave surface + level marker ----- */
  function drawWater() {
    const ty = (1 - cur.storage / 100) * SPAN, A = 1 + tgt.gate * 3;
    level.setAttribute('transform', `translate(0 ${ty.toFixed(2)})`);
    let top = '';
    for (let x = 0; x <= 360; x += 12) {
      const y = Y_FULL + A * Math.sin(x * .05 + phase) + .6 * A * Math.sin(x * .13 - phase * 1.7);
      top += (x ? 'L' : 'M') + x + ' ' + y.toFixed(2);
    }
    body.setAttribute('d', top + 'L360 330L0 330Z'); surf.setAttribute('d', top); sheen.setAttribute('d', top);
    mark.setAttribute('transform', `translate(0 ${(Y_FULL + ty).toFixed(2)})`);
    const lv = tgt.src === 'lijin' ? 'ILLUSTRATIVE' : Math.round(cur.storage) + '% STORAGE';   // Replay has no real reservoir level
    if (markT.textContent !== lv) markT.textContent = lv;
    setH('lvl', lv);
  }

  function frame(t) {
    raf = 0;
    const dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
    const run = isRunning(), d = tgt.storage - cur.storage;
    cur.storage = RM || Math.abs(d) < .05 ? tgt.storage : cur.storage + d * Math.min(1, dt * 1.2);
    if (run && !RM) phase += dt * (1.2 + tgt.gate * 2.5);        // waves move only while a run is active
    drawWater(); drawFlow(run); drawParticles(run, dt);
    if (run || Math.abs(tgt.storage - cur.storage) > .05) kick();
  }
  function kick() { if (!raf && !document.hidden && onscreen) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  new MutationObserver(() => { kick(); drawGauge(); }).observe(host, { attributes: true, attributeFilter: ['class'] });
  let onscreen = true;                                              // no animation work while the diagram is scrolled out of view
  new IntersectionObserver(es => { onscreen = es[0].isIntersecting; kick(); }).observe(host);
  document.addEventListener('visibilitychange', kick);

  function update(o) {
    Object.assign(tgt, { storage: o.storage, gate: Math.min(1, o.gate), sed: o.sed, delta: o.delta, peak: o.peak ?? null, src: o.src || null, ssc: o.ssc ?? null,
      cap: o.cap ?? null, eff: o.eff ?? null, over: o.over ?? null });
    o = tgt;
    tint.setAttribute('opacity', (o.sed * 0.28).toFixed(2));
    BAYS.forEach((_, i) => {
      const g = Math.min(1, Math.max(0, o.gate * BAYS.length - i));      // lowest bay opens first
      doors[i].style.transform = `scaleY(${1 - g})`; glows[i].style.opacity = g;
      lamps[i].classList.toggle('open', g > 0.02);   // gate status lamp: amber = open
    });
    const col = mix([58, 140, 200], [150, 105, 55], o.sed);
    const cc = mix([160, 235, 255], [230, 200, 140], o.sed * .6);
    bodies.forEach(b => b.style.stroke = col); cores.forEach(c => c.style.stroke = cc);
    const rw = 24 + o.gate * 10;
    river.style.strokeWidth = rw; rFade.style.strokeWidth = rw; rDeep.style.strokeWidth = (rw * .45).toFixed(1);
    glints.forEach(t => t.style.opacity = (.22 + .45 * o.gate).toFixed(2));
    streams.forEach(t => t.style.opacity = (.25 + .6 * o.gate).toFixed(2));
    river.style.stroke = mix([93, 127, 156], [150, 115, 70], o.sed * 0.8);
    const nOpen = BAYS.filter((_, i) => clamp01(o.gate * BAYS.length - i) > .02).length;
    const inten = o.gate <= .001 ? 'IDLE' : o.gate < .34 ? 'LOW' : o.gate < .67 ? 'MEDIUM' : 'HIGH';
    const sedTxt = o.ssc != null ? o.ssc + ' kg/m³ MAX' : o.sed < .35 ? 'LOW' : o.sed < .7 ? 'MEDIUM' : 'HIGH';
    const open = BAYS.map((_, i) => Math.round(clamp01(o.gate * BAYS.length - i) * 100));
    setH('open', open.join('/') + ' %');
    drawGauge(); const pk = refreshPeak();
    setH('int', inten); setH('sed', sedTxt, o.ssc != null ? 'SEDIMENT CONC.' : 'SEDIMENT LOAD');
    setH('gate', nOpen ? nOpen + ' / ' + BAYS.length + ' OPEN' : 'CLOSED');
    host.querySelector('svg').setAttribute('aria-label', `Dam schematic. Reservoir ${hudVal.lvl}. ${pk == null ? '' : 'Peak ' + fmt(pk) + ' cubic metres per second. '}Flow ${inten.toLowerCase()}. Gates ${hudVal.gate.toLowerCase()}. ${tgt.cap == null ? '' : 'Channel capacity ' + fmt(tgt.cap) + ' cubic metres per second, ' + (tgt.isOver ? 'release above capacity.' : 'release within capacity.')}`);
    delta.setAttribute('rx', 20 + o.delta * 45);
    plume.setAttribute('rx', 30 + o.delta * 60); plume.setAttribute('opacity', (o.delta * .75).toFixed(2));
    kick();
  }
  fit(); drawWater(); drawFlow(false); drawGauge();
  return { update, host };
})();
