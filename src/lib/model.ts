// Hybrid Input-Output / Social Cost-Benefit Analysis model for NZ biobinders.
// The "CGE-mimic" layer adds price-responsive (Armington) substitution,
// labour-market crowding-out, shadow pricing and fiscal deadweight cost on
// top of a Leontief IO impact core, approximating general-equilibrium results.

export type Sector = "forestry" | "manufacturing" | "construction" | "transport" | "fuelWholesale";

export interface SectorMult {
  label: string;
  outputI: number; // Type I output multiplier
  outputII: number; // Type II output multiplier
  vaRatio: number; // value added / output (direct)
  vaMultII: number; // Type II value-added multiplier
  empPerM: number; // direct FTE per NZ$m output
  empMultII: number; // Type II employment multiplier
  incomeRatio: number; // compensation of employees / output
}

export interface Inputs {
  startYear: number;
  horizon: number;
  constructionYears: number;
  // Market
  bitumenDemand: number; // t/yr
  demandGrowth: number; // %/yr
  bitumenPrice: number; // NZ$/t CIF delivered
  bitumenPriceGrowth: number; // real %/yr
  bitumenImportShare: number; // 0-1
  maxBlendShare: number; // technical cap on substitution share of binder market
  adoptionMidpoint: number; // years after production start to reach 50% of cap
  adoptionSteepness: number;
  armingtonSigma: number; // substitution elasticity
  // Plant
  plantCapacity: number; // t biobinder/yr
  capex: number; // NZ$m
  capexDomesticShare: number;
  opexPerT: number; // NZ$/t non-feedstock
  feedstockRatio: number; // t residue per t biobinder
  feedstockPrice: number; // NZ$/t delivered
  feedstockOppCost: number; // 0-1 share of price that is true opportunity cost
  energyPerT: number; // NZ$/t
  laborSharePerT: number; // share of opex that is labour
  biobinderPriceDiscount: number; // % below bitumen parity
  plantLife: number;
  salvageShare: number;
  rdTrialCost: number; // NZ$m one-off (NZTA trials, specification)
  // Performance
  pavementLifeRatio: number; // >1 = longer life
  maintenanceCostPerT: number; // NZ$ lifecycle maintenance tied to 1 t binder
  // Environment
  bitumenEF: number; // tCO2e/t cradle-to-site
  biobinderEF: number; // tCO2e/t (may be negative w/ biogenic storage)
  includeBiogenic: boolean;
  biogenicStorage: number; // tCO2e/t stored
  carbonPrice: number; // NZ$/tCO2e shadow price at start
  carbonPriceGrowth: number; // real %/yr
  airQualityPerT: number; // NZ$/t co-benefit (fumes / PAH reduction)
  // Economy / CGE-mimic
  discountRate: number; // real %
  mcpf: number; // marginal cost of public funds
  subsidyShare: number; // govt share of capex
  unemployment: number; // %
  nairu: number; // %
  baseCrowdOut: number; // share of IO gross impacts displaced at NAIRU
  shadowFxPremium: number; // % premium on foreign exchange savings
  useTypeII: boolean;
  mults: Record<Sector, SectorMult>;
}

// Multipliers approximated from Stats NZ national input-output tables
// (2020, industry-by-industry, 106 industries aggregated) and published
// regional-economics studies (e.g. MPI/Scion forestry IO, BERL, NZIER).
export const DEFAULT_MULTS: Record<Sector, SectorMult> = {
  forestry: { label: "Forestry & logging", outputI: 1.82, outputII: 2.55, vaRatio: 0.46, vaMultII: 2.1, empPerM: 3.9, empMultII: 2.4, incomeRatio: 0.21 },
  manufacturing: { label: "Wood, pulp & chemical mfg", outputI: 1.95, outputII: 2.72, vaRatio: 0.31, vaMultII: 2.6, empPerM: 3.1, empMultII: 2.9, incomeRatio: 0.19 },
  construction: { label: "Heavy & civil construction", outputI: 2.02, outputII: 2.9, vaRatio: 0.34, vaMultII: 2.5, empPerM: 5.4, empMultII: 2.1, incomeRatio: 0.26 },
  transport: { label: "Road freight transport", outputI: 1.78, outputII: 2.48, vaRatio: 0.41, vaMultII: 2.0, empPerM: 5.9, empMultII: 1.9, incomeRatio: 0.28 },
  fuelWholesale: { label: "Fuel import & wholesale", outputI: 1.32, outputII: 1.62, vaRatio: 0.14, vaMultII: 2.3, empPerM: 1.1, empMultII: 3.0, incomeRatio: 0.06 },
};

