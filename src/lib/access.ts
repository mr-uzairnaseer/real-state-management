import type { UserRole } from './types';

export type Capability =
  | 'view_dashboard'
  | 'view_projects'
  | 'manage_projects'
  | 'view_units'
  | 'manage_units'
  | 'update_unit_status'
  | 'edit_unit_prices'
  | 'record_sale'
  | 'record_rental'
  | 'record_booking'
  | 'record_client_payment'
  | 'view_financials'
  | 'view_sales_ledger'
  | 'view_construction'
  | 'update_progress'
  | 'upload_media'
  | 'add_expenses'
  | 'edit_expenses'
  | 'delete_financials'
  | 'add_purchases'
  | 'record_attendance'
  | 'submit_site_report'
  | 'view_site_reports'
  | 'view_financial_reports'
  | 'manage_users'
  | 'manage_settings'
  | 'view_audit';

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Project Owner',
  manager: 'Site Manager',
  accountant: 'Accounts',
};

export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/dashboard',
  manager: '/dashboard',
  accountant: '/dashboard',
};

const ADMIN_CAPS: Capability[] = [
  'view_dashboard',
  'view_projects',
  'manage_projects',
  'view_units',
  'manage_units',
  'update_unit_status',
  'edit_unit_prices',
  'record_sale',
  'record_rental',
  'record_booking',
  'record_client_payment',
  'view_financials',
  'view_sales_ledger',
  'view_construction',
  'update_progress',
  'upload_media',
  'add_expenses',
  'edit_expenses',
  'delete_financials',
  'add_purchases',
  'record_attendance',
  'submit_site_report',
  'view_site_reports',
  'view_financial_reports',
  'manage_users',
  'manage_settings',
  'view_audit',
];

const MANAGER_CAPS: Capability[] = [
  'view_dashboard',
  'view_projects',
  'view_units',
  'update_unit_status',
  'view_construction',
  'update_progress',
  'upload_media',
  'add_expenses',
  'add_purchases',
  'record_attendance',
  'submit_site_report',
  'view_site_reports',
];

const ACCOUNTANT_CAPS: Capability[] = [
  'view_dashboard',
  'view_projects',
  'view_units',
  'record_sale',
  'record_rental',
  'record_booking',
  'record_client_payment',
  'view_financials',
  'view_sales_ledger',
  'add_expenses',
  'edit_expenses',
  'view_financial_reports',
];

const CAPS: Record<UserRole, Capability[]> = {
  admin: ADMIN_CAPS,
  manager: MANAGER_CAPS,
  accountant: ACCOUNTANT_CAPS,
};

export function hasCapability(role: UserRole | null | undefined, cap: Capability) {
  if (!role) return false;
  return CAPS[role].includes(cap);
}

export type NavIcon =
  | 'dashboard'
  | 'projects'
  | 'units'
  | 'areas'
  | 'land'
  | 'construction'
  | 'grey'
  | 'photos'
  | 'log'
  | 'attendance'
  | 'purchases'
  | 'expenses'
  | 'sales'
  | 'rentals'
  | 'bookings'
  | 'reports'
  | 'users'
  | 'audit'
  | 'settings';

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  roles: UserRole[];
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/** Product map: each screen lives in one job, not dumped in a flat list. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', roles: ['admin', 'manager', 'accountant'] },
      { href: '/projects', label: 'Projects', icon: 'projects', roles: ['admin', 'manager', 'accountant'] },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    items: [
      { href: '/units', label: 'Units', icon: 'units', roles: ['admin', 'manager', 'accountant'] },
      { href: '/common-areas', label: 'Common areas', icon: 'areas', roles: ['admin', 'manager'] },
      { href: '/land', label: 'Land / plots', icon: 'land', roles: ['admin', 'accountant'] },
    ],
  },
  {
    id: 'site',
    label: 'Site',
    items: [
      { href: '/manager', label: 'Daily log', icon: 'log', roles: ['admin', 'manager'] },
      { href: '/construction', label: 'Progress', icon: 'construction', roles: ['admin', 'manager'] },
      { href: '/grey-structure', label: 'Grey structure', icon: 'grey', roles: ['admin', 'manager'] },
      { href: '/gallery', label: 'Photos', icon: 'photos', roles: ['admin', 'manager'] },
      { href: '/attendance', label: 'Attendance', icon: 'attendance', roles: ['admin', 'manager'] },
      { href: '/purchases', label: 'Purchases', icon: 'purchases', roles: ['admin', 'manager'] },
    ],
  },
  {
    id: 'commercial',
    label: 'Clients',
    items: [
      { href: '/sales', label: 'Sales', icon: 'sales', roles: ['admin', 'accountant'] },
      { href: '/rentals', label: 'Rentals', icon: 'rentals', roles: ['admin', 'accountant'] },
      { href: '/bookings', label: 'Bookings', icon: 'bookings', roles: ['admin', 'accountant'] },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { href: '/expenses', label: 'Expenses', icon: 'expenses', roles: ['admin', 'manager', 'accountant'] },
      { href: '/purchases', label: 'Purchases', icon: 'purchases', roles: ['accountant'] },
      { href: '/reports', label: 'Reports', icon: 'reports', roles: ['admin', 'manager', 'accountant'] },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    items: [
      { href: '/users', label: 'Users', icon: 'users', roles: ['admin'] },
      { href: '/audit', label: 'Audit log', icon: 'audit', roles: ['admin'] },
      { href: '/settings', label: 'Settings', icon: 'settings', roles: ['admin'] },
    ],
  },
];

const EXTRA_PREFIXES: { prefix: string; roles: UserRole[] }[] = [
  { prefix: '/notifications', roles: ['admin', 'manager', 'accountant'] },
  { prefix: '/units/', roles: ['admin', 'manager', 'accountant'] },
  { prefix: '/projects/', roles: ['admin', 'manager', 'accountant'] },
];

export function canAccessPath(role: UserRole | null | undefined, pathname: string) {
  if (!role) return false;
  if (pathname === '/' || pathname.startsWith('/login')) return true;
  if (
    NAV_GROUPS.some((g) =>
      g.items.some((item) => item.roles.includes(role) && (pathname === item.href || pathname.startsWith(item.href + '/'))),
    )
  ) {
    return true;
  }
  return EXTRA_PREFIXES.some((p) => p.roles.includes(role) && pathname.startsWith(p.prefix));
}

export function visibleNav(role: UserRole | null | undefined): NavGroup[] {
  if (!role) return [];
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles.includes(role)),
  })).filter((g) => g.items.length > 0);
}

export const CONSTRUCTION_TABS = [
  { href: '/construction', label: 'Stages' },
  { href: '/grey-structure', label: 'Grey structure' },
  { href: '/gallery', label: 'Photos' },
];

export const CLIENT_TABS = [
  { href: '/sales', label: 'Sales' },
  { href: '/rentals', label: 'Rentals' },
  { href: '/bookings', label: 'Bookings' },
];

export const SITE_REPORTS = [
  'daily-site',
  'daily-expense',
  'progress',
  'attendance',
  'unit-completion',
  'purchases',
] as const;

export const FINANCE_REPORTS = [
  'monthly-expense',
  'unit-expense',
  'client-payments',
  'pending-payments',
  'purchases',
  'financial',
  'overall',
] as const;
