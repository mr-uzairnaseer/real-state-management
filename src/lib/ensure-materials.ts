import type { PrismaClient } from '@prisma/client';
import { DEFAULT_CATALOG, DEFAULT_FORMULA_RATES, materialCodeFromPurchaseItem } from './material-calc';

/** Idempotent: ensure bricks/cement/sand + global formulas exist. */
export async function ensureMaterialCatalog(client: PrismaClient) {
  for (const item of DEFAULT_CATALOG) {
    await client.materialCatalog.upsert({
      where: { code: item.code },
      create: { code: item.code, name: item.name, unit: item.unit, active: true },
      update: { name: item.name, unit: item.unit, active: true },
    });
  }

  const catalog = await client.materialCatalog.findMany();
  const byCode = Object.fromEntries(catalog.map((c) => [c.code, c.id]));

  for (const rate of DEFAULT_FORMULA_RATES) {
    const materialId = byCode[rate.materialCode];
    if (!materialId) continue;
    const existing = await client.materialFormula.findFirst({
      where: { projectId: null, workType: rate.workType, materialId },
    });
    if (existing) {
      await client.materialFormula.update({
        where: { id: existing.id },
        data: { ratePerSqFt: rate.ratePerSqFt, notes: rate.notes },
      });
    } else {
      await client.materialFormula.create({
        data: {
          projectId: null,
          workType: rate.workType,
          materialId,
          ratePerSqFt: rate.ratePerSqFt,
          notes: rate.notes,
        },
      });
    }
  }

  const purchases = await client.purchase.findMany();
  for (const p of purchases) {
    const code = materialCodeFromPurchaseItem(p.item);
    if (!code) continue;
    const materialId = byCode[code];
    if (!materialId) continue;
    await client.materialDelivery.upsert({
      where: { purchaseId: p.id },
      create: {
        projectId: p.projectId,
        unitId: p.unitId,
        materialId,
        quantity: p.quantity,
        purchaseId: p.id,
      },
      update: {
        quantity: p.quantity,
        materialId,
        unitId: p.unitId,
      },
    });
  }
}
