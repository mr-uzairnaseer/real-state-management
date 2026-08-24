'use client';

import { useState } from 'react';
import { useAppStore, usePermission } from '@/store/useAppStore';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Modal,
  PageHeader,
  Select,
} from '@/components/ui';
import type { UserRole } from '@/lib/types';

export default function UsersPage() {
  const { can } = usePermission();
  const users = useAppStore((s) => s.users);
  const projects = useAppStore((s) => s.projects);
  const createUser = useAppStore((s) => s.createUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const deleteUser = useAppStore((s) => s.deleteUser);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'manager' as UserRole,
    assignedProjectIds: [] as string[],
    avatarColor: '#3e63dd',
  });

  if (!can('manage_users')) {
    return (
      <div>
        <PageHeader title="Users & Roles" />
        <Card title="Restricted">Only the project owner can manage users.</Card>
      </div>
    );
  }

  const toggleProject = (id: string) => {
    setForm((f) => ({
      ...f,
      assignedProjectIds: f.assignedProjectIds.includes(id)
        ? f.assignedProjectIds.filter((x) => x !== id)
        : [...f.assignedProjectIds, id],
    }));
  };

  return (
    <div>
      <PageHeader
        title="Users & Role-Based Access"
        subtitle="Main Admin · Manager · Accountant"
        actions={
          <Button
            onClick={() => {
              setEditId(null);
              setForm({
                name: '',
                email: '',
                password: '',
                role: 'manager',
                assignedProjectIds: [],
                avatarColor: '#30a46c',
              });
              setOpen(true);
            }}
          >
            Add user
          </Button>
        }
      />

      <Card title="Permission overview">
        <div className="resp-3col" style={{ fontSize: 12 }}>
          <div>
            <strong>Main Admin</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
              Full access to projects, financials, sales, rentals, construction, expenses, users,
              reports, settings.
            </p>
          </div>
          <div>
            <strong>Manager</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
              Assigned projects, construction progress, pictures, comments, expenses, property
              updates, manager reports.
            </p>
          </div>
          <div>
            <strong>Accountant / Staff</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
              Payments, rent, sales, expenses, financial reports.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Users">
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'projects', label: 'Assigned projects' },
            { key: 'actions', label: '' },
          ]}
          rows={users.map((u) => ({
            name: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: u.avatarColor,
                    color: '#fff',
                    display: 'inline-grid',
                    placeItems: 'center',
                    fontSize: 11,
                  }}
                >
                  {u.name.charAt(0)}
                </span>
                {u.name}
              </span>
            ),
            email: u.email,
            role: (
              <Badge tone={u.role === 'admin' ? 'blue' : u.role === 'manager' ? 'green' : 'orange'}>
                {u.role}
              </Badge>
            ),
            projects: u.assignedProjectIds
              .map((id) => projects.find((p) => p.id === id)?.name)
              .filter(Boolean)
              .join(', ') || '—',
            actions: (
              <div style={{ display: 'flex', gap: 6 }}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditId(u.id);
                    setForm({
                      name: u.name,
                      email: u.email,
                      password: u.password,
                      role: u.role,
                      assignedProjectIds: u.assignedProjectIds,
                      avatarColor: u.avatarColor,
                    });
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => deleteUser(u.id)}>
                  Delete
                </Button>
              </div>
            ),
          }))}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Edit User' : 'Add User'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
            <option value="admin">Main Admin</option>
            <option value="manager">Manager</option>
            <option value="accountant">Accountant / Staff</option>
          </Select>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Assigned projects
            </div>
            {projects.map((p) => (
              <label key={p.id} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={form.assignedProjectIds.includes(p.id)}
                  onChange={() => toggleProject(p.id)}
                />
                {p.name}
              </label>
            ))}
          </div>
          <Button
            onClick={() => {
              if (editId) {
                updateUser(editId, form);
              } else {
                createUser(form);
              }
              setOpen(false);
            }}
          >
            Save user
          </Button>
        </div>
      </Modal>
    </div>
  );
}
