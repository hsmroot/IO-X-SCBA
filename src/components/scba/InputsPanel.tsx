import type { Inputs, Sector } from "@/lib/model";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type NumKey = { [K in keyof Inputs]: Inputs[K] extends number ? K : never }[keyof Inputs];
type Field = [NumKey, string, string?, number?];

const GROUPS: { title: string; fields: Field[] }[] = [
  { title: "Timeline", fields: [["startYear", "Start year"], ["horizon", "Appraisal horizon", "yrs"], ["constructionYears", "Construction period", "yrs"]] },
  {
    title: "Binder market (NZ)",
    fields: [
      ["bitumenDemand", "Bitumen demand", "t/yr", 1000], ["demandGrowth", "Demand growth", "%/yr", 0.1],
      ["bitumenPrice", "Bitumen price (delivered)", "NZ$/t", 10], ["bitumenPriceGrowth", "Real price growth", "%/yr", 0.1],
      ["bitumenImportShare", "Import share", "0–1", 0.05], ["borderPriceShare", "Border-price share of delivered price", "0–1", 0.01], ["maxBlendShare", "Max substitution share", "0–1", 0.01],
      ["adoptionMidpoint", "Adoption midpoint", "yrs", 0.5], ["adoptionSteepness", "Adoption steepness", "k", 0.1],
      ["armingtonSigma", "Armington elasticity σ", "", 0.1],
    ],
  },
  {
    title: "Biobinder plant",
    fields: [
      ["plantCapacity", "Capacity", "t/yr", 1000], ["capex", "Capital cost", "NZ$m", 1], ["capexDomesticShare", "Capex domestic content", "0–1", 0.05],
      ["opexPerT", "Opex (non-feedstock)", "NZ$/t", 10], ["feedstockRatio", "Residue per t binder", "t/t", 0.1],
      ["feedstockPrice", "Residue price", "NZ$/t", 5], ["feedstockOppCost", "Residue value in best alternative use (share of price)", "0–1", 0.05],
      ["energyPerT", "Energy cost", "NZ$/t", 10], ["laborSharePerT", "Labour share of opex", "0–1", 0.05],
      ["biobinderPriceDiscount", "Price discount vs bitumen", "%", 1], ["plantLife", "Plant life", "yrs"],
      ["salvageShare", "Residual value share", "0–1", 0.05], ["rdTrialCost", "R&D / road trials", "NZ$m", 0.5],
    ],
  },
  { title: "Pavement performance", fields: [["pavementLifeRatio", "Life ratio vs bitumen", "×", 0.01], ["maintenanceCostPerT", "Lifecycle maint. per t binder", "NZ$/t", 50], ["binderPerLaneKm", "Binder per lane-km reseal", "t", 0.5], ["resealInterval", "Bitumen reseal interval", "yrs", 1]] },
  {
    title: "Environment",
    fields: [
      ["bitumenEF", "Bitumen EF", "tCO₂e/t", 0.01], ["biobinderEF", "Biobinder process EF", "tCO₂e/t", 0.01],
      ["biogenicStorage", "Gross biogenic carbon in binder", "tCO₂e/t", 0.05], ["collectionEF", "Residue collection & haul EF", "tCO₂e/t residue", 0.005], ["counterfactualStorage", "Storage that would occur anyway", "0–1", 0.05], ["eolRelease", "Released at end of road life", "0–1", 0.05], ["carbonPrice", "Shadow carbon price", "NZ$/t", 5],
      ["carbonPriceGrowth", "Carbon price growth", "%/yr", 0.1], ["airQualityPerT", "Air quality co-benefit", "NZ$/t", 5],
    ],
  },
  {
    title: "Economy & scenario adjustment",
    fields: [
      ["discountRate", "Real discount rate", "%", 0.5], ["mcpf", "Marginal cost of public funds", "×", 0.05],
      ["subsidyShare", "Govt share of capex", "0–1", 0.05], ["unemployment", "Unemployment rate", "%", 0.1],
      ["nairu", "NAIRU", "%", 0.1], ["baseCrowdOut", "Crowding-out at NAIRU", "0–1", 0.05],
      ["shadowFxPremium", "Shadow FX premium", "%", 1],
    ],
  },
];

export function InputsPanel({ p, set }: { p: Inputs; set: (p: Inputs) => void }) {
  const upd = (k: NumKey, v: number) => set({ ...p, [k]: v });
  const updMult = (s: Sector, k: string, v: number) =>
    set({ ...p, mults: { ...p.mults, [s]: { ...p.mults[s], [k]: v } } });

  return (
    <Accordion type="multiple" defaultValue={["Binder market (NZ)", "Biobinder plant"]} className="w-full">
      {GROUPS.map((g) => (
        <AccordionItem key={g.title} value={g.title}>
          <AccordionTrigger className="font-display text-base">{g.title}</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-3">
              {g.fields.map(([k, label, unit, step]) => (
                <div key={k} className="grid grid-cols-[1fr_7rem] items-center gap-2">
                  <Label htmlFor={k} className="text-xs leading-tight text-muted-foreground">
                    {label} {unit && <span className="opacity-70">({unit})</span>}
                  </Label>
                  <Input id={k} type="number" step={step ?? 1} value={p[k] as number} onChange={(e) => upd(k, parseFloat(e.target.value) || 0)} className="num h-8 text-right text-sm" />
                </div>
              ))}
              {g.title === "Environment" && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Count biogenic storage</Label>
                  <Switch checked={p.includeBiogenic} onCheckedChange={(v) => set({ ...p, includeBiogenic: v })} />
                </div>
              )}
              {g.title === "Economy & scenario adjustment" && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Type II (include household induced)</Label>
                  <Switch checked={p.useTypeII} onCheckedChange={(v) => set({ ...p, useTypeII: v })} />
                </div>
              )}
              {g.title === "Economy & scenario adjustment" && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Include shadow-wage benefit in NPV</Label>
                  <Switch checked={p.includeShadowWage} onCheckedChange={(v) => set({ ...p, includeShadowWage: v })} />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
      <AccordionItem value="mults">
        <AccordionTrigger className="font-display text-base">I/O multipliers (Stats NZ 2020)</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            {(Object.keys(p.mults) as Sector[]).map((s) => (
              <div key={s} className="rounded-md border border-border p-2">
                <div className="mb-2 text-xs font-semibold">{p.mults[s].label}</div>
                <div className="grid grid-cols-2 gap-2">
                  {(["outputI", "outputII", "vaRatio", "vaMultII", "empPerM", "empMultII", "incomeRatio"] as const).map((k) => (
                    <label key={k} className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
                      {k}
                      <Input type="number" step={0.01} value={p.mults[s][k]} onChange={(e) => updMult(s, k, parseFloat(e.target.value) || 0)} className="num h-7 w-16 px-1 text-right text-xs" />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