export const DEFAULT_INPUTS: Inputs = {
  startYear: 2027,
  horizon: 30,
  constructionYears: 2,
  bitumenDemand: 165000,
  demandGrowth: 1.0,
  bitumenPrice: 1350,
  bitumenPriceGrowth: 0.5,
  bitumenImportShare: 1.0,
  maxBlendShare: 0.2,
  adoptionMidpoint: 6,
  adoptionSteepness: 0.8,
  armingtonSigma: 2.0,
  plantCapacity: 30000,
  capex: 145,
  capexDomesticShare: 0.55,
  opexPerT: 380,
  feedstockRatio: 2.4,
  feedstockPrice: 85,
  feedstockOppCost: 0.6,
  energyPerT: 160,
  laborSharePerT: 0.45,
  biobinderPriceDiscount: 0,
  plantLife: 25,
  salvageShare: 0.1,
  rdTrialCost: 6,
  pavementLifeRatio: 1.0,
  maintenanceCostPerT: 900,
  bitumenEF: 0.48,
  biobinderEF: 0.35,
  includeBiogenic: true,
  biogenicStorage: 1.1,
  carbonPrice: 150,
  carbonPriceGrowth: 2.5,
  airQualityPerT: 25,
  discountRate: 5,
  mcpf: 1.2,
  subsidyShare: 0.3,
  unemployment: 5.0,
  nairu: 4.5,
  baseCrowdOut: 0.5,
  shadowFxPremium: 0,
  useTypeII: true,
  mults: DEFAULT_MULTS,
};

export const SCENARIOS: Record<string, Partial<Inputs>> = {
  Conservative: { maxBlendShare: 0.1, plantCapacity: 15000, capex: 95, opexPerT: 450, carbonPrice: 80, carbonPriceGrowth: 1.5, adoptionMidpoint: 9, pavementLifeRatio: 0.95, biogenicStorage: 0.7, baseCrowdOut: 0.65 },
  Central: {},
  Ambitious: { maxBlendShare: 0.35, plantCapacity: 55000, capex: 230, opexPerT: 330, carbonPrice: 200, carbonPriceGrowth: 3, adoptionMidpoint: 4, pavementLifeRatio: 1.05, biogenicStorage: 1.4, baseCrowdOut: 0.4 },
};

// Approximate plantation forest area shares by region (NZ National Exotic
// Forest Description), used to regionalise forestry & manufacturing impacts.
export const REGION_SHARES: Record<string, number> = {
  "Waikato / Central NI": 0.25,
  "Bay of Plenty": 0.11,
  Northland: 0.1,
  "Gisborne / Tairāwhiti": 0.08,
  "Hawke's Bay": 0.07,
  "Manawatū-Whanganui": 0.07,
  "Nelson / Marlborough / Tasman": 0.1,
  Canterbury: 0.06,
  "Otago / Southland": 0.12,
  "West Coast / Other": 0.04,
};

export interface YearRow {
  year: number;
  t: number;
  demand: number;
  share: number;
  biobinderT: number;
  bitumenPrice: number;
  biobinderCost: number; // resource cost per t
  carbonPrice: number;
  // Costs (NZ$m)
  capex: number;
  opex: number;
  feedstock: number;
  energy: number;
  rd: number;
  deadweight: number;
  // Benefits (NZ$m)
  avoidedImports: number;
  fxPremium: number;
  carbonBenefit: number;
  airQuality: number;
  maintenance: number;
  shadowWage: number;
  salvage: number;
  totalCost: number;
  totalBenefit: number;
  net: number;
  discNet: number;
  cumDiscNet: number;
  emissionsAvoided: number; // tCO2e
  // Economic impacts (net, CGE-adjusted)
  gdp: number;
  employment: number;
  income: number;
  grossOutput: number;
}

