import type { Notification, Unit } from './types';
import { formatDate, formatPKR } from './calculations';
import { v4 as uuid } from 'uuid';

/** Scan units and produce rent / payment due notifications (idempotent by key). */
export function buildPaymentAlerts(
  units: Unit[],
  existing: Notification[],
  now = new Date(),
): Notification[] {
  const existingKeys = new Set(
    existing
      .filter((n) => n.type === 'rent_due' || n.type === 'rent_overdue' || n.type === 'payment_due')
      .map((n) => `${n.type}:${n.unitId}:${n.message}`),
  );

  const created: Notification[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (const unit of units) {
    if (unit.rental) {
      for (const pay of unit.rental.paymentHistory) {
        if (pay.status === 'paid') continue;
        const due = new Date(pay.dueDate);
        due.setHours(0, 0, 0, 0);
        const overdue = due.getTime() < today.getTime();
        const type = overdue ? 'rent_overdue' : 'rent_due';
        const message = overdue
          ? `${unit.number} – Monthly Rent ${formatPKR(pay.amount)} OVERDUE (was due ${formatDate(pay.dueDate)})`
          : `${unit.number} – Monthly Rent: ${formatPKR(pay.amount)} · Status: Pending · Due ${formatDate(pay.dueDate)}`;

        const key = `${type}:${unit.id}:${message}`;
        if (existingKeys.has(key)) continue;
        // also skip if same type+unit already unread recently
        const dup = existing.some(
          (n) =>
            n.unitId === unit.id &&
            (n.type === 'rent_due' || n.type === 'rent_overdue') &&
            !n.read &&
            n.message.includes(unit.number),
        );
        if (dup) continue;

        created.push({
          id: uuid(),
          type,
          title: overdue ? 'Rent Overdue' : 'Rent Due',
          message,
          projectId: unit.projectId,
          unitId: unit.id,
          read: false,
          createdAt: now.toISOString(),
        });
        existingKeys.add(key);
      }
    }

    if (unit.booking?.expectedPaymentDate && unit.booking.status === 'booked') {
      const due = new Date(unit.booking.expectedPaymentDate);
      due.setHours(0, 0, 0, 0);
      if (due.getTime() <= today.getTime() + 7 * 86400000) {
        const message = `${unit.number} – Booking balance ${formatPKR(unit.booking.remainingAmount)} due ${formatDate(unit.booking.expectedPaymentDate)}`;
        const type = 'payment_due' as const;
        const key = `${type}:${unit.id}:${message}`;
        if (!existingKeys.has(key)) {
          const dup = existing.some(
            (n) => n.unitId === unit.id && n.type === 'payment_due' && !n.read,
          );
          if (!dup) {
            created.push({
              id: uuid(),
              type,
              title: 'Payment Due',
              message,
              projectId: unit.projectId,
              unitId: unit.id,
              read: false,
              createdAt: now.toISOString(),
            });
            existingKeys.add(key);
          }
        }
      }
    }

    if (unit.sale && unit.sale.remainingAmount > 0) {
      const message = `${unit.number} – Sale balance ${formatPKR(unit.sale.remainingAmount)} outstanding (${unit.sale.buyer.name})`;
      const type = 'payment_due' as const;
      const key = `${type}:${unit.id}:sale:${message}`;
      if (!existingKeys.has(key)) {
        const dup = existing.some(
          (n) =>
            n.unitId === unit.id &&
            n.type === 'payment_due' &&
            !n.read &&
            n.message.includes('Sale balance'),
        );
        if (!dup) {
          created.push({
            id: uuid(),
            type,
            title: 'Outstanding Sale Payment',
            message,
            projectId: unit.projectId,
            unitId: unit.id,
            read: false,
            createdAt: now.toISOString(),
          });
        }
      }
    }
  }

  return created;
}
