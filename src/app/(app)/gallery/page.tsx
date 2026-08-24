'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppStore, usePermission } from '@/store/useAppStore';
import { formatDateTime } from '@/lib/calculations';
import { Badge, Button, Card, PageHeader, Select } from '@/components/ui';
import { ClusterTabs } from '@/components/layout/ClusterTabs';
import { CONSTRUCTION_TABS } from '@/lib/access';

export default function GalleryPage() {
  const { can } = usePermission();
  const media = useAppStore((s) => s.media);
  const units = useAppStore((s) => s.units);
  const projects = useAppStore((s) => s.projects);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const removeMedia = useAppStore((s) => s.removeMedia);

  const [kind, setKind] = useState('all');

  const list = useMemo(() => {
    let rows = [...media].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (selectedProjectId) rows = rows.filter((m) => m.projectId === selectedProjectId);
    if (kind !== 'all') rows = rows.filter((m) => m.kind === kind);
    return rows;
  }, [media, selectedProjectId, kind]);

  return (
    <div>
      <ClusterTabs items={CONSTRUCTION_TABS} />
      <PageHeader
        title="Progress photos"
        subtitle="Before / during / completed evidence linked to units and stages"
        actions={
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">All kinds</option>
            <option value="before">Before</option>
            <option value="during">During</option>
            <option value="completed">Completed</option>
            <option value="other">Other</option>
          </Select>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {list.map((m) => {
          const unit = units.find((u) => u.id === m.unitId);
          const project = projects.find((p) => p.id === m.projectId);
          return (
            <Card key={m.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.dataUrl}
                alt={m.fileName}
                style={{
                  width: '100%',
                  height: 140,
                  objectFit: 'cover',
                  borderRadius: 8,
                  background: 'var(--bg-tertiary)',
                }}
              />
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Badge tone="blue">{m.kind}</Badge>
                <Badge tone="neutral">{m.progressPercentage}%</Badge>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 550 }}>{m.workCategory}</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{m.comment}</p>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                {formatDateTime(m.createdAt)}
                <br />
                {project?.name}
                {unit ? (
                  <>
                    {' · '}
                    <Link href={`/units/${unit.id}`}>{unit.number}</Link>
                  </>
                ) : null}
                <br />
                {m.managerName}
              </div>
              {can('delete_financials') && (
                <Button
                  size="sm"
                  variant="danger"
                  style={{ marginTop: 10 }}
                  onClick={() => removeMedia(m.id)}
                >
                  Remove
                </Button>
              )}
            </Card>
          );
        })}
      </div>
      {list.length === 0 && (
        <Card title="No media">Upload progress evidence from a unit profile or Manager Portal.</Card>
      )}
    </div>
  );
}
