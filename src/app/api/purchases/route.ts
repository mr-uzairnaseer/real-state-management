import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapPurchase, syncUnitExpenseTotal } from '@/lib/mappers';
import { saveDataUrl } from '@/lib/uploads';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const projectId = req.nextUrl.searchParams.get('projectId');
    const rows = await prisma.purchase.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { date: 'desc' },
    });
    return json({ purchases: rows.map(mapPurchase) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role === 'accountant') return json({ error: 'Forbidden' }, 403);
    const body = await req.json();
    let billUrl: string | undefined;
    let billName: string | undefined;
    if (body.billDataUrl) {
      const saved = await saveDataUrl(body.billDataUrl, body.billName || 'bill');
      billUrl = saved.url;
      billName = saved.fileName;
    }
    const quantity = Number(body.quantity) || 1;
    const unitPrice = Number(body.unitPrice) || 0;
    const totalAmount = Number(body.totalAmount) || quantity * unitPrice;

    const expense = await prisma.expense.create({
      data: {
        projectId: body.projectId,
        unitId: body.unitId || null,
        category: body.item || 'Other Expenses',
        amount: totalAmount,
        date: body.date ? new Date(body.date) : new Date(),
        description: `Purchase: ${body.item}${body.supplier ? ` from ${body.supplier}` : ''}`,
        receiptUrl: billUrl,
        receiptName: billName,
        scope: 'purchase',
        paymentMethod: body.paymentMethod || 'cash',
        remarks: body.remarks ?? '',
        addedById: user.id,
        addedByName: user.name,
      },
    });

    const purchase = await prisma.purchase.create({
      data: {
        projectId: body.projectId,
        unitId: body.unitId || null,
        date: body.date ? new Date(body.date) : new Date(),
        item: body.item,
        quantity,
        unitPrice,
        totalAmount,
        supplier: body.supplier ?? '',
        paymentMethod: body.paymentMethod || 'cash',
        billUrl,
        billName,
        remarks: body.remarks ?? '',
        expenseId: expense.id,
        addedById: user.id,
        addedByName: user.name,
      },
    });

    if (purchase.unitId) await syncUnitExpenseTotal(purchase.unitId);

    await prisma.notification.create({
      data: {
        type: 'purchase_added',
        title: 'Material Purchase',
        message: `${purchase.item} × ${purchase.quantity} — ${purchase.totalAmount}`,
        projectId: purchase.projectId,
        unitId: purchase.unitId,
      },
    });
    if (billUrl) {
      await prisma.notification.create({
        data: {
          type: 'bill_uploaded',
          title: 'Bill Uploaded',
          message: `${purchase.item} invoice from ${purchase.supplier || 'supplier'}`,
          projectId: purchase.projectId,
          unitId: purchase.unitId,
        },
      });
    }
    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entityType: 'purchase',
      entityId: purchase.id,
      newValue: `${purchase.item} ${purchase.totalAmount}`,
    });

    const { syncDeliveryFromPurchase } = await import('@/lib/materials-sync');
    await syncDeliveryFromPurchase(purchase);

    return json({ purchase: mapPurchase(purchase) });
  } catch (err) {
    return handleApiError(err);
  }
}
