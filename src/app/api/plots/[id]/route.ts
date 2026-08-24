import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapPlot } from '@/lib/mappers';
import { remainingAmount } from '@/lib/calculations';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requireRole('admin');
    const { id } = await ctx.params;
    const body = await req.json();
    const prev = await prisma.plot.findUnique({ where: { id } });
    if (!prev) return json({ error: 'Not found' }, 404);
    const salePrice = body.salePrice !== undefined ? Number(body.salePrice) : prev.salePrice;
    const paymentReceived =
      body.paymentReceived !== undefined ? Number(body.paymentReceived) : prev.paymentReceived;
    const rem = remainingAmount(salePrice, paymentReceived);
    const plot = await prisma.plot.update({
      where: { id },
      data: {
        ...(body.plotNumber !== undefined ? { plotNumber: body.plotNumber } : {}),
        ...(body.size !== undefined ? { size: body.size } : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        salePrice,
        paymentReceived,
        remainingPayment: rem,
        buyerName: body.buyerName !== undefined ? body.buyerName || null : undefined,
        buyerContact: body.buyerContact !== undefined ? body.buyerContact || null : undefined,
        status:
          rem <= 0 && paymentReceived > 0
            ? 'sold_land_only'
            : body.status !== undefined
              ? body.status
              : undefined,
        saleDate: rem <= 0 && paymentReceived > 0 ? new Date() : prev.saleDate,
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
    return json({ plot: mapPlot(plot) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireRole('admin');
    const { id } = await ctx.params;
    await prisma.plot.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
