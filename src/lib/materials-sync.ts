import { prisma } from '@/lib/db';
import { materialCodeFromPurchaseItem } from '@/lib/material-calc';

/** Create or refresh a delivery row when a purchase maps to a catalog material. */
export async function syncDeliveryFromPurchase(purchase: {
  id: string;
  projectId: string;
  unitId: string | null;
  item: string;
  quantity: number;
}) {
  const code = materialCodeFromPurchaseItem(purchase.item);
  if (!code) {
    await prisma.materialDelivery.deleteMany({ where: { purchaseId: purchase.id } });
    return null;
  }
  const material = await prisma.materialCatalog.findUnique({ where: { code } });
  if (!material) return null;

  return prisma.materialDelivery.upsert({
    where: { purchaseId: purchase.id },
    create: {
      projectId: purchase.projectId,
      unitId: purchase.unitId,
      materialId: material.id,
      quantity: purchase.quantity,
      purchaseId: purchase.id,
    },
    update: {
      projectId: purchase.projectId,
      unitId: purchase.unitId,
      materialId: material.id,
      quantity: purchase.quantity,
    },
  });
}

export async function deleteDeliveryForPurchase(purchaseId: string) {
  await prisma.materialDelivery.deleteMany({ where: { purchaseId } });
}

export async function computeStock(projectId: string, materialId: string, unitId?: string | null) {
  const unitFilter = unitId ? { unitId } : {};
  const [deliveredAgg, consumedAgg] = await Promise.all([
    prisma.materialDelivery.aggregate({
      where: { projectId, materialId, ...unitFilter },
      _sum: { quantity: true },
    }),
    prisma.materialConsumption.aggregate({
      where: { projectId, materialId, ...unitFilter },
      _sum: { actualQty: true },
    }),
  ]);
  const delivered = deliveredAgg._sum.quantity ?? 0;
  const consumed = consumedAgg._sum.actualQty ?? 0;
  return {
    delivered,
    consumed,
    onHand: Math.max(0, delivered - consumed),
  };
}
