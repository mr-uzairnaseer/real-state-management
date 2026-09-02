'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppStore, usePermission } from '@/store/useAppStore';
import {
  formulaQtyForRate,
  netAreaFromMeasurements,
  WORK_TYPES,
  type Measurements,
} from '@/lib/material-calc';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Modal,
  PageHeader,
  Select,
  Stat,
  Textarea,
} from '@/components/ui';
import { fileToDataUrl } from '@/lib/helpers';
import { formatDateTime } from '@/lib/calculations';

type Tab = 'stock' | 'estimates' | 'usage' | 'requests';

export default function MaterialsPage() {
  const { can } = usePermission();
  const projects = useAppStore((s) => s.projects);
  const units = useAppStore((s) => s.units);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const catalog = useAppStore((s) => s.materialCatalog ?? []);
  const formulas = useAppStore((s) => s.materialFormulas ?? []);
  const estimates = useAppStore((s) => s.materialEstimates ?? []);
  const deliveries = useAppStore((s) => s.materialDeliveries ?? []);
  const consumptions = useAppStore((s) => s.materialConsumptions ?? []);
  const requests = useAppStore((s) => s.materialRequests ?? []);
  const createEstimate = useAppStore((s) => s.createMaterialEstimate);
  const deleteEstimate = useAppStore((s) => s.deleteMaterialEstimate);
  const addConsumption = useAppStore((s) => s.addMaterialConsumption);
  const createRequest = useAppStore((s) => s.createMaterialRequest);
  const decideRequest = useAppStore((s) => s.decideMaterialRequest);

  const projectId = selectedProjectId ?? projects[0]?.id ?? '';
  const projectUnits = units.filter((u) => u.projectId === projectId);

  const [tab, setTab] = useState<Tab>('stock');
  const [estOpen, setEstOpen] = useState(false);
  const [useOpen, setUseOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);

  const [estForm, setEstForm] = useState({
    unitId: '',
    workType: 'brick_masonry',
    length: '',
    height: '',
    openingsArea: '',
    notes: '',
    overrides: {} as Record<string, string>,
  });

  const [useForm, setUseForm] = useState({
    estimateId: '',
    materialId: '',
    unitId: '',
    workDoneArea: '',
    progressPct: '',
    actualQty: '',
    remarks: '',
    photoDataUrl: '',
    photoName: '',
  });

  const [reqForm, setReqForm] = useState({
    materialId: '',
    unitId: '',
    qtyRequested: '',
    reason: '',
  });

  const scopedEstimates = useMemo(
    () => estimates.filter((e) => e.projectId === projectId),
    [estimates, projectId],
  );
  const scopedConsumptions = useMemo(
    () => consumptions.filter((c) => c.projectId === projectId),
    [consumptions, projectId],
  );
  const scopedRequests = useMemo(
    () => requests.filter((r) => r.projectId === projectId),
    [requests, projectId],
  );

  const stockRows = useMemo(() => {
    return catalog.map((m) => {
      const delivered = deliveries
        .filter((d) => d.projectId === projectId && d.materialId === m.id)
        .reduce((s, d) => s + d.quantity, 0);
      const consumed = consumptions
        .filter((c) => c.projectId === projectId && c.materialId === m.id)
        .reduce((s, c) => s + c.actualQty, 0);
      const planned = estimates
        .filter((e) => e.projectId === projectId && e.status === 'active')
        .flatMap((e) => e.lines)
        .filter((l) => l.materialId === m.id)
        .reduce((s, l) => s + l.plannedQty, 0);
      return {
        materialId: m.id,
        name: m.name,
        unit: m.unit,
        delivered,
        consumed,
        onHand: Math.max(0, delivered - consumed),
        planned,
        plannedRemaining: planned - consumed,
      };
    });
  }, [catalog, deliveries, consumptions, estimates, projectId]);

  const previewLines = useMemo(() => {
    const m: Measurements = {
      length: Number(estForm.length) || 0,
      height: Number(estForm.height) || 0,
      openingsArea: Number(estForm.openingsArea) || 0,
    };
    const net = netAreaFromMeasurements(m);
    const rates = formulas.filter(
      (f) => f.workType === estForm.workType && (!f.projectId || f.projectId === projectId),
    );
    const byMat = new Map<string, (typeof rates)[0]>();
    for (const f of rates) {
      if (f.projectId === projectId) byMat.set(f.materialId, f);
      else if (!byMat.has(f.materialId)) byMat.set(f.materialId, f);
    }
    return Array.from(byMat.values()).map((f) => {
      const mat = catalog.find((c) => c.id === f.materialId);
      const formulaQty = formulaQtyForRate(net, f.ratePerSqFt);
      const override = estForm.overrides[f.materialId];
      return {
        materialId: f.materialId,
        name: mat?.name ?? f.materialId,
        unit: mat?.unit ?? '',
        formulaQty,
        plannedQty: override != null && override !== '' ? Number(override) : formulaQty,
      };
    });
  }, [estForm, formulas, catalog, projectId]);

  const materialName = (id: string) => catalog.find((c) => c.id === id)?.name ?? id;
  const unitName = (id?: string) =>
    id ? units.find((u) => u.id === id)?.number ?? '—' : 'Project';

  const submitEstimate = async () => {
    if (!projectId) return;
    const plannedOverrides: Record<string, number> = {};
    for (const line of previewLines) {
      if (estForm.overrides[line.materialId] != null && estForm.overrides[line.materialId] !== '') {
        plannedOverrides[line.materialId] = Number(estForm.overrides[line.materialId]);
      }
    }
    await createEstimate({
      projectId,
      unitId: estForm.unitId || undefined,
      workType: estForm.workType,
      measurements: {
        length: Number(estForm.length) || 0,
        height: Number(estForm.height) || 0,
        openingsArea: Number(estForm.openingsArea) || 0,
      },
      plannedOverrides,
      notes: estForm.notes,
    });
    setEstOpen(false);
  };

  const submitUsage = async () => {
    if (!projectId || !useForm.materialId || !useForm.actualQty) return;
    await addConsumption({
      projectId,
      unitId: useForm.unitId || undefined,
      materialId: useForm.materialId,
      estimateId: useForm.estimateId || undefined,
      workDoneArea: Number(useForm.workDoneArea) || 0,
      progressPct: Number(useForm.progressPct) || 0,
      actualQty: Number(useForm.actualQty) || 0,
      remarks: useForm.remarks,
      photoDataUrl: useForm.photoDataUrl || undefined,
      photoName: useForm.photoName || undefined,
    });
    setUseOpen(false);
    setUseForm({
      estimateId: '',
      materialId: '',
      unitId: '',
      workDoneArea: '',
      progressPct: '',
      actualQty: '',
      remarks: '',
      photoDataUrl: '',
      photoName: '',
    });
  };

  const submitRequest = async () => {
    if (!projectId || !reqForm.materialId || !reqForm.qtyRequested) return;
    await createRequest({
      projectId,
      unitId: reqForm.unitId || undefined,
      materialId: reqForm.materialId,
      qtyRequested: Number(reqForm.qtyRequested) || 0,
      reason: reqForm.reason,
    });
    setReqOpen(false);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'stock', label: 'Stock' },
    { id: 'estimates', label: 'Estimates' },
    { id: 'usage', label: 'Usage' },
    { id: 'requests', label: 'Requests' },
  ];

  if (!can('view_material_stock')) {
    return (
      <div>
        <PageHeader title="Materials" />
        <Card title="Restricted">Materials are not part of your workspace.</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Materials"
        subtitle="Formula estimates · on-site stock · usage vs expected · requests"
        actions={
          <>
            {can('record_material_usage') && (
              <Button variant="secondary" onClick={() => setUseOpen(true)}>
                Log usage
              </Button>
            )}
            {can('request_materials') && (
              <Button variant="secondary" onClick={() => setReqOpen(true)}>
                Request material
              </Button>
            )}
            {can('manage_material_plans') && (
              <Button onClick={() => setEstOpen(true)}>New estimate</Button>
            )}
          </>
        }
      />

      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 16,
          padding: 4,
          background: 'var(--bg-tertiary)',
          borderRadius: 10,
          width: 'fit-content',
          flexWrap: 'wrap',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 450,
              background: tab === t.id ? 'var(--bg-primary)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {stockRows.map((r) => (
              <Stat
                key={r.materialId}
                label={`${r.name} on hand`}
                value={`${r.onHand} ${r.unit}`}
                tone={r.onHand <= 0 ? 'orange' : 'green'}
              />
            ))}
          </div>
          <Card title="Project warehouse">
            <DataTable
              columns={[
                { key: 'name', label: 'Material' },
                { key: 'delivered', label: 'Delivered' },
                { key: 'consumed', label: 'Used' },
                { key: 'onHand', label: 'On hand' },
                { key: 'planned', label: 'Planned BOQ' },
                { key: 'remaining', label: 'Plan left' },
              ]}
              rows={stockRows.map((r) => ({
                name: `${r.name} (${r.unit})`,
                delivered: r.delivered,
                consumed: r.consumed,
                onHand: r.onHand,
                planned: r.planned,
                remaining: r.plannedRemaining,
              }))}
            />
            <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)' }}>
              Deliveries come from Purchases (Bricks / Cement / Sand). Record purchases to increase
              stock.
            </p>
          </Card>
        </>
      )}

      {tab === 'estimates' && (
        <Card title="Active estimates">
          <DataTable
            columns={[
              { key: 'unit', label: 'Unit' },
              { key: 'work', label: 'Work' },
              { key: 'area', label: 'Net area' },
              { key: 'lines', label: 'Materials' },
              { key: 'actions', label: '' },
            ]}
            rows={scopedEstimates.map((e) => ({
              unit: e.unitId ? (
                <Link href={`/units/${e.unitId}`}>{unitName(e.unitId)}</Link>
              ) : (
                'Project'
              ),
              work: WORK_TYPES.find((w) => w.value === e.workType)?.label ?? e.workType,
              area: `${e.measurements?.netArea ?? netAreaFromMeasurements(e.measurements)} sq.ft`,
              lines: e.lines
                .map(
                  (l) =>
                    `${materialName(l.materialId)}: plan ${l.plannedQty} (formula ${l.formulaQty})`,
                )
                .join(' · '),
              actions: can('manage_material_plans') ? (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (confirm('Delete estimate?')) void deleteEstimate(e.id);
                  }}
                >
                  Delete
                </Button>
              ) : null,
            }))}
          />
        </Card>
      )}

      {tab === 'usage' && (
        <Card title="Usage log">
          <DataTable
            columns={[
              { key: 'when', label: 'When' },
              { key: 'material', label: 'Material' },
              { key: 'unit', label: 'Unit' },
              { key: 'actual', label: 'Actual' },
              { key: 'expected', label: 'Expected' },
              { key: 'var', label: 'Variance' },
              { key: 'by', label: 'By' },
            ]}
            rows={scopedConsumptions.map((c) => ({
              when: formatDateTime(c.createdAt),
              material: materialName(c.materialId),
              unit: unitName(c.unitId),
              actual: c.actualQty,
              expected: c.formulaExpectedQty,
              var: (
                <Badge tone={c.flagged ? 'red' : 'green'}>
                  {c.variancePct}%{c.flagged ? ' flagged' : ''}
                </Badge>
              ),
              by: c.reportedByName,
            }))}
          />
        </Card>
      )}

      {tab === 'requests' && (
        <Card title="Material requests">
          <DataTable
            columns={[
              { key: 'when', label: 'When' },
              { key: 'material', label: 'Material' },
              { key: 'qty', label: 'Qty' },
              { key: 'stock', label: 'Stock then' },
              { key: 'expect', label: 'Expected left' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: '' },
            ]}
            rows={scopedRequests.map((r) => ({
              when: formatDateTime(r.createdAt),
              material: materialName(r.materialId),
              qty: r.qtyRequested,
              stock: r.stockAtRequest,
              expect: r.expectedRemaining,
              status: (
                <Badge
                  tone={
                    r.status === 'approved'
                      ? 'green'
                      : r.status === 'rejected'
                        ? 'red'
                        : r.warnHigh
                          ? 'orange'
                          : 'blue'
                  }
                >
                  {r.status}
                  {r.warnHigh && r.status === 'pending' ? ' · high' : ''}
                </Badge>
              ),
              actions:
                can('manage_material_plans') && r.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" onClick={() => void decideRequest(r.id, 'approved')}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void decideRequest(r.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null,
            }))}
          />
        </Card>
      )}

      <Modal open={estOpen} onClose={() => setEstOpen(false)} title="New material estimate">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select
            label="Unit (optional)"
            value={estForm.unitId}
            onChange={(e) => setEstForm({ ...estForm, unitId: e.target.value })}
          >
            <option value="">Project-level</option>
            {projectUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.number}
              </option>
            ))}
          </Select>
          <Select
            label="Work type"
            value={estForm.workType}
            onChange={(e) => setEstForm({ ...estForm, workType: e.target.value, overrides: {} })}
          >
            {WORK_TYPES.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </Select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Input
              label="Length (ft)"
              type="number"
              value={estForm.length}
              onChange={(e) => setEstForm({ ...estForm, length: e.target.value })}
            />
            <Input
              label="Height (ft)"
              type="number"
              value={estForm.height}
              onChange={(e) => setEstForm({ ...estForm, height: e.target.value })}
            />
            <Input
              label="Openings (sq.ft)"
              type="number"
              value={estForm.openingsArea}
              onChange={(e) => setEstForm({ ...estForm, openingsArea: e.target.value })}
            />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Net area:{' '}
            <strong>
              {netAreaFromMeasurements({
                length: Number(estForm.length) || 0,
                height: Number(estForm.height) || 0,
                openingsArea: Number(estForm.openingsArea) || 0,
              })}{' '}
              sq.ft
            </strong>
          </p>
          {previewLines.map((line) => (
            <div key={line.materialId} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ fontSize: 13 }}>
                {line.name} — formula <strong>{line.formulaQty}</strong> {line.unit}
              </div>
              <Input
                label="Planned BOQ override"
                type="number"
                value={estForm.overrides[line.materialId] ?? ''}
                placeholder={String(line.formulaQty)}
                onChange={(e) =>
                  setEstForm({
                    ...estForm,
                    overrides: { ...estForm.overrides, [line.materialId]: e.target.value },
                  })
                }
              />
            </div>
          ))}
          <Textarea
            label="Notes"
            value={estForm.notes}
            onChange={(e) => setEstForm({ ...estForm, notes: e.target.value })}
          />
          <Button onClick={() => void submitEstimate()}>Save estimate</Button>
        </div>
      </Modal>

      <Modal open={useOpen} onClose={() => setUseOpen(false)} title="Log material usage">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select
            label="Estimate (optional)"
            value={useForm.estimateId}
            onChange={(e) => {
              const est = scopedEstimates.find((x) => x.id === e.target.value);
              setUseForm({
                ...useForm,
                estimateId: e.target.value,
                unitId: est?.unitId ?? useForm.unitId,
                materialId: est?.lines[0]?.materialId ?? useForm.materialId,
              });
            }}
          >
            <option value="">None</option>
            {scopedEstimates.map((e) => (
              <option key={e.id} value={e.id}>
                {unitName(e.unitId)} · {e.workType}
              </option>
            ))}
          </Select>
          <Select
            label="Unit"
            value={useForm.unitId}
            onChange={(e) => setUseForm({ ...useForm, unitId: e.target.value })}
          >
            <option value="">Project / unallocated</option>
            {projectUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.number}
              </option>
            ))}
          </Select>
          <Select
            label="Material"
            value={useForm.materialId}
            onChange={(e) => setUseForm({ ...useForm, materialId: e.target.value })}
          >
            <option value="">Select</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.unit})
              </option>
            ))}
          </Select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Input
              label="Work done (sq.ft)"
              type="number"
              value={useForm.workDoneArea}
              onChange={(e) => setUseForm({ ...useForm, workDoneArea: e.target.value })}
            />
            <Input
              label="Or progress %"
              type="number"
              value={useForm.progressPct}
              onChange={(e) => setUseForm({ ...useForm, progressPct: e.target.value })}
            />
          </div>
          <Input
            label="Actual quantity used"
            type="number"
            value={useForm.actualQty}
            onChange={(e) => setUseForm({ ...useForm, actualQty: e.target.value })}
          />
          <Textarea
            label="Remarks"
            value={useForm.remarks}
            onChange={(e) => setUseForm({ ...useForm, remarks: e.target.value })}
          />
          <Input
            type="file"
            label="Site photo"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const dataUrl = await fileToDataUrl(file);
              setUseForm({ ...useForm, photoDataUrl: dataUrl, photoName: file.name });
            }}
          />
          <Button onClick={() => void submitUsage()}>Submit usage</Button>
        </div>
      </Modal>

      <Modal open={reqOpen} onClose={() => setReqOpen(false)} title="Request more material">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select
            label="Material"
            value={reqForm.materialId}
            onChange={(e) => setReqForm({ ...reqForm, materialId: e.target.value })}
          >
            <option value="">Select</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Unit (optional)"
            value={reqForm.unitId}
            onChange={(e) => setReqForm({ ...reqForm, unitId: e.target.value })}
          >
            <option value="">Project</option>
            {projectUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.number}
              </option>
            ))}
          </Select>
          {reqForm.materialId && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              On hand:{' '}
              <strong>
                {stockRows.find((s) => s.materialId === reqForm.materialId)?.onHand ?? 0}
              </strong>
              {' · '}
              Plan left:{' '}
              <strong>
                {stockRows.find((s) => s.materialId === reqForm.materialId)?.plannedRemaining ?? 0}
              </strong>
            </p>
          )}
          <Input
            label="Quantity requested"
            type="number"
            value={reqForm.qtyRequested}
            onChange={(e) => setReqForm({ ...reqForm, qtyRequested: e.target.value })}
          />
          <Textarea
            label="Reason"
            value={reqForm.reason}
            onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
          />
          <Button onClick={() => void submitRequest()}>Submit request</Button>
        </div>
      </Modal>
    </div>
  );
}
