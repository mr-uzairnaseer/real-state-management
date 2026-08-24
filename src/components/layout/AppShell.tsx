'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ComponentType } from 'react';
import {
  IconLayoutDashboard,
  IconBuildingSkyscraper,
  IconHome,
  IconHammer,
  IconWall,
  IconMap,
  IconReceipt,
  IconCash,
  IconKey,
  IconBookmark,
  IconPhoto,
  IconChartBar,
  IconBell,
  IconUsers,
  IconHistory,
  IconSettings,
  IconLogout,
  IconUserCircle,
  IconClipboardList,
  IconMenu2,
  IconX,
  IconShoppingCart,
  IconUsersGroup,
  IconRoad,
} from '@tabler/icons-react';
import { useAppStore, usePermission } from '@/store/useAppStore';
import { calculateProjectProgress } from '@/lib/calculations';
import { ROLE_LABEL, visibleNav, type NavIcon } from '@/lib/access';
import { RouteGuard } from './RouteGuard';
import styles from './shell.module.css';

const ICONS: Record<NavIcon, ComponentType<{ size?: number; stroke?: number }>> = {
  dashboard: IconLayoutDashboard,
  projects: IconBuildingSkyscraper,
  units: IconHome,
  areas: IconRoad,
  land: IconMap,
  construction: IconHammer,
  grey: IconWall,
  photos: IconPhoto,
  log: IconClipboardList,
  attendance: IconUsersGroup,
  purchases: IconShoppingCart,
  expenses: IconReceipt,
  sales: IconCash,
  rentals: IconKey,
  bookings: IconBookmark,
  reports: IconChartBar,
  users: IconUsers,
  audit: IconHistory,
  settings: IconSettings,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role } = usePermission();
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const units = useAppStore((s) => s.units);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const setSelectedProject = useAppStore((s) => s.setSelectedProject);
  const logout = useAppStore((s) => s.logout);
  const notifications = useAppStore((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;
  const [menuOpen, setMenuOpen] = useState(false);
  const groups = visibleNav(role);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const visibleProjects =
    role === 'admin' || role === 'accountant'
      ? projects
      : projects.filter((p) => user?.assignedProjectIds.includes(p.id));

  useEffect(() => {
    if (role !== 'manager' || !visibleProjects.length) return;
    if (!selectedProjectId || !visibleProjects.some((p) => p.id === selectedProjectId)) {
      setSelectedProject(visibleProjects[0].id);
    }
  }, [role, visibleProjects, selectedProjectId, setSelectedProject]);

  const handleLogout = () => {
    void logout().then(() => router.replace('/login'));
  };

  return (
    <div className={styles.shell}>
      {menuOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>RE</div>
          <div>
            <div className={styles.brandName}>Estate Progress</div>
            <div className={styles.brandTag}>{role ? ROLE_LABEL[role] : 'Workspace'}</div>
          </div>
          <button
            type="button"
            className={styles.closeMenu}
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <IconX size={18} stroke={1.5} />
          </button>
        </div>

        <nav className={styles.nav}>
          {groups.map((group) => (
            <div key={group.id} className={styles.navGroup}>
              <div className={styles.navGroupLabel}>{group.label}</div>
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={`${group.id}-${item.href}`}
                    href={item.href}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon size={18} stroke={1.5} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userChip}>
            <span
              className={styles.avatar}
              style={{ background: user?.avatarColor ?? '#999' }}
            >
              {user?.name?.charAt(0) ?? '?'}
            </span>
            <div className={styles.userMeta}>
              <div className={styles.userName}>{user?.name}</div>
              <div className={styles.userRole}>{role ? ROLE_LABEL[role] : ''}</div>
            </div>
          </div>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            <IconLogout size={16} stroke={1.5} />
            Sign out
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              type="button"
              className={styles.menuBtn}
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <IconMenu2 size={20} stroke={1.5} />
            </button>
            <div className={styles.projectSwitcher}>
              <label htmlFor="project-select">Project</label>
              <select
                id="project-select"
                value={selectedProjectId ?? ''}
                onChange={(e) => setSelectedProject(e.target.value || null)}
              >
                {role === 'manager' ? null : <option value="">All projects</option>}
                {visibleProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {calculateProjectProgress(tasks, p.id, units)}%
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.topbarRight}>
            <Link href="/notifications" className={styles.iconBtn} title="Notifications">
              <IconBell size={18} stroke={1.5} />
              {unread > 0 && <span className={styles.dot} />}
            </Link>
            <div className={styles.rolePill}>
              <IconUserCircle size={16} stroke={1.5} />
              <span className={styles.roleText}>{role ? ROLE_LABEL[role] : ''}</span>
            </div>
          </div>
        </header>
        <main className={styles.content}>
          <RouteGuard>{children}</RouteGuard>
        </main>
      </div>
    </div>
  );
}
