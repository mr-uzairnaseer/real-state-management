import type { ConstructionTask, Unit, UnitStatus } from './types';

/** Weighted completion: Σ(weight × progress/100) / Σ(weight) × 100 */
export function calculateWeightedProgress(
  items: { weight: number; progress: number }[],
): number {
  if (!items.length) return 0;
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight <= 0) return 0;
  const weighted = items.reduce(
    (s, i) => s + i.weight * (Math.min(100, Math.max(0, i.progress)) / 100),
    0,
  );
  return Math.round((weighted / totalWeight) * 1000) / 10;
}

export function calculateUnitProgress(
  tasks: ConstructionTask[],
  unitId: string,
): number {
  const unitTasks = tasks.filter((t) => t.unitId === unitId);
  return calculateWeightedProgress(unitTasks);
}

export function calculateProjectProgress(
  tasks: ConstructionTask[],
  projectId: string,
  units?: Unit[],
): number {
  const projectTasks = tasks.filter(
    (t) => t.projectId === projectId && !t.unitId,
  );
  if (projectTasks.length) {
    return calculateWeightedProgress(projectTasks);
  }
  if (units?.length) {
    const projectUnits = units.filter((u) => u.projectId === projectId);
    if (!projectUnits.length) return 0;
    const avg =
      projectUnits.reduce((s, u) => s + u.constructionProgress, 0) /
      projectUnits.length;
    return Math.round(avg * 10) / 10;
  }
  return 0;
}

export function calculateFloorProgress(
  units: Unit[],
  projectId: string,
  floor: string,
): number {
  const floorUnits = units.filter(
    (u) => u.projectId === projectId && u.floor === floor,
  );
  if (!floorUnits.length) return 0;
  return (
    Math.round(
      (floorUnits.reduce((s, u) => s + u.constructionProgress, 0) /
        floorUnits.length) *
        10,
    ) / 10
  );
}

export function remainingAmount(total: number, paid: number): number {
  return Math.max(0, Math.round((total - paid) * 100) / 100);
}

export function profit(
  salePrice: number,
  totalCost: number,
  additionalExpenses: number,
): number {
  return Math.round((salePrice - totalCost - additionalExpenses) * 100) / 100;
}

export function countByStatus(units: Unit[]): Record<UnitStatus | 'total', number> {
  const counts: Record<string, number> = {
    total: units.length,
    available: 0,
    sold: 0,
    rented: 0,
    reserved: 0,
    booked: 0,
    under_construction: 0,
    sold_land_only: 0,
  };
  for (const u of units) {
    counts[u.status] = (counts[u.status] ?? 0) + 1;
  }
  return counts as Record<UnitStatus | 'total', number>;
}

export function formatPKR(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function statusLabel(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
