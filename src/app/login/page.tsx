'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { DEMO_CREDENTIALS } from '@/lib/seed';
import { ROLE_HOME } from '@/lib/access';
import type { UserRole } from '@/lib/types';
import { Button, Input } from '@/components/ui';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const login = useAppStore((s) => s.login);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  const hydrated = useAppStore((s) => s.hydrated);
  const [email, setEmail] = useState('admin@estate.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hydrated && currentUserId) {
      const role = users.find((u) => u.id === currentUserId)?.role as UserRole | undefined;
      router.replace(role ? ROLE_HOME[role] : '/dashboard');
    }
  }, [hydrated, currentUserId, users, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const id = await login(email.trim(), password);
      if (!id) {
        setError('Invalid email or password');
        setBusy(false);
        return;
      }
      const role = useAppStore.getState().users.find((u) => u.id === id)?.role;
      router.replace(role ? ROLE_HOME[role] : '/dashboard');
    } catch {
      setError('Login failed — is the database running?');
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <div className={styles.mark}>RE</div>
          <h1>Estate Progress</h1>
          <p>Role-based construction CRM — owner, site, and accounts</p>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" size="lg" className={styles.submit} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className={styles.demos}>
          <div className={styles.demosTitle}>Demo accounts — click to fill</div>
          {DEMO_CREDENTIALS.map((c) => (
            <button
              key={c.email}
              type="button"
              className={styles.demoRow}
              onClick={() => {
                setEmail(c.email);
                setPassword(c.password);
                setError('');
                setBusy(false);
              }}
            >
              <span>{c.role}</span>
              <code>
                {c.email} / {c.password}
              </code>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
