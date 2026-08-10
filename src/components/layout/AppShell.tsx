'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
} from '@tabler/icons-react';
import { useAppStore, usePermission } from '@/store/useAppStore';
import { calculateProjectProgress } from '@/lib/calculations';
import styles from './shell.module.css';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: IconLayoutDashboard, roles: ['admin', 'manager', 'accountant'] },
  { href: '/projects', label: 'Projects', icon: IconBuildingSkyscraper, roles: ['admin', 'manager', 'accountant'] },
  { href: '/units', label: 'Units / Shops', icon: IconHome, roles: ['admin', 'manager', 'accountant'] },
  { href: '/construction', label: 'Construction', icon: IconHammer, roles: ['admin', 'manager'] },
  { href: '/grey-structure', label: 'Grey Structure', icon: IconWall, roles: ['admin', 'manager'] },
  { href: '/land', label: 'Land / Plots', icon: IconMap, roles: ['admin', 'manager', 'accountant'] },
  { href: '/expenses', label: 'Expenses', icon: IconReceipt, roles: ['admin', 'manager', 'accountant'] },
  { href: '/sales', label: 'Sales', icon: IconCash, roles: ['admin', 'accountant'] },
  { href: '/rentals', label: 'Rentals', icon: IconKey, roles: ['admin', 'manager', 'accountant'] },
  { href: '/bookings', label: 'Bookings', icon: IconBookmark, roles: ['admin', 'manager', 'accountant'] },
  { href: '/gallery', label: 'Gallery', icon: IconPhoto, roles: ['admin', 'manager'] },
  { href: '/reports', label: 'Reports', icon: IconChartBar, roles: ['admin', 'accountant'] },
  { href: '/manager', label: 'Manager Portal', icon: IconClipboardList, roles: ['admin', 'manager'] },
  { href: '/notifications', label: 'Notifications', icon: IconBell, roles: ['admin', 'manager', 'accountant'] },
  { href: '/users', label: 'Users & Roles', icon: IconUsers, roles: ['admin'] },
  { href: '/audit', label: 'Audit Log', icon: IconHistory, roles: ['admin'] },
  { href: '/settings', label: 'Settings', icon: IconSettings, roles: ['admin'] },
];

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

  const nav = NAV.filter((n) => role && n.roles.includes(role));

  const handleLogout = () => {
    logout();
    router.replace('/login');
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
            <div className={styles.brandTag}>Project Management</div>
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
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={18} stroke={1.5} />
                <span>{item.label}</span>
                {item.href === '/notifications' && unread > 0 && (
                  <span className={styles.navBadge}>{unread}</span>
                )}
              </Link>
            );
          })}
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
              <div className={styles.userRole}>{role}</div>
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
                <option value="">All projects</option>
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
              <span className={styles.roleText}>{role === 'admin' ? 'Main Admin' : role}</span>
            </div>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
