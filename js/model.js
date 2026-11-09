/* model.js - SIMULATION MODEL (PLACEHOLDER, v2).
   The body of runScenario() can be replaced by a calibrated model; keep the signature the same.
   All constants below are sample values, not real Yellow River data. No DOM code here.

   inputs: { peak (m3/s), days, reserve (%), availability ('dry'|'normal'|'wet'),
             sediment ('low'|'medium'|'high'), demand ('low'|'medium'|'high'),
             storage (% of reservoir), capacity (m3/s), inflowPeak (m3/s, optional),
             sedStock (sediment units already in the reservoir, optional, default 30),
             penaltyScale (optional, 1 = normal) }
   returns: { sedIn, sedOut, sedStored, sedStock, bedChange (m3/s capacity change), capacity, storage,
              releaseVol (delivered), plannedVol, deltaFlow, overdraw (planned minus delivered, % of reservoir),
              overBankfull, meters:{flood,reservoir,supply,ecology} } */

const clamp = (x, a = 0, b = 100) => Math.min(b, Math.max(a, x));
const MODEL_CONST = {
  volFactor: 0.000683,       // % of reservoir per (m3/s x day): 86,400 s / 12.65e9 m3 x 100
  defaultSedStock: 30        // sediment units sitting in the reservoir at the start
};

function runScenario(i) {
  const scale = i.penaltyScale ?? 1;
  // sample lookup tables (units: % of reservoir volume, or arbitrary sediment units)
  const inflow = { dry: 20, normal: 40, wet: 65 }[i.availability];
  const sedIn = { low: 10, medium: 20, high: 35 }[i.sediment];
  const demandUnits = { low: 20, medium: 30, high: 45 }[i.demand];
  const stock0 = i.sedStock ?? MODEL_CONST.defaultSedStock;

  // --- Water balance: the supply reserve is a hard limit on the release ---
  const available = Math.min(100, i.storage + inflow);           // anything above 100% spills
  const usable = available * (1 - i.reserve / 100);              // water the release may use
  const plannedVol = i.peak * i.days * MODEL_CONST.volFactor;    // what the player asked for
  const releaseVol = Math.min(plannedVol, usable);               // what can actually be delivered
  const frac = plannedVol > 0 ? releaseVol / plannedVol : 1;     // 1 = release fully delivered
  const overdraw = plannedVol - releaseVol;                      // shortfall, 0 if fully delivered
  const peakEff = i.peak * frac;                                 // peak actually reached
  const afterRelease = available - releaseVol;
  const supplied = Math.min(demandUnits, afterRelease);          // users are served from what is left
  let storage = clamp(afterRelease - supplied);

  // --- Sediment balance with a carried stock (limits how much can be flushed) ---
  const eff = clamp(peakEff / 4000 * Math.min(1, i.days / 10), 0, 1.2);     // "flushing efficiency"
  const passThrough = sedIn * (0.2 + 0.7 * eff);                 // incoming sediment carried through
  const scoured = Math.min(stock0, 12 * eff);                    // old deposit flushed, never more than the stock
  const sedOut = passThrough + scoured;
  const sedStored = sedIn - sedOut;                              // negative = net flushing
  const sedStock = clamp(stock0 + sedStored);
  storage = clamp(storage - Math.max(0, sedStored) * 0.3);       // new deposits take up storage

  // --- Riverbed and capacity: gains shrink as the bed coarsens and capacity rises ---
  const headroom = clamp((5000 - i.capacity) / 3200, 0.05, 1);   // 1 at 1,800 m3/s, ~0.16 at 4,500
  const gain = 220 * clamp(eff, 0, 1) * headroom;                // best case about +150 to +220 m3/s per round
  const loss = 4 * Math.max(0, sedStored);                       // deposition when the flush is weak
  const dCap = gain - loss;
  const capacity = clamp(i.capacity + dCap, 1000, 6000);

  // --- Meter scores, each kept in 0..100 ---
  const overshoot = Math.max(0, peakEff - i.capacity) / i.capacity;
  const floodRisk = i.inflowPeak ? clamp((i.inflowPeak * 0.6 - peakEff) / i.inflowPeak * 100, 0, 40) * scale : 0;
  const flood = clamp(100 - 200 * scale * overshoot - floodRisk - Math.max(0, storage - 90) * 3);
  const reservoir = 0.4 * clamp(80 - sedStored * 3) + 0.3 * clamp(100 - Math.abs(storage - 50) * 2)
                  + 0.3 * clamp(100 - sedStock * 1.2);
  const met = supplied / demandUnits;                            // share of demand served this year
  const buffer = Math.min(1, storage / (1.5 * demandUnits));     // water left for the next year
  const secure = Math.min(1, available * i.reserve / 100 / demandUnits);  // reserve commitment vs demand (saturates)
  const supply = clamp(100 * (0.5 * met + 0.2 * buffer + 0.3 * secure) - overdraw * 0.5 * scale);
  // flow reaching the delta: depends on peak, on how long the high flow lasts, and on base flow (water year)
  const baseFlow = { dry: 60, normal: 120, wet: 200 }[i.availability];
  const deltaFlow = 0.3 * peakEff * (0.5 + 0.5 * Math.min(1, i.days / 12)) + baseFlow;
  const ecology = clamp(20 + 35 * (1 - Math.exp(-i.days / 8)) + sedOut * 0.8 + Math.min(12, deltaFlow / 80)
                  - Math.max(0, peakEff - 4500) * 0.01);

  const r1 = x => Math.round(x * 10) / 10;
  return { sedIn, sedOut: r1(sedOut), sedStored: r1(sedStored), sedStock: r1(sedStock), bedChange: Math.round(dCap),
    capacity: Math.round(capacity), storage: r1(storage), releaseVol: r1(releaseVol), plannedVol: r1(plannedVol),
    deltaFlow: Math.round(deltaFlow), overdraw: r1(overdraw), overBankfull: overshoot > 0,
    meters: { flood: r1(flood), reservoir: r1(reservoir), supply: r1(supply), ecology: r1(ecology) } };
}