export interface Results {
  rows: YearRow[];
  npv: number;
  pvBenefits: number;
  pvCosts: number;
  bcr: number;
  irr: number | null;
  payback: number | null;
  totalEmissions: number;
  costPerTonne: number; // NZ$ net cost per tCO2e abated (excluding carbon benefit)
  crowdOut: number;
  impactsBySector: { sector: string; grossOutput: number; gdp: number; jobs: number; income: number }[];
  ioGross: { output: number; gdp: number; jobs: number; income: number };
  ioNet: { output: number; gdp: number; jobs: number; income: number };
  peakJobs: number;
  benefitBreakdown: { name: string; value: number }[];
  costBreakdown: { name: string; value: number }[];
  importSavingsTotal: number;
  biobinderTotal: number;
  avgResourceCost: number;
}

const logistic = (x: number, mid: number, k: number) => 1 / (1 + Math.exp(-k * (x - mid)));

export function irrCalc(flows: number[]): number | null {
  const npvAt = (r: number) => flows.reduce((a, f, i) => a + f / Math.pow(1 + r, i), 0);
  let lo = -0.99, hi = 1.5;
  const flo = npvAt(lo), fhi = npvAt(hi);
  if (flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = npvAt(mid);
    if (Math.abs(fm) < 1e-7) return mid;
    if (npvAt(lo) * fm < 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export function runModel(p: Inputs): Results {
  const r = p.discountRate / 100;
  const rows: YearRow[] = [];
  const opYears = p.horizon - p.constructionYears;
  // CGE-mimic: displacement rises when the labour market is tight.
  const tightness = p.nairu / Math.max(p.unemployment, 0.5);
  const crowdOut = Math.min(0.95, Math.max(0, p.baseCrowdOut * Math.pow(tightness, 0.75)));
  const m = p.mults;
  const om = (s: Sector) => (p.useTypeII ? m[s].outputII : m[s].outputI);
  const vam = (s: Sector) => (p.useTypeII ? m[s].vaMultII : (m[s].vaMultII + 1) / 2);
  const em = (s: Sector) => (p.useTypeII ? m[s].empMultII : (m[s].empMultII + 1) / 2);

  const sectorAgg: Record<Sector, { out: number; gdp: number; jobs: number; inc: number }> = {
    forestry: { out: 0, gdp: 0, jobs: 0, inc: 0 },
    manufacturing: { out: 0, gdp: 0, jobs: 0, inc: 0 },
    construction: { out: 0, gdp: 0, jobs: 0, inc: 0 },
    transport: { out: 0, gdp: 0, jobs: 0, inc: 0 },
    fuelWholesale: { out: 0, gdp: 0, jobs: 0, inc: 0 },
  };
  const impact = (s: Sector, finalDemandM: number) => {
    const out = finalDemandM * om(s);
    const gdp = finalDemandM * m[s].vaRatio * vam(s);
    const jobs = finalDemandM * m[s].empPerM * em(s);
    const inc = finalDemandM * m[s].incomeRatio * vam(s);
    return { out, gdp, jobs, inc };
  };

  let cum = 0;
  const shadowWageFactor = Math.min(1, Math.max(0.5, 1 - (p.unemployment - p.nairu) * 0.08));

  for (let t = 0; t <= p.horizon; t++) {
    const year = p.startYear + t;
    const opT = t - p.constructionYears; // operating year index
    const demand = p.bitumenDemand * Math.pow(1 + p.demandGrowth / 100, t);
    const bitPrice = p.bitumenPrice * Math.pow(1 + p.bitumenPriceGrowth / 100, t);
    const cPrice = p.carbonPrice * Math.pow(1 + p.carbonPriceGrowth / 100, t);
    const resourceCost = p.opexPerT + p.feedstockRatio * p.feedstockPrice + p.energyPerT;
    const bioPrice = bitPrice * (1 - p.biobinderPriceDiscount / 100);

    let share = 0, bioT = 0;
    if (opT >= 0 && opT < Math.min(opYears, p.plantLife) + 1) {
      // Armington-style relative price response on the adoption ceiling
      const relP = Math.pow(bitPrice / Math.max(bioPrice, 1), p.armingtonSigma);
      const cap = Math.min(0.95, p.maxBlendShare * Math.min(1.5, relP));
      share = cap * logistic(opT, p.adoptionMidpoint, p.adoptionSteepness);
      bioT = Math.min(share * demand, p.plantCapacity);
      share = bioT / demand;
    }

    const capexY = t < p.constructionYears ? p.capex / p.constructionYears : 0;
    const rd = t === 0 ? p.rdTrialCost : 0;
    const subsidy = capexY * p.subsidyShare;
    const deadweight = subsidy * (p.mcpf - 1);
    const opex = (bioT * p.opexPerT) / 1e6;
    const feedstockFin = (bioT * p.feedstockRatio * p.feedstockPrice) / 1e6;
    const feedstock = feedstockFin * p.feedstockOppCost;
    const energy = (bioT * p.energyPerT) / 1e6;

    const avoidedImports = (bioT * bitPrice) / 1e6;
    const fxPremium = avoidedImports * p.bitumenImportShare * (p.shadowFxPremium / 100);
    const bioEF = p.biobinderEF - (p.includeBiogenic ? p.biogenicStorage : 0);
    const emAvoided = bioT * (p.bitumenEF - bioEF);
    const carbonBenefit = (emAvoided * cPrice) / 1e6;
    const airQuality = (bioT * p.airQualityPerT) / 1e6;
    const maintenance = (bioT * p.maintenanceCostPerT * (1 - 1 / p.pavementLifeRatio)) / 1e6;
    const laborCost = opex * p.laborSharePerT + capexY * p.capexDomesticShare * 0.35;
    const shadowWage = laborCost * (1 - shadowWageFactor);
    const salvage = t === p.horizon ? p.capex * p.salvageShare : 0;

    const totalCost = capexY + opex + feedstock + energy + rd + deadweight;
    const totalBenefit = avoidedImports + fxPremium + carbonBenefit + airQuality + maintenance + shadowWage + salvage;
    const net = totalBenefit - totalCost;
    const disc = net / Math.pow(1 + r, t);
    cum += disc;

    // IO impacts (final demand shocks in NZ$m)
    const shocks: [Sector, number][] = [
      ["construction", capexY * p.capexDomesticShare],
      ["forestry", feedstockFin],
      ["manufacturing", opex + energy * 0.5],
      ["transport", (bioT * p.feedstockRatio * 25) / 1e6],
      ["fuelWholesale", -avoidedImports * (1 - p.bitumenImportShare + 0.12)],
    ];
    let yOut = 0, yGdp = 0, yJobs = 0, yInc = 0;
    for (const [s, fd] of shocks) {
      const im = impact(s, fd);
      sectorAgg[s].out += im.out;
      sectorAgg[s].gdp += im.gdp;
      sectorAgg[s].jobs += im.jobs;
      sectorAgg[s].inc += im.inc;
      yOut += im.out;
      yGdp += im.gdp;
      yJobs += im.jobs;
      yInc += im.inc;
    }
    const k = 1 - crowdOut;

    rows.push({
      year, t, demand, share, biobinderT: bioT, bitumenPrice: bitPrice, biobinderCost: resourceCost, carbonPrice: cPrice,
      capex: capexY, opex, feedstock, energy, rd, deadweight,
      avoidedImports, fxPremium, carbonBenefit, airQuality, maintenance, shadowWage, salvage,
      totalCost, totalBenefit, net, discNet: disc, cumDiscNet: cum, emissionsAvoided: emAvoided,
      gdp: yGdp * k, employment: yJobs * k, income: yInc * k, grossOutput: yOut * k,
    });
  }

  const df = (t: number) => 1 / Math.pow(1 + r, t);
  const pvBenefits = rows.reduce((a, x) => a + x.totalBenefit * df(x.t), 0);
  const pvCosts = rows.reduce((a, x) => a + x.totalCost * df(x.t), 0);
  const npv = pvBenefits - pvCosts;
  const irr = irrCalc(rows.map((x) => x.net));
  const pb = rows.find((x) => x.cumDiscNet >= 0 && x.t > p.constructionYears);
  const totalEmissions = rows.reduce((a, x) => a + x.emissionsAvoided, 0);
  const pvCarbon = rows.reduce((a, x) => a + x.carbonBenefit * df(x.t), 0);
  const pvEm = rows.reduce((a, x) => a + x.emissionsAvoided * df(x.t), 0);
  const costPerTonne = pvEm > 0 ? (-(npv - pvCarbon) * 1e6) / pvEm : 0;

  const sum = (f: (x: YearRow) => number) => rows.reduce((a, x) => a + f(x) * df(x.t), 0);
  const benefitBreakdown = [
    { name: "Avoided bitumen imports", value: sum((x) => x.avoidedImports) },
    { name: "Carbon (shadow price)", value: sum((x) => x.carbonBenefit) },
    { name: "Maintenance / life", value: sum((x) => x.maintenance) },
    { name: "Air quality & health", value: sum((x) => x.airQuality) },
    { name: "Shadow wage gain", value: sum((x) => x.shadowWage) },
    { name: "FX premium", value: sum((x) => x.fxPremium) },
    { name: "Residual value", value: sum((x) => x.salvage) },
  ];
  const costBreakdown = [
    { name: "Capital", value: sum((x) => x.capex) },
    { name: "Operating", value: sum((x) => x.opex) },
    { name: "Feedstock (opp. cost)", value: sum((x) => x.feedstock) },
    { name: "Energy", value: sum((x) => x.energy) },
    { name: "R&D / trials", value: sum((x) => x.rd) },
    { name: "Tax deadweight (MCPF)", value: sum((x) => x.deadweight) },
  ];

  const ioGross = Object.values(sectorAgg).reduce(
    (a, s) => ({ output: a.output + s.out, gdp: a.gdp + s.gdp, jobs: a.jobs + s.jobs, income: a.income + s.inc }),
    { output: 0, gdp: 0, jobs: 0, income: 0 },
  );
  const k = 1 - crowdOut;
  const ioNet = { output: ioGross.output * k, gdp: ioGross.gdp * k, jobs: ioGross.jobs * k, income: ioGross.income * k };
  const years = rows.length;
  const impactsBySector = (Object.keys(sectorAgg) as Sector[]).map((s) => ({
    sector: m[s].label,
    grossOutput: sectorAgg[s].out,
    gdp: sectorAgg[s].gdp,
    jobs: sectorAgg[s].jobs / years,
    income: sectorAgg[s].inc,
  }));
  const biobinderTotal = rows.reduce((a, x) => a + x.biobinderT, 0);

  return {
    rows, npv, pvBenefits, pvCosts, bcr: pvCosts > 0 ? pvBenefits / pvCosts : 0, irr,
    payback: pb ? pb.t : null, totalEmissions, costPerTonne, crowdOut, impactsBySector, ioGross, ioNet,
    peakJobs: Math.max(...rows.map((x) => x.employment)), benefitBreakdown, costBreakdown,
    importSavingsTotal: rows.reduce((a, x) => a + x.avoidedImports, 0), biobinderTotal,
    avgResourceCost: p.opexPerT + p.feedstockRatio * p.feedstockPrice + p.energyPerT,
  };
}

export const TORNADO_KEYS: { key: keyof Inputs; label: string }[] = [
  { key: "bitumenPrice", label: "Bitumen price" },
  { key: "carbonPrice", label: "Shadow carbon price" },
  { key: "capex", label: "Capital cost" },
  { key: "opexPerT", label: "Operating cost / t" },
  { key: "feedstockPrice", label: "Feedstock price" },
  { key: "maxBlendShare", label: "Max blend share" },
  { key: "plantCapacity", label: "Plant capacity" },
  { key: "discountRate", label: "Discount rate" },
  { key: "biogenicStorage", label: "Biogenic storage" },
  { key: "bitumenEF", label: "Bitumen emission factor" },
  { key: "pavementLifeRatio", label: "Pavement life ratio" },
  { key: "mcpf", label: "MCPF" },
];

export function tornado(p: Inputs, swing = 0.2) {
  const base = runModel(p).npv;
  return TORNADO_KEYS.map(({ key, label }) => {
    const v = p[key] as number;
    const lo = runModel({ ...p, [key]: v * (1 - swing) }).npv;
    const hi = runModel({ ...p, [key]: v * (1 + swing) }).npv;
    return { label, low: lo - base, high: hi - base, range: Math.abs(hi - lo) };
  }).sort((a, b) => b.range - a.range);
}

// Seeded RNG for reproducible Monte Carlo
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const tri = (u: number, a: number, c: number, b: number) => {
  const f = (c - a) / (b - a);
  return u < f ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c));
};

export function monteCarlo(p: Inputs, n = 600) {
  const rnd = mulberry32(42);
  const vary: [keyof Inputs, number, number][] = [
    ["bitumenPrice", 0.75, 1.3], ["carbonPrice", 0.5, 1.6], ["capex", 0.8, 1.5], ["opexPerT", 0.8, 1.35],
    ["feedstockPrice", 0.8, 1.4], ["maxBlendShare", 0.5, 1.5], ["biogenicStorage", 0.4, 1.3],
    ["pavementLifeRatio", 0.93, 1.07], ["adoptionMidpoint", 0.7, 1.5], ["bitumenEF", 0.8, 1.2],
  ];
  const npvs: number[] = [], bcrs: number[] = [];
  for (let i = 0; i < n; i++) {
    const q: Inputs = { ...p };
    for (const [k, lo, hi] of vary) {
      const v = p[k] as number;
      (q as unknown as Record<string, number>)[k] = tri(rnd(), v * lo, v, v * hi);
    }
    const res = runModel(q);
    npvs.push(res.npv);
    bcrs.push(res.bcr);
  }
  npvs.sort((a, b) => a - b);
  bcrs.sort((a, b) => a - b);
  const pct = (arr: number[], q: number) => arr[Math.floor(q * (arr.length - 1))];
  const min = npvs[0], max = npvs[npvs.length - 1];
  const bins = 24, w = (max - min) / bins || 1;
  const hist = Array.from({ length: bins }, (_, i) => ({ x: min + w * (i + 0.5), count: 0 }));
  for (const v of npvs) hist[Math.min(bins - 1, Math.floor((v - min) / w))].count++;
  return {
    hist, probPositive: npvs.filter((v) => v > 0).length / n,
    p5: pct(npvs, 0.05), p50: pct(npvs, 0.5), p95: pct(npvs, 0.95), mean: npvs.reduce((a, b) => a + b, 0) / n,
    bcrP5: pct(bcrs, 0.05), bcrP50: pct(bcrs, 0.5), bcrP95: pct(bcrs, 0.95),
  };
}

export const SOURCES = [
  ["Bitumen demand & imports", "MBIE energy & petroleum statistics; Stats NZ Overseas Merchandise Trade (HS 2713/2715); Road Controlling Authorities' sealing volumes. Marsden Point refining ceased 2022 → ~100% imported."],
  ["IO multipliers", "Stats NZ National Accounts input-output tables (2020); aggregated to 5 sectors. Type II includes household induced effects."],
  ["Discount rate", "NZ Treasury public sector discount rate guidance (CBAx). Test 2%, 5% and 8% real."],
  ["Shadow carbon price", "NZ Treasury CBAx shadow carbon values; NZTA Monetised Benefits & Costs Manual; Climate Change Commission pathways. ETS market prices are a lower bound."],
  ["Emission factors", "NZTA / Waka Kotahi Road Infrastructure Emissions tool; Eurobitume LCI (bitumen ≈0.2–0.5 tCO2e/t cradle-to-gate + shipping); lignin/bio-oil LCAs (Scion)."],
  ["Feedstock", "MPI National Exotic Forest Description; Scion residue assessments; delivered harvest residue NZ$60–120/t."],
  ["MCPF", "NZ Treasury guidance: 1.2 marginal cost of public funds for tax-financed spending."],
  ["Labour market", "Stats NZ Household Labour Force Survey (unemployment); RBNZ NAIRU estimates (~4–5%)."],
];
