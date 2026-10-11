import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
} from "recharts";
import { Download, Printer, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InputsPanel } from "@/components/scba/InputsPanel";
import {
  DEFAULT_INPUTS, REGION_SHARES, SCENARIOS, SOURCES, monteCarlo, runModel, crowdOutSensitivity, MC_VARY, tornado, type Inputs,
} from "@/lib/model";
import { fm, fn, fp } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Biobinder NZ — Hybrid I/O Social Cost-Benefit Model" },
      { name: "description", content: "Interactive input-output SCBA model that mimics CGE results for biobinder substitution of bitumen in New Zealand roads." },
      { property: "og:title", content: "Biobinder NZ — Hybrid I/O SCBA Model" },
      { property: "og:description", content: "NPV, BCR, GDP, jobs, emissions, sensitivity and Monte Carlo for NZ biobinders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const C = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)"];
const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 } };

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`num mt-1 text-2xl font-medium ${tone === "pos" ? "text-positive" : tone === "neg" ? "text-destructive" : ""}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, note, children, h = 300 }: { title: string; note?: string; children: React.ReactElement; h?: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </CardHeader>
      <CardContent style={{ height: h }}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function Index() {
  const [p, setP] = useState<Inputs>(DEFAULT_INPUTS);
  const res = useMemo(() => runModel(p), [p]);
  const tor = useMemo(() => tornado(p), [p]);
  const mc = useMemo(() => monteCarlo(p), [p]);
  const coSens = useMemo(() => crowdOutSensitivity(p), [p]);
  const scen = useMemo(
    () => Object.entries(SCENARIOS).map(([name, o]) => ({ name, r: runModel({ ...p, ...o }) })),
    [p],
  );
  const discSens = useMemo(
    () => [2, 3, 4, 5, 6, 7, 8].map((d) => ({ rate: `${d}%`, npv: runModel({ ...p, discountRate: d }).npv })),
    [p],
  );
  const carbonSens = useMemo(
    () => [0, 50, 100, 150, 200, 250, 300].map((c) => ({ price: c, npv: runModel({ ...p, carbonPrice: c }).npv })),
    [p],
  );
  const regions = Object.entries(REGION_SHARES).map(([name, s]) => {
    const fr = res.impactsBySector.slice(0, 2);
    return { name, jobs: fr.reduce((a, x) => a + x.jobs, 0) * s, gdp: fr.reduce((a, x) => a + x.gdp, 0) * s * (1 - res.crowdOut) };
  });

  const rows = res.rows;
  const exportCsv = () => {
    const keys = Object.keys(rows[0]!) as (keyof (typeof rows)[0])[];
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => r[k]).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "biobinder_scba_results.csv";
    a.click();
  };

  const opRows = rows.filter((r) => r.t >= p.constructionYears);
  const avgShare = opRows.reduce((a, r) => a + r.share, 0) / Math.max(opRows.length, 1);
  const verdict = res.npv > 0 ? "economically justified" : "not justified on central assumptions";

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-4 px-6 py-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-primary">Aotearoa New Zealand · Road binders</div>
            <h1 className="mt-1 text-3xl font-semibold md:text-4xl">Biobinder Hybrid I/O–SCBA Model</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Social cost–benefit analysis (resource costs and benefits only) reported separately from input-output economic-activity impacts. The I/O results carry a scenario adjustment for crowding-out — not an approximation of a full CGE model.
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {Object.keys(SCENARIOS).map((s) => (
              <Button key={s} variant="outline" size="sm" onClick={() => setP({ ...DEFAULT_INPUTS, ...SCENARIOS[s] })}>{s}</Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setP(DEFAULT_INPUTS)}><RotateCcw className="size-4" /></Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="size-4" /> CSV</Button>
            <Button size="sm" onClick={() => window.print()}><Printer className="size-4" /> Print report</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-6 py-6 lg:grid-cols-[340px_1fr]">
        <aside className="no-print lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto rounded-md border border-border bg-card px-4">
          <InputsPanel p={p} set={setP} />
        </aside>

        <main className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <Kpi label="Social NPV" value={fm(res.npv)} sub={`@ ${p.discountRate}% real`} tone={res.npv >= 0 ? "pos" : "neg"} />
            <Kpi label="BCR" value={res.bcr.toFixed(2)} tone={res.bcr >= 1 ? "pos" : "neg"} />
            <Kpi label="Economic IRR" value={res.irr === null ? "n/a" : fp(res.irr)} />
            <Kpi label="Disc. payback" value={res.payback === null ? "Beyond horizon" : `${res.payback} yrs`} />
            <Kpi label="CO₂e abated" value={`${fn(res.totalEmissions / 1000)} kt`} sub={`Abatement cost $${fn(res.costPerTonne)}/t`} />
            <Kpi label="Activity: jobs (peak)" value={fn(res.peakJobs)} sub={`Not in NPV · crowd-out ${fp(res.crowdOut, 0)}`} />
          </div>

          <Tabs defaultValue="summary">
            <TabsList className="no-print flex h-auto flex-wrap justify-start">
              {["summary", "cashflow", "economy", "counterfactual", "environment", "risk", "scenarios", "data", "report"].map((t) => (
                <TabsTrigger key={t} value={t} className="capitalize">{t === "risk" ? "Sensitivity & risk" : t}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="summary" className="mt-4 grid gap-4 xl:grid-cols-2">
              <ChartCard title="Adoption & production" note="Biobinder output and share of NZ binder market (Armington-adjusted logistic diffusion)">
                <ComposedChart data={rows}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={axis} />
                  <YAxis yAxisId="l" tick={axis} tickFormatter={(v) => `${v / 1000}k`} />
                  <YAxis yAxisId="r" orientation="right" tick={axis} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip {...tip} />
                  <Legend />
                  <Bar yAxisId="l" dataKey="biobinderT" name="Biobinder (t)" fill={C[0]} />
                  <Line yAxisId="r" dataKey="share" name="Market share" stroke={C[1]} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ChartCard>
              <ChartCard title="Cumulative discounted net benefit" note="NZ$m, national perspective">
                <AreaChart data={rows}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={axis} />
                  <YAxis tick={axis} />
                  <Tooltip {...tip} formatter={(v: number) => fm(v)} />
                  <ReferenceLine y={0} stroke="var(--foreground)" />
                  <Area dataKey="cumDiscNet" name="Cumulative PV" stroke={C[0]} fill={C[0]} fillOpacity={0.2} />
                </AreaChart>
              </ChartCard>
              <ChartCard title="PV of benefits" note="NZ$m">
                <PieChart>
                  <Pie data={res.benefitBreakdown.filter((x) => x.value > 0.01)} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                    {res.benefitBreakdown.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                  </Pie>
                  <Tooltip {...tip} formatter={(v: number) => fm(v)} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ChartCard>
              <ChartCard title="PV of costs" note="NZ$m">
                <PieChart>
                  <Pie data={res.costBreakdown.filter((x) => x.value > 0.01)} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                    {res.costBreakdown.map((_, i) => <Cell key={i} fill={C[(i + 2) % C.length]} />)}
                  </Pie>
                  <Tooltip {...tip} formatter={(v: number) => fm(v)} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ChartCard>
            </TabsContent>

            <TabsContent value="cashflow" className="mt-4 grid gap-4">
              <ChartCard title="Annual social benefits and costs" note="Undiscounted real NZ$m" h={360}>
                <ComposedChart data={rows.map((r) => ({ ...r, nCapex: -r.capex, nOpex: -r.opex, nFeed: -r.feedstock, nEnergy: -r.energy, nOther: -(r.rd + r.deadweight) }))} stackOffset="sign">
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={axis} />
                  <YAxis tick={axis} />
                  <Tooltip {...tip} formatter={(v: number) => fm(v, 2)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar stackId="a" dataKey="avoidedImports" name="Avoided imports" fill={C[0]} />
                  <Bar stackId="a" dataKey="carbonBenefit" name="Carbon" fill={C[4]} />
                  <Bar stackId="a" dataKey="maintenance" name="Maintenance" fill={C[2]} />
                  <Bar stackId="a" dataKey="airQuality" name="Air quality" fill={C[5]} />
                  <Bar stackId="a" dataKey="shadowWage" name="Shadow wage" fill={C[6]} />
                  <Bar stackId="a" dataKey="nCapex" name="Capex" fill={C[3]} />
                  <Bar stackId="a" dataKey="nOpex" name="Opex" fill={C[1]} />
                  <Bar stackId="a" dataKey="nFeed" name="Feedstock" fill="var(--accent)" fillOpacity={0.6} />
                  <Bar stackId="a" dataKey="nEnergy" name="Energy" fill={C[3]} fillOpacity={0.5} />
                  <Bar stackId="a" dataKey="nOther" name="R&D + MCPF" fill="var(--destructive)" />
                  <Line dataKey="net" name="Net" stroke="var(--foreground)" dot={false} strokeWidth={2} />
                </ComposedChart>
              </ChartCard>
              <ChartCard title="Unit economics" note="Bitumen delivered price vs biobinder resource cost (NZ$/t)">
                <LineChart data={rows}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={axis} />
                  <YAxis tick={axis} />
                  <Tooltip {...tip} formatter={(v: number) => `$${fn(v)}`} />
                  <Legend />
                  <Line dataKey="bitumenPrice" name="Bitumen price" stroke={C[3]} dot={false} strokeWidth={2} />
                  <Line dataKey="biobinderCost" name="Biobinder resource cost" stroke={C[0]} dot={false} strokeWidth={2} />
                </LineChart>
              </ChartCard>
            </TabsContent>

            <TabsContent value="economy" className="mt-4 grid gap-4 xl:grid-cols-2">
              <Card className="xl:col-span-2">
                <CardHeader><CardTitle className="text-base">I/O gross vs Scenario-adjusted impacts (cumulative)</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Measure</TableHead><TableHead className="text-right">I/O gross</TableHead><TableHead className="text-right">Scenario-adjusted</TableHead><TableHead className="text-right">Adjustment</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {([["Gross output", "output", true], ["Value added (GDP)", "gdp", true], ["Household income", "income", true], ["Job-years (FTE)", "jobs", false]] as const).map(([l, k, money]) => (
                        <TableRow key={k}>
                          <TableCell>{l}</TableCell>
                          <TableCell className="num text-right">{money ? fm(res.ioGross[k]) : fn(res.ioGross[k])}</TableCell>
                          <TableCell className="num text-right">{money ? fm(res.ioNet[k]) : fn(res.ioNet[k])}</TableCell>
                          <TableCell className="num text-right text-muted-foreground">−{fp(res.crowdOut, 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="mt-3 text-xs text-muted-foreground">These are measures of economic activity, not net social benefits, and are excluded from the social NPV: much of this activity draws workers and capital away from other uses. The scenario adjustment scales I/O results by (1 − crowding-out), where crowding-out = base rate × (NAIRU ÷ unemployment)^0.75. The base rate (default 50%) is an assumption, informed by the general finding in NZ and international CGE comparisons that I/O overstates national impacts by roughly half or more when the labour market is near full employment; it is not estimated from NZ data. The table below shows results across alternative values.</p>
                  <Table className="mt-3">
                    <TableHeader><TableRow><TableHead>Crowding-out</TableHead><TableHead className="text-right">GDP (cum.)</TableHead><TableHead className="text-right">Income (cum.)</TableHead><TableHead className="text-right">Avg FTE/yr</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {coSens.map((c) => (
                        <TableRow key={c.crowdOut}><TableCell className="num">{fp(c.crowdOut, 0)}{c.crowdOut === 0 ? " (pure I/O)" : ""}</TableCell><TableCell className="num text-right">{fm(c.gdp)}</TableCell><TableCell className="num text-right">{fm(c.income)}</TableCell><TableCell className="num text-right">{fn(c.jobs)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="mt-2 text-xs text-muted-foreground">Social NPV is unaffected by these values{p.includeShadowWage ? " except through the optional shadow-wage benefit (currently ON)" : " (shadow-wage benefit is switched off)"}.</p>
                </CardContent>
              </Card>
              <ChartCard title="Net GDP and employment over time" note="Scenario-adjusted economic activity — not in social NPV">
                <ComposedChart data={rows}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={axis} />
                  <YAxis yAxisId="l" tick={axis} />
                  <YAxis yAxisId="r" orientation="right" tick={axis} />
                  <Tooltip {...tip} />
                  <Legend />
                  <Bar yAxisId="l" dataKey="gdp" name="GDP (NZ$m)" fill={C[0]} />
                  <Line yAxisId="r" dataKey="employment" name="FTE" stroke={C[1]} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ChartCard>
              <ChartCard title="Value added by sector (gross, cumulative)" note="NZ$m">
                <BarChart data={res.impactsBySector} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis type="number" tick={axis} />
                  <YAxis type="category" dataKey="sector" tick={axis} width={140} />
                  <Tooltip {...tip} formatter={(v: number) => fm(v)} />
                  <ReferenceLine x={0} stroke="var(--foreground)" />
                  <Bar dataKey="gdp" name="GDP">
                    {res.impactsBySector.map((s, i) => <Cell key={i} fill={s.gdp < 0 ? "var(--destructive)" : C[i]} />)}
                  </Bar>
                </BarChart>
              </ChartCard>
              <ChartCard title="Regional distribution of forestry/manufacturing impacts" note="Allocated by plantation forest area (NEFD) — avg FTE/yr" h={340}>
                <BarChart data={regions} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis type="number" tick={axis} />
                  <YAxis type="category" dataKey="name" tick={axis} width={160} />
                  <Tooltip {...tip} formatter={(v: number) => fn(v, 1)} />
                  <Bar dataKey="jobs" name="Avg FTE (gross)" fill={C[4]} />
                </BarChart>
              </ChartCard>
              <ChartCard title="Household income (net)" note="NZ$m per year">
                <AreaChart data={rows}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={axis} />
                  <YAxis tick={axis} />
                  <Tooltip {...tip} formatter={(v: number) => fm(v, 2)} />
                  <Area dataKey="income" stroke={C[2]} fill={C[2]} fillOpacity={0.25} name="Income" />
                </AreaChart>
              </ChartCard>
            </TabsContent>

            <TabsContent value="environment" className="mt-4 grid gap-4 xl:grid-cols-2">
              <ChartCard title="Annual emissions avoided" note="tCO₂e (bitumen displaced incl. biogenic storage if enabled)">
                <AreaChart data={rows}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={axis} />
                  <YAxis tick={axis} />
                  <Tooltip {...tip} formatter={(v: number) => fn(v)} />
                  <Area dataKey="emissionsAvoided" name="tCO₂e" stroke={C[4]} fill={C[4]} fillOpacity={0.3} />
                </AreaChart>
              </ChartCard>
              <ChartCard title="Shadow carbon price & carbon benefit" note="NZ$/t (line) and NZ$m (bars)">
                <ComposedChart data={rows}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={axis} />
                  <YAxis yAxisId="l" tick={axis} />
                  <YAxis yAxisId="r" orientation="right" tick={axis} />
                  <Tooltip {...tip} />
                  <Legend />
                  <Bar yAxisId="l" dataKey="carbonBenefit" name="Carbon benefit (NZ$m)" fill={C[0]} />
                  <Line yAxisId="r" dataKey="carbonPrice" name="Carbon price" stroke={C[1]} dot={false} strokeWidth={2} />
                </ComposedChart>
              </ChartCard>
              <ChartCard title="NPV vs shadow carbon price" note="Break-even carbon value">
                <LineChart data={carbonSens}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="price" tick={axis} />
                  <YAxis tick={axis} />
                  <Tooltip {...tip} formatter={(v: number) => fm(v)} />
                  <ReferenceLine y={0} stroke="var(--foreground)" />
                  <Line dataKey="npv" stroke={C[0]} strokeWidth={2} />
                </LineChart>
              </ChartCard>
              <Card>
                <CardHeader><CardTitle className="text-base">Emissions summary</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Total abated over horizon</span><span className="num">{fn(res.totalEmissions)} tCO₂e</span></div>
                  <div className="flex justify-between"><span>Net abatement per t binder</span><span className="num">{(p.bitumenEF - res.lifecycleBioEF).toFixed(2)} tCO₂e/t</span></div>
                  <div className="flex justify-between"><span>Social abatement cost (ex-carbon)</span><span className="num">${fn(res.costPerTonne)}/tCO₂e</span></div>
                  <div className="flex justify-between"><span>Biobinder produced</span><span className="num">{fn(res.biobinderTotal / 1000)} kt</span></div>
                  <p className="pt-2 text-xs text-muted-foreground">A negative abatement cost means the project pays for itself before carbon is valued. Compare against the shadow carbon price to judge cost-effectiveness.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="counterfactual" className="mt-4 grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Without the plant (counterfactual)</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><b>Roads:</b> sealed with 100% imported bitumen at border cost; the biobinder only displaces this volume.</p>
                  <p><b>Forestry residue:</b> largely left on skid sites/cutover to decay, with some sold for energy or pellets. The feedstock is costed at {fp(p.feedstockOppCost, 0)} of its delivered price (NZ$ {fn(p.feedstockPrice * p.feedstockOppCost)}/t) to reflect its best alternative use; set to 1 if residue has a full market alternative.</p>
                  <p><b>Carbon:</b> {fp(p.counterfactualStorage, 0)} of the binder's biogenic carbon is assumed to have stayed stored anyway (slow decay, soil carbon), so it is not credited.</p>
                  <p><b>Imports:</b> displaced bitumen is valued at {fp(p.borderPriceShare, 0)} of the delivered price — GST, levies and retained domestic margins are transfers, not resource savings.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Biogenic carbon — full lifecycle (per t binder)</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {([
                    ["Process emissions", p.biobinderEF],
                    ["Residue collection, chipping & haul", p.feedstockRatio * p.collectionEF],
                    ["Gross biogenic carbon stored", -p.biogenicStorage],
                    ["Less: would be stored anyway", p.biogenicStorage * p.counterfactualStorage],
                    ["Less: released at end of road life", p.biogenicStorage * (1 - p.counterfactualStorage) * p.eolRelease],
                  ] as const).map(([l, v]) => (
                    <div key={l} className="flex justify-between"><span>{l}</span><span className="num">{v.toFixed(3)}</span></div>
                  ))}
                  <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>Lifecycle biobinder EF{p.includeBiogenic ? "" : " (storage off)"}</span><span className="num">{res.lifecycleBioEF.toFixed(3)} tCO₂e/t</span></div>
                  <div className="flex justify-between"><span>vs bitumen EF</span><span className="num">{p.bitumenEF.toFixed(3)} tCO₂e/t</span></div>
                </CardContent>
              </Card>
              <Card className="xl:col-span-2">
                <CardHeader><CardTitle className="text-base">Same road service: cost per lane-km per year</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Table>
                    <TableHeader><TableRow><TableHead>Binder</TableHead><TableHead className="text-right">Reseal life</TableHead><TableHead className="text-right">Annualised cost (NZ$/lane-km/yr)</TableHead></TableRow></TableHeader>
                    <TableBody>
                      <TableRow><TableCell>Bitumen (border cost)</TableCell><TableCell className="num text-right">{p.resealInterval.toFixed(1)} yrs</TableCell><TableCell className="num text-right">{fn(res.laneKm.bitumenPerLkmYr)}</TableCell></TableRow>
                      <TableRow><TableCell>Biobinder (resource cost)</TableCell><TableCell className="num text-right">{(p.resealInterval * p.pavementLifeRatio).toFixed(1)} yrs</TableCell><TableCell className="num text-right">{fn(res.laneKm.bioPerLkmYr)}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                  <p className="text-xs text-muted-foreground">Compares the cost of delivering the same sealed lane-km over its life (binder + associated maintenance, annualised at {p.discountRate}%), so durability differences show up directly rather than being hidden in a per-tonne comparison. The model's default life ratio of 1.0 assumes equal durability — this is unproven and should be tested (the Monte Carlo allows down to 0.85). Approx. {fn(res.laneKm.lkmServed)} lane-km reseals supplied over the horizon.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="risk" className="mt-4 grid gap-4 xl:grid-cols-2">
              <ChartCard title="Tornado: NPV sensitivity (±20%)" note="Change in NPV, NZ$m" h={420}>
                <BarChart data={tor} layout="vertical" stackOffset="sign" margin={{ left: 40 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis type="number" tick={axis} />
                  <YAxis type="category" dataKey="label" tick={axis} width={150} />
                  <Tooltip {...tip} formatter={(v: number) => fm(v)} />
                  <Legend />
                  <ReferenceLine x={0} stroke="var(--foreground)" />
                  <Bar dataKey="low" name="−20%" fill={C[3]} stackId="s" />
                  <Bar dataKey="high" name="+20%" fill={C[0]} stackId="s" />
                </BarChart>
              </ChartCard>
              <ChartCard title={`Monte Carlo NPV distribution (600 runs)`} note={`P(NPV>0) = ${fp(mc.probPositive, 0)} · P5 ${fm(mc.p5, 0)} · P50 ${fm(mc.p50, 0)} · P95 ${fm(mc.p95, 0)}`} h={420}>
                <BarChart data={mc.hist}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="x" tick={axis} tickFormatter={(v) => v.toFixed(0)} />
                  <YAxis tick={axis} />
                  <Tooltip {...tip} labelFormatter={(v: number) => fm(v)} />
                  <Bar dataKey="count" name="Runs">
                    {mc.hist.map((h, i) => <Cell key={i} fill={h.x < 0 ? "var(--destructive)" : C[0]} />)}
                  </Bar>
                </BarChart>
              </ChartCard>
              <ChartCard title="NPV by discount rate" note="Treasury guidance range">
                <BarChart data={discSens}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="rate" tick={axis} />
                  <YAxis tick={axis} />
                  <Tooltip {...tip} formatter={(v: number) => fm(v)} />
                  <ReferenceLine y={0} stroke="var(--foreground)" />
                  <Bar dataKey="npv" name="NPV">
                    {discSens.map((d, i) => <Cell key={i} fill={d.npv < 0 ? "var(--destructive)" : C[0]} />)}
                  </Bar>
                </BarChart>
              </ChartCard>
              <Card>
                <CardHeader><CardTitle className="text-base">Risk statistics</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {[["Mean NPV", fm(mc.mean)], ["NPV 90% interval", `${fm(mc.p5)} to ${fm(mc.p95)}`], ["BCR P5 / P50 / P95", `${mc.bcrP5.toFixed(2)} / ${mc.bcrP50.toFixed(2)} / ${mc.bcrP95.toFixed(2)}`], ["Probability NPV > 0", fp(mc.probPositive, 0)]].map(([a, b]) => (
                    <div key={a} className="flex justify-between"><span>{a}</span><span className="num">{b}</span></div>
                  ))}
                  <p className="pt-2 text-xs text-muted-foreground">Triangular distributions on 10 uncertain parameters (prices, costs, adoption, carbon, emission factors). Seeded for reproducibility.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scenarios" className="mt-4 grid gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Scenario comparison</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Metric</TableHead>{scen.map((s) => <TableHead key={s.name} className="text-right">{s.name}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {([
                        ["NPV", (r) => fm(r.npv)], ["BCR", (r) => r.bcr.toFixed(2)], ["IRR", (r) => (r.irr === null ? "n/a" : fp(r.irr))],
                        ["CO₂e abated (kt)", (r) => fn(r.totalEmissions / 1000)], ["Net GDP (cum.)", (r) => fm(r.ioNet.gdp)],
                        ["Net job-years", (r) => fn(r.ioNet.jobs)], ["Import savings (cum.)", (r) => fm(r.importSavingsTotal)],
                        ["Abatement cost $/t", (r) => fn(r.costPerTonne)],
                      ] as [string, (r: ReturnType<typeof runModel>) => string][]).map(([l, f]) => (
                        <TableRow key={l}><TableCell>{l}</TableCell>{scen.map((s) => <TableCell key={s.name} className="num text-right">{f(s.r)}</TableCell>)}</TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="mt-2 text-xs text-muted-foreground">Scenarios override key inputs on top of your current settings.</p>
                </CardContent>
              </Card>
              <ChartCard title="Cumulative discounted net benefit by scenario" note="NZ$m">
                <LineChart data={rows.map((r, i) => Object.fromEntries([["year", r.year], ...scen.map((s) => [s.name, s.r.rows[i]?.cumDiscNet])]))}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={axis} />
                  <YAxis tick={axis} />
                  <Tooltip {...tip} formatter={(v: number) => fm(v)} />
                  <Legend />
                  <ReferenceLine y={0} stroke="var(--foreground)" />
                  {scen.map((s, i) => <Line key={s.name} dataKey={s.name} stroke={C[[3, 0, 4][i] ?? 0]} strokeWidth={2} dot={false} />)}
                </LineChart>
              </ChartCard>
            </TabsContent>

            <TabsContent value="data" className="mt-4">
              <Card>
                <CardContent className="overflow-x-auto pt-6">
                  <Table className="text-xs">
                    <TableHeader><TableRow>{["Year", "Biobinder t", "Share", "Benefits $m", "Costs $m", "Net $m", "Cum PV $m", "tCO₂e", "GDP $m", "FTE"].map((h) => <TableHead key={h} className="text-right">{h}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.year} className="num">
                          <TableCell className="text-right">{r.year}</TableCell>
                          <TableCell className="text-right">{fn(r.biobinderT)}</TableCell>
                          <TableCell className="text-right">{fp(r.share)}</TableCell>
                          <TableCell className="text-right">{r.totalBenefit.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{r.totalCost.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{r.net.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{r.cumDiscNet.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{fn(r.emissionsAvoided)}</TableCell>
                          <TableCell className="text-right">{r.gdp.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{fn(r.employment, 1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="report" className="mt-4">
              <Card>
                <CardContent className="prose-sm max-w-none space-y-5 pt-6 text-sm leading-relaxed">
                  <h2 className="text-2xl font-semibold">Social Cost-Benefit Analysis: Biobinder Substitution for Bitumen in New Zealand</h2>
                  <p className="text-xs text-muted-foreground">Hybrid input-output / SCBA model · appraisal {p.startYear}–{p.startYear + p.horizon} · {p.discountRate}% real discount rate · NZ$ real</p>

                  <section><h3 className="text-lg font-semibold">1. Executive summary</h3>
                    <p>On the current assumptions, a {fn(p.plantCapacity)} t/yr domestic biobinder plant (capex {fm(p.capex, 0)}) displacing imported bitumen is <strong>{verdict}</strong>, with a social NPV of <strong>{fm(res.npv)}</strong>, a benefit-cost ratio of <strong>{res.bcr.toFixed(2)}</strong>{res.irr !== null && <> and an economic IRR of <strong>{fp(res.irr)}</strong></>}. The project abates about <strong>{fn(res.totalEmissions / 1000)} kt CO₂e</strong> over the horizon at a social abatement cost of <strong>${fn(res.costPerTonne)}/tCO₂e</strong>, and reduces bitumen imports by a cumulative <strong>{fm(res.importSavingsTotal, 0)}</strong>. Monte Carlo analysis gives a <strong>{fp(mc.probPositive, 0)}</strong> probability of positive NPV.</p>
                  </section>

                  <section><h3 className="text-lg font-semibold">2. Context</h3>
                    <p>Since the Marsden Point refinery converted to an import terminal in 2022, New Zealand imports effectively all of its road bitumen (~{fn(p.bitumenDemand / 1000)} kt/yr assumed). Biobinders derived from lignin, bio-oils or pyrolysis of forestry residues can partially substitute bitumen in chipseal and asphalt. NZ's ~1.7 million ha plantation estate generates substantial harvest residues, giving a potential domestic feedstock base concentrated in the Central North Island, Northland, Tairāwhiti and lower South Island.</p>
                  </section>

                  <section><h3 className="text-lg font-semibold">3. Methodology</h3>
                    <p><strong>SCBA core.</strong> Resource costs (capital, operating, energy, feedstock at opportunity cost) are compared with social benefits: avoided import resource cost of bitumen, shadow-priced carbon, pavement maintenance differences, air-quality co-benefits, shadow wage gains and residual value. Government funding attracts a deadweight cost via the MCPF ({p.mcpf}).</p>
                    <p><strong>I/O impact core.</strong> Final-demand shocks to five aggregated sectors are run through {p.useTypeII ? "Type II" : "Type I"} multipliers derived from Stats NZ national input-output tables, giving gross output, value added, household income and employment. Displaced fuel import/wholesale activity enters as a negative shock.</p>
                    <p><strong>CGE-mimic adjustments.</strong> (i) Armington substitution (σ = {p.armingtonSigma}) scales the adoption ceiling with the bitumen/biobinder relative price; (ii) labour-market crowding-out of {fp(res.crowdOut, 0)} (base {fp(p.baseCrowdOut, 0)}, scaled by NAIRU {p.nairu}% / unemployment {p.unemployment}%) converts gross I/O impacts to net economy-wide effects; (iii) shadow wages reflect the opportunity cost of labour; (iv) shadow FX premium on import savings ({p.shadowFxPremium}%). Economy-wide impacts are reported separately and are <em>not</em> added to the SCBA to avoid double counting.</p>
                  </section>

                  <section><h3 className="text-lg font-semibold">4. Results</h3>
                    <Table className="text-xs">
                      <TableBody>
                        {[["PV benefits", fm(res.pvBenefits)], ["PV costs", fm(res.pvCosts)], ["NPV", fm(res.npv)], ["BCR", res.bcr.toFixed(2)], ["Discounted payback", res.payback === null ? "Beyond horizon" : `${res.payback} years`], ["Average market share (operating)", fp(avgShare)], ["Biobinder resource cost", `$${fn(res.avgResourceCost)}/t vs bitumen $${fn(p.bitumenPrice)}/t`], ["Net GDP (CGE-adjusted, cum.)", fm(res.ioNet.gdp)], ["Net job-years", fn(res.ioNet.jobs)], ["Peak net FTE", fn(res.peakJobs)]].map(([a, b]) => (
                          <TableRow key={a}><TableCell>{a}</TableCell><TableCell className="num text-right">{b}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="mt-2">Benefit composition (PV): {res.benefitBreakdown.filter((b) => b.value > 0.05).map((b) => `${b.name} ${fm(b.value, 0)}`).join("; ")}. Cost composition (PV): {res.costBreakdown.filter((b) => b.value > 0.05).map((b) => `${b.name} ${fm(b.value, 0)}`).join("; ")}.</p>
                  </section>

                  <section><h3 className="text-lg font-semibold">5. Sensitivity and risk</h3>
                    <p>The most influential parameters are {tor.slice(0, 4).map((t) => t.label.toLowerCase()).join(", ")}. NPV ranges from {fm(discSens[discSens.length - 1]!.npv)} at 8% to {fm(discSens[0]!.npv)} at 2%. The Monte Carlo 90% interval is {fm(mc.p5)} to {fm(mc.p95)}. Scenario NPVs: {scen.map((s) => `${s.name} ${fm(s.r.npv, 0)}`).join(", ")}.</p>
                  </section>

                  <section><h3 className="text-lg font-semibold">6. Limitations</h3>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>I/O assumes fixed technical coefficients and constant returns; the CGE-mimic layer approximates, but does not solve, general equilibrium price and factor-market responses.</li>
                      <li>Multipliers are aggregated approximations of Stats NZ tables; replace with project-specific extracts where available.</li>
                      <li>Biobinder pavement performance in NZ conditions (chipseal dominance) is still being trialled; life-ratio and emission factors carry high uncertainty.</li>
                      <li>Biogenic carbon accounting is contested; test results with storage switched off.</li>
                      <li>Distributional (Māori landowner, regional) and Treasury Living Standards Framework impacts are indicated qualitatively/regionally only.</li>
                    </ul>
                  </section>

                  <section><h3 className="text-lg font-semibold">7. Data sources & references</h3>
                    <Table className="text-xs"><TableBody>{SOURCES.map(([a, b]) => <TableRow key={a}><TableCell className="w-48 align-top font-medium">{a}</TableCell><TableCell>{b}</TableCell></TableRow>)}</TableBody></Table>
                    <p className="mt-2 text-xs text-muted-foreground">Default values are indicative estimates compiled from public NZ sources and literature ranges; verify against the latest releases before formal use.</p>
                  </section>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
