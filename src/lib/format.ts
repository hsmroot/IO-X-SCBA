export const fm = (v: number, d = 1) => `${v < 0 ? "−" : ""}$${Math.abs(v).toFixed(d)}m`;
export const fn = (v: number, d = 0) => v.toLocaleString("en-NZ", { maximumFractionDigits: d, minimumFractionDigits: d });
export const fp = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
