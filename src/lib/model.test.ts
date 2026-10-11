import { describe, it, expect } from "vitest";
import { runModel, DEFAULT_INPUTS } from "./model";

describe("SCBA separation", () => {
  it("crowding-out assumption does not change social NPV when shadow wage is off", () => {
    const a = runModel({ ...DEFAULT_INPUTS, baseCrowdOut: 0 }).npv;
    const b = runModel({ ...DEFAULT_INPUTS, baseCrowdOut: 0.9 }).npv;
    expect(a).toBeCloseTo(b, 6);
  });
  it("lifecycle biogenic credit nets out counterfactual and end-of-life release", () => {
    const r = runModel({ ...DEFAULT_INPUTS, biogenicStorage: 1, counterfactualStorage: 0.5, eolRelease: 0.5 });
    expect(r.netStoragePerT).toBeCloseTo(0.25, 6);
  });
});
