'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppStore, usePermission } from '@/store/useAppStore';
import {
  calculateUnitProgress,
  formatPKR,
  formatDate,
  formatDateTime,
  statusLabel,
  clientPayLabel,
} from '@/lib/calculations';
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  Select,
  Textarea,
} from '@/components/ui';
import { fileToDataUrl, taskTone, unitTone } from '@/lib/helpers';
import type { SaleRecord, RentalRecord, BookingRecord, UnitStatus, MediaKind, PaymentMethod } from '@/lib/types';
import { UNIT_STATUSES, PAYMENT_METHODS } from '@/lib/catalog';

export default function UnitDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const { can, user } = usePermission();
  const canEditUnit = can('manage_units') || can('update_unit_status') || can('edit_unit_prices');
  const showMoney = can('view_financials');
  const canSiteWrite = can('update_progress');
  const canUpload = can('upload_media');
  const unit = useAppStore((s) => s.units.find((u) => u.id === id));
  const project = useAppStore((s) => s.projects.find((p) => p.id === unit?.projectId));
  const tasks = useAppStore((s) => s.tasks.filter((t) => t.unitId === id));
  const media = useAppStore((s) => s.media.filter((m) => m.unitId === id));
  const expenses = useAppStore((s) => s.expenses.filter((e) => e.unitId === id));
  const payments = useAppStore((s) => (s.clientPayments ?? []).filter((p) => p.unitId === id));
  const addClientPayment = useAppStore((s) => s.addClientPayment);
  const updateUnit = useAppStore((s) => s.updateUnit);
  const setUnitStatus = useAppStore((s) => s.setUnitStatus);
  const saveSale = useAppStore((s) => s.saveSale);
  const saveRental = useAppStore((s) => s.saveRental);
  const saveBooking = useAppStore((s) => s.saveBooking);
  const updateTaskProgress = useAppStore((s) => s.updateTaskProgress);
  const addMedia = useAppStore((s) => s.addMedia);
  const addProgressUpdate = useAppStore((s) => s.addProgressUpdate);
  const addUnitDocument = useAppStore((s) => s.addUnitDocument);

  const [saleOpen, setSaleOpen] = useState(false);
  const [rentOpen, setRentOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    method: 'cash' as PaymentMethod,
    remarks: '',
    kind: 'sale' as 'sale' | 'rental' | 'booking',
  });

  const allTasks = useAppStore((s) => s.tasks);
  const progress = useMemo(
    () =>
      tasks.length
        ? calculateUnitProgress(allTasks, id)
        : (unit?.constructionProgress ?? 0),
    [tasks, allTasks, id, unit?.constructionProgress],
  );

  if (!unit) {
    return (
      <div>
        <PageHeader title="Unit not found" />
        <Link href="/units">Back</Link>
      </div>
    );
  }

  const before = media.filter((m) => m.kind === 'before');
  const during = media.filter((m) => m.kind === 'during');
  const completed = media.filter((m) => m.kind === 'completed');

  return (
    <div>
      <PageHeader
        title={unit.number}
        subtitle={`${project?.name ?? ''} · Floor ${unit.floor} · ${unit.size}`}
        actions={
          <>
            {canEditUnit && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            {can('record_sale') && (
              <Button variant="secondary" onClick={() => setSaleOpen(true)}>
                Sale
              </Button>
            )}
            {can('record_rental') && (
              <Button variant="secondary" onClick={() => setRentOpen(true)}>
                Rental
              </Button>
            )}
            {can('record_booking') && (
              <Button variant="secondary" onClick={() => setBookOpen(true)}>
                Booking
              </Button>
            )}
            {canUpload && (
              <Button onClick={() => setMediaOpen(true)}>Upload evidence</Button>
            )}
          </>
        }
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Badge tone={unitTone(unit.status)}>{statusLabel(unit.status)}</Badge>
        <Badge tone="blue">{progress}% complete</Badge>
        <Badge tone={progress >= 100 ? 'green' : 'orange'}>{Math.max(0, Math.round(100 - progress))}% remaining</Badge>
        <Badge>{clientPayLabel(unit)}</Badge>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        <Card title="Profile">
          <dl style={{ display: 'grid', gap: 8, fontSize: 13 }}>
            <Row k="Type" v={statusLabel(unit.type)} />
            {showMoney && (
              <>
                <Row k="Sale / rental value" v={formatPKR(unit.sale?.salePrice ?? unit.salePrice || unit.rentalPrice)} />
                <Row k="Amount received" v={formatPKR(unit.sale?.amountReceived ?? unit.booking?.advanceAmount ?? 0)} />
                <Row k="Pending amount" v={formatPKR(unit.sale?.remainingAmount ?? unit.booking?.remainingAmount ?? 0)} />
                <Row k="Construction expense" v={formatPKR(expenses.filter((e) => e.scope !== 'admin').reduce((s, e) => s + e.amount, 0) || unit.expenses)} />
                <Row k="Other expenses" v={formatPKR(expenses.filter((e) => e.scope === 'admin' || e.scope === 'daily').reduce((s, e) => s + e.amount, 0))} />
              </>
            )}
            <Row k="Client status" v={clientPayLabel(unit)} />
            <Row k="Notes" v={unit.notes || '—'} />
          </dl>
          {can('update_unit_status') && (
            <Select
              label="Change status"
              value={unit.status}
              onChange={(e) => setUnitStatus(id, e.target.value as UnitStatus)}
            >
              {UNIT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          )}
        </Card>

        <Card title="Construction Progress">
          <ProgressBar value={progress} label="Weighted unit progress" />
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks
              .sort((a, b) => a.order - b.order)
              .map((t) => (
                <div key={t.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12 }}>
                      {t.name} <Badge tone={taskTone(t.status)}>{t.weight}%</Badge>
                    </span>
                    {canSiteWrite && (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={t.progress}
                        style={{
                          width: 64,
                          height: 28,
                          border: '1px solid var(--border-color-strong)',
                          borderRadius: 6,
                          padding: '0 6px',
                        }}
                        onChange={(e) =>
                          updateTaskProgress(t.id, Number(e.target.value) || 0)
                        }
                      />
                    )}
                  </div>
                  <ProgressBar value={t.progress} showValue={false} />
                </div>
              ))}
            {tasks.length === 0 && <p style={{ color: 'var(--text-tertiary)' }}>No unit tasks</p>}
            {tasks.some((t) => t.progress < 100) && (
              <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                Remaining work:{' '}
                {tasks
                  .filter((t) => t.progress < 100)
                  .map((t) => `${t.name} (${t.progress}%)`)
                  .join(', ')}
              </p>
            )}
          </div>
        </Card>

        {showMoney && unit.sale && (
          <Card title="Sale Record">
            <dl style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <Row k="Buyer" v={`${unit.sale.buyer.name} · ${unit.sale.buyer.contact}`} />
              <Row k="Sale price" v={formatPKR(unit.sale.salePrice)} />
              <Row k="Received" v={formatPKR(unit.sale.amountReceived)} />
              <Row k="Remaining" v={formatPKR(unit.sale.remainingAmount)} />
              <Row k="Payment" v={statusLabel(unit.sale.paymentStatus)} />
              <Row k="Profit" v={formatPKR(unit.sale.profit)} />
              <Row k="Sale date" v={formatDate(unit.sale.saleDate)} />
              <Row k="Notes" v={unit.sale.notes || '—'} />
            </dl>
          </Card>
        )}

        {showMoney && unit.rental && (
          <Card title="Rental Record">
            <dl style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <Row k="Tenant" v={`${unit.rental.tenant.name} · ${unit.rental.tenant.contact}`} />
              <Row k="Monthly rent" v={formatPKR(unit.rental.monthlyRent)} />
              <Row k="Deposit" v={formatPKR(unit.rental.securityDeposit)} />
              <Row k="Start" v={formatDate(unit.rental.startDate)} />
            </dl>
            <div style={{ marginTop: 12 }}>
              {unit.rental.paymentHistory.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: 12,
                  }}
                >
                  <span>
                    {p.month} · Due {formatDate(p.dueDate)}
                  </span>
                  <Badge
                    tone={
                      p.status === 'paid'
                        ? 'green'
                        : p.status === 'overdue'
                          ? 'red'
                          : 'orange'
                    }
                  >
                    {statusLabel(p.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {showMoney && unit.booking && (
          <Card title="Booking">
            <dl style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <Row k="Customer" v={`${unit.booking.customerName} · ${unit.booking.contact}`} />
              <Row k="Total" v={formatPKR(unit.booking.totalPrice)} />
              <Row k="Advance" v={formatPKR(unit.booking.advanceAmount)} />
              <Row k="Remaining" v={formatPKR(unit.booking.remainingAmount)} />
              <Row k="Status" v={statusLabel(unit.booking.status)} />
              <Row k="Booked" v={formatDate(unit.booking.bookingDate)} />
            </dl>
          </Card>
        )}

        {showMoney && (
        <Card title="Client Payment History">
          <dl style={{ display: 'grid', gap: 8, fontSize: 13, marginBottom: 12 }}>
            <Row k="Total value" v={formatPKR(unit.sale?.salePrice ?? unit.salePrice)} />
            <Row k="Received" v={formatPKR(unit.sale?.amountReceived ?? 0)} />
            <Row k="Pending" v={formatPKR(unit.sale?.remainingAmount ?? unit.salePrice - (unit.sale?.amountReceived ?? 0))} />
          </dl>
          {payments.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                padding: '8px 0',
                borderTop: '1px solid var(--border-color)',
                fontSize: 12,
              }}
            >
              <span>
                {formatDate(p.date)} · {statusLabel(p.method)} · {p.kind}
                {p.remarks ? ` — ${p.remarks}` : ''}
              </span>
              <strong>{formatPKR(p.amount)}</strong>
            </div>
          ))}
          {payments.length === 0 && (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>No payment records yet</p>
          )}
          {can('record_client_payment') && (
            <Button size="sm" style={{ marginTop: 12 }} onClick={() => setPayOpen(true)}>
              Record payment
            </Button>
          )}
        </Card>
        )}
      </div>

      <Card title="Before → During → Completed" className="animate-fade-in">
        <div className="resp-3col">
          {[
            ['Before', before],
            ['During', during],
            ['Completed', completed],
          ].map(([label, items]) => (
            <div key={label as string}>
              <h4
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: 8,
                }}
              >
                {label as string}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(items as typeof media).map((m) => (
                  <div
                    key={m.id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.dataUrl} alt={m.fileName} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                    <div style={{ padding: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                      {m.comment}
                      <div style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>
                        {formatDateTime(m.createdAt)} · {m.managerName}
                      </div>
                    </div>
                  </div>
                ))}
                {(items as typeof media).length === 0 && (
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>No images</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Documents">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {unit.documents.map((d) => (
            <a key={d.id} href={d.dataUrl} download={d.name} style={{ fontSize: 13, color: 'var(--accent-blue)' }}>
              {d.name}
            </a>
          ))}
          {unit.documents.length === 0 && (
            <p style={{ color: 'var(--text-tertiary)' }}>No documents</p>
          )}
          {canUpload && (
            <Input
              type="file"
              label="Upload document"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const dataUrl = await fileToDataUrl(file);
                addUnitDocument(id, {
                  name: file.name,
                  dataUrl,
                  mimeType: file.type,
                });
              }}
            />
          )}
        </div>
      </Card>

      <SaleModal
        open={saleOpen}
        onClose={() => setSaleOpen(false)}
        initial={unit.sale}
        salePrice={unit.salePrice}
        onSave={(sale) => {
          saveSale(id, sale);
          setSaleOpen(false);
        }}
      />
      <RentModal
        open={rentOpen}
        onClose={() => setRentOpen(false)}
        initial={unit.rental}
        rentalPrice={unit.rentalPrice}
        onSave={(rental) => {
          saveRental(id, rental);
          setRentOpen(false);
        }}
      />
      <BookModal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        initial={unit.booking}
        salePrice={unit.salePrice}
        onSave={(booking) => {
          saveBooking(id, booking);
          setBookOpen(false);
        }}
      />
      <MediaModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSave={async (payload) => {
          const mediaIds: string[] = [];
          for (const file of payload.files) {
            const dataUrl = await fileToDataUrl(file.file);
            const mid = await addMedia({
              projectId: unit.projectId,
              unitId: id,
              kind: file.kind,
              dataUrl,
              mimeType: file.file.type,
              fileName: file.file.name,
              comment: payload.comment,
              progressPercentage: payload.progress,
              workCategory: payload.category,
              managerName: user?.name ?? 'Manager',
              managerId: user?.id ?? '',
            });
            mediaIds.push(mid);
          }
          await addProgressUpdate({
            projectId: unit.projectId,
            unitId: id,
            title: `${unit.number} — ${payload.category}`,
            comment: payload.comment,
            progressPercentage: payload.progress,
            workCategory: payload.category,
            managerId: user?.id ?? '',
            managerName: user?.name ?? 'Manager',
            mediaIds,
          });
          setMediaOpen(false);
        }}
      />
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Unit">
        <UnitEditForm
          unit={unit}
          onSave={(data) => {
            updateUnit(id, data);
            setEditOpen(false);
          }}
        />
      </Modal>
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record Client Payment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            label="Amount"
            type="number"
            value={payForm.amount}
            onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
          />
          <Input
            label="Date"
            type="date"
            value={payForm.date}
            onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
          />
          <Select
            label="Method"
            value={payForm.method}
            onChange={(e) => setPayForm({ ...payForm, method: e.target.value as PaymentMethod })}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
          <Select
            label="Applies to"
            value={payForm.kind}
            onChange={(e) => setPayForm({ ...payForm, kind: e.target.value as 'sale' | 'rental' | 'booking' })}
          >
            <option value="sale">Sale</option>
            <option value="rental">Rental</option>
            <option value="booking">Booking</option>
          </Select>
          <Textarea
            label="Remarks"
            value={payForm.remarks}
            onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })}
          />
          <Button
            onClick={() => {
              void addClientPayment({
                unitId: id,
                amount: Number(payForm.amount) || 0,
                date: new Date(payForm.date).toISOString(),
                method: payForm.method,
                remarks: payForm.remarks,
                kind: payForm.kind,
                addedById: user?.id ?? '',
                addedByName: user?.name ?? 'Admin',
              });
              setPayOpen(false);
            }}
          >
            Save payment
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <dt style={{ color: 'var(--text-tertiary)' }}>{k}</dt>
      <dd style={{ textAlign: 'right', fontWeight: 500 }}>{v}</dd>
    </div>
  );
}

