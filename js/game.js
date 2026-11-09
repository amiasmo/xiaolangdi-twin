/* game.js - Challenge mode rules. No DOM code: app.js calls these methods and draws the result. */

const GAME_CONFIG = {
  weights: { flood: 0.30, reservoir: 0.25, supply: 0.25, ecology: 0.20 },  // scoring weights (tune here)
  outcome: { failBelow: 40, passAbove: 60, failScore: 50 },                // a meter under failBelow (or total score under failScore) = FAILED round
  policyPenalty: 20,                                                       // meter points lost per broken rule
  startStorage: 55, startCapacity: 2800, startSedStock: 30,                // sample starting state
  difficulty: { easy: { penaltyScale: 0.5, hints: true }, normal: { penaltyScale: 1, hints: false } }
};

const Game = {
  rounds: [], diff: 'easy', i: 0, storage: 0, capacity: 0, sedStock: 0, history: [],

  start(rounds, diff) {
    this.rounds = rounds; this.diff = diff; this.i = 0; this.history = [];
    this.storage = GAME_CONFIG.startStorage; this.capacity = GAME_CONFIG.startCapacity;
    this.sedStock = GAME_CONFIG.startSedStock;
    this.beginRound();
  },
  round() { return this.rounds[this.i]; },
  isLast() { return this.i === this.rounds.length - 1; },
  beginRound() {
    const r = this.round();
    if (r.set_storage != null) this.storage = r.set_storage;
    if (r.set_sed_stock != null) this.sedStock = r.set_sed_stock;   // optional scenario override
  },
  next() { this.i++; this.beginRound(); },

  // Policy cards stay active once they have appeared
  activePolicies() {
    return this.rounds.slice(0, this.i + 1).filter(r => r.policy_card).map(r => r.policy_card);
  },

  // Run one round: model call + policy rules + scoring + carry-over state
  play(p) {
    const r = this.round(), d = GAME_CONFIG.difficulty[this.diff];
    const inputs = { peak: p.peak, days: p.days, reserve: p.reserve,
      availability: r.water_availability, sediment: r.sediment_level, demand: r.demand_level,
      storage: this.storage, capacity: this.capacity, sedStock: this.sedStock, inflowPeak: r.inflow_peak || 0,
      penaltyScale: d.penaltyScale };
    const result = runScenario(inputs);          // all physics lives in model.js
    const meters = { ...result.meters };
    const violations = [];
    for (const pol of this.activePolicies()) {
      const e = pol.effect, pen = GAME_CONFIG.policyPenalty * d.penaltyScale;
      if (e.type === 'min_delta_flow' && result.deltaFlow < e.value) {
        meters.ecology = Math.max(0, meters.ecology - pen);
        violations.push(`${pol.title}: delta flow ${result.deltaFlow} m³/s is below the required ${e.value} m³/s.`);
      }
      if (e.type === 'min_reserve' && p.reserve < e.value) {
        meters.supply = Math.max(0, meters.supply - pen);
        violations.push(`${pol.title}: reserved water ${p.reserve}% is below the required ${e.value}%.`);
      }
    }
    const w = GAME_CONFIG.weights;
    const score = Object.keys(w).reduce((s, k) => s + w[k] * meters[k], 0);
    this.storage = result.storage; this.capacity = result.capacity; this.sedStock = result.sedStock;    // carry over
    // Outcome of the round: fail / mixed / pass (the lesson is shown after every outcome)
    const O = GAME_CONFIG.outcome, names = { flood: 'flood safety', reservoir: 'reservoir health', supply: 'water supply', ecology: 'ecology' };
    const weak = Object.keys(meters).filter(k => meters[k] < O.failBelow).map(k => names[k]);
    const status = (weak.length || score < O.failScore) ? 'fail'
      : (violations.length || Object.values(meters).some(v => v < O.passAbove)) ? 'mixed' : 'pass';
    this.history.push({ round: this.i + 1, peak: p.peak, meters, score, status, capacity: result.capacity,
      inp: inputs, result, violations, weak });   // kept so a past round can be replayed and explained later
    return { result, meters, violations, score, inputs, status, weak };
  },

  // Final summary for the debrief screen
  debrief() {
    const n = this.history.length, keys = Object.keys(GAME_CONFIG.weights);
    const avg = {}; keys.forEach(k => avg[k] = this.history.reduce((s, h) => s + h.meters[k], 0) / n);
    const score = this.history.reduce((s, h) => s + h.score, 0) / n;
    const vals = Object.values(avg), spread = Math.max(...vals) - Math.min(...vals);
    const top = keys.reduce((a, b) => avg[a] >= avg[b] ? a : b);
    const STYLES = { flood: 'Flood-first', supply: 'Water-saver', reservoir: 'Sediment-first', ecology: 'Ecology-first' };
    const style = spread < 12 ? 'Balanced' : STYLES[top];
    const count = s => this.history.filter(h => h.status === s).length;
    return { score, avg, style, passed: count('pass'), mixed: count('mixed'), failed: count('fail') };
  }
};