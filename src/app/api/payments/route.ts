import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapClientPayment, mapUnit } from '@/lib/mappers';
import { remainingAmount } from '@/lib/calculations';
import type { SaleRecord } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const unitId = req.nextUrl.searchParams.get('unitId');
    const projectId = req.nextUrl.searchParams.get('projectId');
    const rows = await prisma.clientPayment.findMany({
      where: {
        ...(unitId ? { unitId } : {}),
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { date: 'desc' },
    });
    return json({ payments: rows.map(mapClientPayment) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role === 'manager') return json({ error: 'Forbidden' }, 403);
    const body = await req.json();
    const unit = await prisma.unit.findUnique({ where: { id: body.unitId } });
    if (!unit) return json({ error: 'Unit not found' }, 404);

    const payment = await prisma.clientPayment.create({
      data: {
        projectId: unit.projectId,
        unitId: unit.id,
        amount: Number(body.amount) || 0,
        date: body.date ? new Date(body.date) : new Date(),
        method: body.method || 'cash',
        remarks: body.remarks ?? '',
        kind: body.kind || 'sale',
        addedById: user.id,
        addedByName: user.name,
      },
    });

    let updatedUnit = unit;
    if ((body.kind || 'sale') === 'sale' && unit.sale) {
      const sale = unit.sale as SaleRecord;
      const amountReceived = (sale.amountReceived || 0) + payment.amount;
      const rem = remainingAmount(sale.salePrice, amountReceived);
      const paymentStatus = rem <= 0 ? 'paid' : amountReceived > 0 ? 'partial' : 'pending';
      updatedUnit = await prisma.unit.update({
        where: { id: unit.id },
        data: {
          sale: { ...sale, amountReceived, remainingAmount: rem, paymentStatus },
        },
      });
    }

    await prisma.notification.create({
      data: {
        type: 'payment_received',
        title: 'Payment Received',
        message: `${unit.number}: ${payment.amount} via ${payment.method}`,
        projectId: unit.projectId,
        unitId: unit.id,
      },
    });
    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entityType: 'payment',
      entityId: payment.id,
      newValue: String(payment.amount),
    });
    return json({ payment: mapClientPayment(payment), unit: mapUnit(updatedUnit) });
  } catch (err) {
    return handleApiError(err);
  }
}