function UnitEditForm({
  unit,
  onSave,
}: {
  unit: NonNullable<ReturnType<typeof useAppStore.getState>['units'][0]>;
  onSave: (data: Partial<typeof unit>) => void;
}) {
  const { can } = usePermission();
  const canPrice = can('edit_unit_prices');
  const [form, setForm] = useState({
    number: unit.number,
    size: unit.size,
    floor: unit.floor,
    salePrice: String(unit.salePrice),
    rentalPrice: String(unit.rentalPrice),
    notes: unit.notes,
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Input label="Number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
      <Input label="Size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
      <Input label="Floor" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
      {canPrice && (
        <>
          <Input label="Sale price" type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
          <Input label="Rental price" type="number" value={form.rentalPrice} onChange={(e) => setForm({ ...form, rentalPrice: e.target.value })} />
        </>
      )}
      <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <Button
        onClick={() =>
          onSave({
            number: form.number,
            size: form.size,
            floor: form.floor,
            ...(canPrice
              ? {
                  salePrice: Number(form.salePrice) || 0,
                  rentalPrice: Number(form.rentalPrice) || 0,
                }
              : {}),
            notes: form.notes,
          })
        }
      >
        Save
      </Button>
    </div>
  );
}

function SaleModal({
  open,
  onClose,
  initial,
  salePrice,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: SaleRecord;
  salePrice: number;
  onSave: (s: SaleRecord) => void;
}) {
  const [form, setForm] = useState({
    name: initial?.buyer.name ?? '',
    contact: initial?.buyer.contact ?? '',
    salePrice: String(initial?.salePrice ?? salePrice),
    advancePayment: String(initial?.advancePayment ?? ''),
    amountReceived: String(initial?.amountReceived ?? ''),
    totalCost: String(initial?.totalCost ?? ''),
    additionalExpenses: String(initial?.additionalExpenses ?? '0'),
    saleDate: initial?.saleDate?.slice(0, 10) ?? '',
    bookingDate: initial?.bookingDate?.slice(0, 10) ?? '',
    notes: initial?.notes ?? '',
  });

  return (
    <Modal open={open} onClose={onClose} title="Sold Property" wide>
      <div className="resp-form-2">
        <Input label="Buyer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        <Input label="Sale price" type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
        <Input label="Advance" type="number" value={form.advancePayment} onChange={(e) => setForm({ ...form, advancePayment: e.target.value })} />
        <Input label="Amount received" type="number" value={form.amountReceived} onChange={(e) => setForm({ ...form, amountReceived: e.target.value })} />
        <Input label="Total cost" type="number" value={form.totalCost} onChange={(e) => setForm({ ...form, totalCost: e.target.value })} />
        <Input label="Additional expenses" type="number" value={form.additionalExpenses} onChange={(e) => setForm({ ...form, additionalExpenses: e.target.value })} />
        <Input label="Sale date" type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />
        <Input label="Booking date" type="date" value={form.bookingDate} onChange={(e) => setForm({ ...form, bookingDate: e.target.value })} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <Button
          onClick={() => {
            const sp = Number(form.salePrice) || 0;
            const received = Number(form.amountReceived) || 0;
            onSave({
              buyer: { name: form.name, contact: form.contact },
              salePrice: sp,
              advancePayment: Number(form.advancePayment) || 0,
              amountReceived: received,
              remainingAmount: Math.max(0, sp - received),
              paymentStatus: received >= sp ? 'paid' : received > 0 ? 'partial' : 'pending',
              additionalExpenses: Number(form.additionalExpenses) || 0,
              totalCost: Number(form.totalCost) || 0,
              profit: 0,
              documents: initial?.documents ?? [],
              notes: form.notes,
              saleDate: form.saleDate ? new Date(form.saleDate).toISOString() : undefined,
              bookingDate: form.bookingDate ? new Date(form.bookingDate).toISOString() : undefined,
            });
          }}
        >
          Save sale
        </Button>
      </div>
    </Modal>
  );
}

function RentModal({
  open,
  onClose,
  initial,
  rentalPrice,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: RentalRecord;
  rentalPrice: number;
  onSave: (r: RentalRecord) => void;
}) {
  const [form, setForm] = useState({
    name: initial?.tenant.name ?? '',
    contact: initial?.tenant.contact ?? '',
    monthlyRent: String(initial?.monthlyRent ?? rentalPrice),
    securityDeposit: String(initial?.securityDeposit ?? ''),
    advancePayment: String(initial?.advancePayment ?? ''),
    startDate: initial?.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    contractNotes: initial?.contractNotes ?? '',
  });

  return (
    <Modal open={open} onClose={onClose} title="Rental Property">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Tenant name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        <Input label="Monthly rent" type="number" value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} />
        <Input label="Security deposit" type="number" value={form.securityDeposit} onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })} />
        <Input label="Advance" type="number" value={form.advancePayment} onChange={(e) => setForm({ ...form, advancePayment: e.target.value })} />
        <Input label="Start date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <Textarea label="Contract notes" value={form.contractNotes} onChange={(e) => setForm({ ...form, contractNotes: e.target.value })} />
        <Button
          onClick={() => {
            const rent = Number(form.monthlyRent) || 0;
            const due = new Date();
            due.setDate(5);
            onSave({
              tenant: { name: form.name, contact: form.contact },
              monthlyRent: rent,
              securityDeposit: Number(form.securityDeposit) || 0,
              advancePayment: Number(form.advancePayment) || 0,
              startDate: new Date(form.startDate).toISOString(),
              contractNotes: form.contractNotes,
              paymentHistory: initial?.paymentHistory?.length
                ? initial.paymentHistory
                : [
                    {
                      id: crypto.randomUUID(),
                      month: new Date().toISOString().slice(0, 7),
                      amount: rent,
                      paidAmount: 0,
                      dueDate: due.toISOString(),
                      status: 'pending',
                    },
                  ],
            });
          }}
        >
          Save rental
        </Button>
      </div>
    </Modal>
  );
}

