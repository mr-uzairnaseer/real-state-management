import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, requireRole } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapPlot } from '@/lib/mappers';
import { remainingAmount } from '@/lib/calculations';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const projectId = req.nextUrl.searchParams.get('projectId');
    const plots = await prisma.plot.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { plotNumber: 'asc' },
    });
    return json({ plots: plots.map(mapPlot) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');
    const body = await req.json();
    const price = Number(body.salePrice) || 0;
    const paid = Number(body.paymentReceived) || 0;
    const rem = remainingAmount(price, paid);
    const plot = await prisma.plot.create({
      data: {
        projectId: body.projectId,
        plotNumber: body.plotNumber,
        size: body.size ?? '',
        location: body.location ?? '',
        salePrice: price,
        buyerName: body.buyerName || null,
        buyerContact: body.buyerContact || null,
        paymentReceived: paid,
        remainingPayment: rem,
        status: rem <= 0 && paid > 0 ? 'sold_land_only' : body.status ?? 'available',
        saleDate: rem <= 0 && paid > 0 ? new Date() : null,
        notes: body.notes ?? '',
        documents: [],
      },
    });
    return json({ plot: mapPlot(plot) });
  } catch (err) {
    return handleApiError(err);
  }
}
