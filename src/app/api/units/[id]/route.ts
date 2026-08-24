import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, requireRole, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapUnit, recalculateUnitAndGrey } from '@/lib/mappers';
import { remainingAmount, profit } from '@/lib/calculations';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const unit = await prisma.unit.findUnique({ where: { id } });
    if (!unit) return json({ error: 'Not found' }, 404);
    return json({ unit: mapUnit(unit) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json();
    const prev = await prisma.unit.findUnique({ where: { id } });
    if (!prev) return json({ error: 'Not found' }, 404);

    if (user.role === 'manager' && (body.salePrice !== undefined || body.rentalPrice !== undefined)) {
      delete body.salePrice;
      delete body.rentalPrice;
    }

    // Domain helpers via action field
    if (body._action === 'saveSale') {
      const sale = body.sale;
      const rem = remainingAmount(sale.salePrice, sale.amountReceived);
      const p = profit(sale.salePrice, sale.totalCost, sale.additionalExpenses);
      const paymentStatus =
        rem <= 0 ? 'paid' : sale.amountReceived > 0 ? 'partial' : 'pending';
      const unit = await prisma.unit.update({
        where: { id },
        data: {
          sale: { ...sale, remainingAmount: rem, profit: p, paymentStatus },
          status: 'sold',
          salePrice: sale.salePrice,
        },
      });
      await prisma.notification.create({
        data: {
          type: 'new_sale',
          title: 'Sale Updated',
          message: `Sale recorded — ${sale.buyer?.name}`,
          projectId: unit.projectId,
          unitId: id,
        },
      });
      return json({ unit: mapUnit(unit) });
    }

    if (body._action === 'saveRental') {
      const unit = await prisma.unit.update({
        where: { id },
        data: {
          rental: body.rental,
          status: 'rented',
          rentalPrice: body.rental.monthlyRent,
        },
      });
      return json({ unit: mapUnit(unit) });
    }

    if (body._action === 'saveBooking') {
      const booking = body.booking;
      const rem = remainingAmount(booking.totalPrice, booking.advanceAmount);
      const unit = await prisma.unit.update({
        where: { id },
        data: {
          booking: { ...booking, remainingAmount: rem, status: 'booked' },
          status: 'booked',
        },
      });
      await prisma.notification.create({
        data: {
          type: 'new_booking',
          title: 'New Booking',
          message: `${booking.customerName} booked ${unit.number}`,
          projectId: unit.projectId,
          unitId: id,
        },
      });
      return json({ unit: mapUnit(unit) });
    }

    if (body._action === 'recordRentPayment') {
      const rental = prev.rental as {
        paymentHistory: {
          id: string;
          amount: number;
          paidAmount: number;
          status: string;
          paidDate?: string;
        }[];
      } | null;
      if (!rental) return json({ error: 'No rental' }, 400);
      const paymentHistory = rental.paymentHistory.map((p) => {
        if (p.id !== body.paymentId) return p;
        const paidAmount = Number(body.paidAmount) || 0;
        return {
          ...p,
          paidAmount,
          paidDate: body.paidDate ?? new Date().toISOString(),
          status: paidAmount >= p.amount ? 'paid' : paidAmount > 0 ? 'partial' : p.status,
        };
      });
      const unit = await prisma.unit.update({
        where: { id },
        data: { rental: { ...rental, paymentHistory } },
      });
      return json({ unit: mapUnit(unit) });
    }

    if (body._action === 'addDocument') {
      const docs = Array.isArray(prev.documents) ? [...(prev.documents as object[])] : [];
      docs.push(body.document);
      const unit = await prisma.unit.update({
        where: { id },
        data: { documents: docs },
      });
      return json({ unit: mapUnit(unit) });
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: {
        ...(body.number !== undefined ? { number: body.number } : {}),
        ...(body.size !== undefined ? { size: body.size } : {}),
        ...(body.floor !== undefined ? { floor: body.floor } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.salePrice !== undefined ? { salePrice: Number(body.salePrice) } : {}),
        ...(body.rentalPrice !== undefined ? { rentalPrice: Number(body.rentalPrice) } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.constructionProgress !== undefined
          ? { constructionProgress: Number(body.constructionProgress) }
          : {}),
        ...(body.sale !== undefined ? { sale: body.sale } : {}),
        ...(body.rental !== undefined ? { rental: body.rental } : {}),
        ...(body.booking !== undefined ? { booking: body.booking } : {}),
        ...(body.documents !== undefined ? { documents: body.documents } : {}),
      },
    });

    if (body.status && body.status !== prev.status) {
      await writeAudit({
        userId: user.id,
        userName: user.name,
        action: 'update',
        entityType: 'unit',
        entityId: id,
        field: 'status',
        previousValue: prev.status,
        newValue: body.status,
      });
    }

    return json({ unit: mapUnit(unit) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireRole('admin');
    const { id } = await ctx.params;
    await prisma.unit.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
