/** Pure helpers for material BOQ, variance, and stock. */

export const VARIANCE_THRESHOLD = 0.15;

export type WorkType = 'brick_masonry' | 'plaster';

export type Measurements = {
  length: number;
  height: number;
  thickness?: number;
  openingsArea?: number;
  netArea?: number;
};

export const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: 'brick_masonry', label: 'Brick masonry' },
  { value: 'plaster', label: 'Plaster' },
];

/** Default rates per sq.ft of net wall/work area (Pakistan site rules of thumb). */
export const DEFAULT_FORMULA_RATES: {
  workType: WorkType;
  materialCode: string;
  ratePerSqFt: number;
  notes: string;
}[] = [
  {
    workType: 'brick_masonry',
    materialCode: 'bricks',
    ratePerSqFt: 12.5,
    notes: '~12.5 bricks per sq.ft (4.5" wall)',
  },
  {
    workType: 'brick_masonry',
    materialCode: 'cement',
    ratePerSqFt: 0.022,
    notes: 'Mortar cement bags per sq.ft',
  },
  {
    workType: 'brick_masonry',
    materialCode: 'sand',
    ratePerSqFt: 0.12,
    notes: 'Mortar sand cu.ft per sq.ft',
  },
  {
    workType: 'plaster',
    materialCode: 'cement',
    ratePerSqFt: 0.018,
    notes: 'Plaster cement bags per sq.ft',
  },
  {
    workType: 'plaster',
    materialCode: 'sand',
    ratePerSqFt: 0.08,
    notes: 'Plaster sand cu.ft per sq.ft',
  },
];

export const DEFAULT_CATALOG = [
  { code: 'bricks', name: 'Bricks', unit: 'pcs' },
  { code: 'cement', name: 'Cement', unit: 'bags' },
  { code: 'sand', name: 'Sand', unit: 'cuft' },
] as const;

const PURCHASE_ITEM_TO_CODE: Record<string, string> = {
  bricks: 'bricks',
  brick: 'bricks',
  cement: 'cement',
  sand: 'sand',
};

export function netAreaFromMeasurements(m: Measurements): number {
  if (m.netArea != null && m.netArea > 0) return round2(m.netArea);
  const gross = Math.max(0, (Number(m.length) || 0) * (Number(m.height) || 0));
  const openings = Math.max(0, Number(m.openingsArea) || 0);
  return round2(Math.max(0, gross - openings));
}

export function formulaQtyForRate(netArea: number, ratePerSqFt: number) {
  return round2(netArea * ratePerSqFt);
}

export function formulaExpectedForProgress(
  formulaQty: number,
  opts: { workDoneArea?: number; netArea?: number; progressPct?: number },
) {
  if (opts.progressPct != null && opts.progressPct > 0) {
    return round2(formulaQty * (Math.min(100, opts.progressPct) / 100));
  }
  const net = opts.netArea ?? 0;
  const done = opts.workDoneArea ?? 0;
  if (net <= 0) return 0;
  return round2(formulaQty * Math.min(1, done / net));
}

export function variancePct(actual: number, expected: number) {
  if (expected <= 0) return actual > 0 ? 100 : 0;
  return round2(((actual - expected) / expected) * 100);
}

export function isVarianceFlagged(actual: number, expected: number, threshold = VARIANCE_THRESHOLD) {
  if (expected <= 0) return actual > 0;
  return Math.abs(actual - expected) / expected > threshold;
}

export function materialCodeFromPurchaseItem(item: string): string | null {
  const key = item.trim().toLowerCase();
  if (PURCHASE_ITEM_TO_CODE[key]) return PURCHASE_ITEM_TO_CODE[key];
  for (const [k, code] of Object.entries(PURCHASE_ITEM_TO_CODE)) {
    if (key.includes(k)) return code;
  }
  return null;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function stockOnHand(delivered: number, consumed: number) {
  return round2(Math.max(0, delivered - consumed));
}

export function plannedRemaining(planned: number, consumed: number) {
  return round2(planned - consumed);
}
