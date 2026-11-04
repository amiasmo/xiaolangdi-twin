/* intro.js - landing screen -> video 1 (skippable) -> video 2 -> single white flash -> site.
   `step` guards every transition so each one happens only once. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const intro = $('intro'), site = $('site'), flash = $('flash');
  const landing = $('landing'), stage = $('stage'), subs = $('subs');
  const v1 = $('video1'), v2 = $('video2');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AI_CREDIT = 'AI-generated video (Seedance 2.5 ai)';   // check the exact model/version name before submitting
  let step = 0;          // 0 landing, 1 video1, 2 video2, 3 finishing
  let ccOn = true, muted = false;
  const VOLUME = 0.35;   // 0..1, narration/music level for both videos (lower = quieter). Note: iOS Safari ignores .volume.
  v1.volume = v2.volume = VOLUME;

  function showSite() { site.hidden = false; document.body.classList.remove('intro-active'); }

  // Step E: pause and release both videos, remove intro elements from the DOM
  function cleanup() {
    [v1, v2].forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
    intro.remove(); flash.remove();
    const t = $('main-title'); if (t) t.focus();
  }

  // Dev shortcut: index.html?skipintro=1
  if (new URLSearchParams(location.search).get('skipintro') === '1') { showSite(); cleanup(); return; }

  /* ----- Subtitles -----
     The <track> files are still loaded by the browser, but we hide the browser's own
     rendering (mode = 'hidden') and draw the text ourselves in #subs so the size is controllable. */
  function showCues(e) {
    subs.textContent = '';
    for (const cue of (e.target.activeCues || [])) {
      const line = document.createElement('div');
      line.textContent = cue.text;               // textContent = safe, no HTML
      subs.appendChild(line);
    }
  }
  [v1, v2].forEach(v => {
    for (const t of v.textTracks) { t.mode = 'hidden'; t.addEventListener('cuechange', showCues); }
  });
  function applyCaptions() { subs.hidden = !ccOn; }

  // play() returns a promise that can reject -> fall back
  function safePlay(v, onFail) { const p = v.play(); if (p && p.catch) p.catch(onFail); }

  // Step B: PLAY clicked
  $('playBtn').addEventListener('click', () => {
    step = 1;
    landing.hidden = true; stage.hidden = false; v1.hidden = false;
    v2.preload = 'auto';                         // start preloading video 2 while video 1 plays
    applyCaptions();
    $('aiNote').textContent = AI_CREDIT + ' · Illustrative history of the Yellow River';
    safePlay(v1, startV2);
  });

  // Step C: video 1 ended / skipped / failed -> video 2 immediately
  function startV2() {
    if (step !== 1) return;
    step = 2;
    v1.pause(); v1.hidden = true; $('skipBtn').hidden = true;   // video 2 has no skip
    subs.textContent = '';
    v2.hidden = false; v2.muted = muted; applyCaptions();
    $('aiNote').textContent = AI_CREDIT + ' · Illustrative introduction to the project';
    safePlay(v2, plainFinish);
    // safety net: if video 2 has not started playing after 10 s, go to the site
    setTimeout(() => { if (step === 2 && v2.currentTime === 0) plainFinish(); }, 10000);
  }
  v1.addEventListener('ended', startV2);
  v1.addEventListener('error', startV2);
  $('skipBtn').addEventListener('click', startV2);

  // Step D: flash ~0.25 s before video 2 ends (it ends abruptly)
  v2.addEventListener('timeupdate', () => {
    if (step === 2 && v2.duration && v2.duration - v2.currentTime <= 0.25) flashToSite();
  });
  v2.addEventListener('ended', flashToSite);     // fallback if timeupdate was missed
  v2.addEventListener('error', () => { console.warn('Video 2 error:', v2.error); plainFinish(); });

  function flashToSite() {
    if (step !== 2) return;
    step = 3;
    if (reduceMotion) {                           // plain 300 ms cross-fade, no bright flash
      showSite(); intro.style.transition = 'opacity 300ms'; intro.style.opacity = 0;
      setTimeout(cleanup, 300); return;
    }
    flash.style.transition = 'opacity 150ms linear'; flash.style.opacity = 1;     // fade in 150 ms
    setTimeout(() => {
      v2.pause(); stage.hidden = true; intro.style.background = 'transparent'; showSite();  // swap under the white
      setTimeout(() => {                                                          // hold 100 ms
        flash.style.transition = 'opacity 600ms ease-out'; flash.style.opacity = 0;   // fade out 600 ms
        setTimeout(cleanup, 650);
      }, 100);
    }, 150);
  }
  function plainFinish() { if (step === 3) return; step = 3; showSite(); cleanup(); }  // never get stuck

  // Controls
  $('ccBtn').addEventListener('click', e => {
    ccOn = !ccOn; e.currentTarget.setAttribute('aria-pressed', ccOn); applyCaptions();
  });
  $('muteBtn').addEventListener('click', e => {
    muted = !muted; v1.muted = v2.muted = muted; e.currentTarget.setAttribute('aria-pressed', muted);
  });
})();