function BookModal({
  open,
  onClose,
  initial,
  salePrice,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: BookingRecord;
  salePrice: number;
  onSave: (b: BookingRecord) => void;
}) {
  const [form, setForm] = useState({
    customerName: initial?.customerName ?? '',
    contact: initial?.contact ?? '',
    totalPrice: String(initial?.totalPrice ?? salePrice),
    advanceAmount: String(initial?.advanceAmount ?? ''),
    expectedPaymentDate: initial?.expectedPaymentDate?.slice(0, 10) ?? '',
    notes: initial?.notes ?? '',
  });

  return (
    <Modal open={open} onClose={onClose} title="New Booking">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
        <Input label="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        <Input label="Total price" type="number" value={form.totalPrice} onChange={(e) => setForm({ ...form, totalPrice: e.target.value })} />
        <Input label="Advance / booking amount" type="number" value={form.advanceAmount} onChange={(e) => setForm({ ...form, advanceAmount: e.target.value })} />
        <Input label="Expected payment date" type="date" value={form.expectedPaymentDate} onChange={(e) => setForm({ ...form, expectedPaymentDate: e.target.value })} />
        <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <Button
          onClick={() => {
            const total = Number(form.totalPrice) || 0;
            const advance = Number(form.advanceAmount) || 0;
            onSave({
              customerName: form.customerName,
              contact: form.contact,
              totalPrice: total,
              advanceAmount: advance,
              remainingAmount: Math.max(0, total - advance),
              bookingDate: new Date().toISOString(),
              expectedPaymentDate: form.expectedPaymentDate
                ? new Date(form.expectedPaymentDate).toISOString()
                : undefined,
              status: 'booked',
              paymentSchedule: [],
              notes: form.notes,
            });
          }}
        >
          Save booking
        </Button>
      </div>
    </Modal>
  );
}

function MediaModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (payload: {
    comment: string;
    category: string;
    progress: number;
    files: { kind: MediaKind; file: File }[];
  }) => void;
}) {
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('Paint Work');
  const [progress, setProgress] = useState('100');
  const [before, setBefore] = useState<File | null>(null);
  const [during, setDuring] = useState<File | null>(null);
  const [done, setDone] = useState<File | null>(null);

  return (
    <Modal open={open} onClose={onClose} title="Progress Evidence Upload" wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Work category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <Input label="Progress %" type="number" value={progress} onChange={(e) => setProgress(e.target.value)} />
        <Textarea label="Comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Paint work has been completed..." />
        <Input label="Before picture" type="file" accept="image/*,video/*" onChange={(e) => setBefore(e.target.files?.[0] ?? null)} />
        <Input label="During-work picture" type="file" accept="image/*,video/*" onChange={(e) => setDuring(e.target.files?.[0] ?? null)} />
        <Input label="Completed picture" type="file" accept="image/*,video/*" onChange={(e) => setDone(e.target.files?.[0] ?? null)} />
        <Button
          onClick={() => {
            const files: { kind: MediaKind; file: File }[] = [];
            if (before) files.push({ kind: 'before', file: before });
            if (during) files.push({ kind: 'during', file: during });
            if (done) files.push({ kind: 'completed', file: done });
            onSave({
              comment,
              category,
              progress: Number(progress) || 0,
              files,
            });
          }}
        >
          Save update
        </Button>
      </div>
    </Modal>
  );
}
