/**
 * Permission Configuration (Simplified)
 *
 * Two-level access control:
 * 1. SERVICES - Company-level: Which apps/features a company has access to
 * 2. PERMISSIONS - Role-level: What actions users with that role can perform
 *
 * Flow:
 * - Company must have service enabled (e.g., deal_portal)
 * - User's role determines what they can do within that service
 */

// =============================================================================
// SERVICES (Company-Level Access)
// =============================================================================

export const SERVICES = {
  deal_portal: {
    name: 'Deal Portal',
    description: 'Access to create, manage, and process deals',
  },
  reports: {
    name: 'Reports',
    description: 'Access to view and export reports',
  },
  analytics: {
    name: 'Analytics',
    description: 'Access to analytics dashboards',
  },
  user_management: {
    name: 'User Management',
    description: 'Ability to manage users within the company',
  },
} as const;

export type ServiceKey = keyof typeof SERVICES;

// =============================================================================
// PERMISSIONS (Role-Level Access)
// =============================================================================

export const PERMISSIONS = {
  // DEALS
  'deals.view': { name: 'View Deals', description: 'View deals', category: 'DEALS' },
  'deals.create': { name: 'Create Deals', description: 'Create new deals', category: 'DEALS' },
  'deals.edit': { name: 'Edit Deals', description: 'Edit existing deals', category: 'DEALS' },
  'deals.delete': { name: 'Delete Deals', description: 'Delete deals', category: 'DEALS' },
  'deals.submit': { name: 'Submit Deals', description: 'Submit deals for review', category: 'DEALS' },
  'deals.review': { name: 'Review Deals', description: 'Review submitted deals', category: 'DEALS' },
  'deals.approve': { name: 'Approve Deals', description: 'Approve deals', category: 'DEALS' },
  'deals.reject': { name: 'Reject Deals', description: 'Reject deals', category: 'DEALS' },

  // REPORTS
  'reports.view': { name: 'View Reports', description: 'View reports', category: 'REPORTS' },
  'reports.export': { name: 'Export Reports', description: 'Export reports to CSV/PDF', category: 'REPORTS' },

  // USERS
  'users.view': { name: 'View Users', description: 'View users in company', category: 'USERS' },
  'users.invite': { name: 'Invite Users', description: 'Invite new users', category: 'USERS' },
  'users.manage': { name: 'Manage Users', description: 'Edit/deactivate users', category: 'USERS' },

  // SETTINGS
  'roles.view': { name: 'View Roles', description: 'View roles', category: 'SETTINGS' },
  'roles.manage': { name: 'Manage Roles', description: 'Create/edit roles', category: 'SETTINGS' },
  'company.settings': { name: 'Company Settings', description: 'Manage company settings', category: 'SETTINGS' },

  // ADMIN (Radian only)
  'admin.companies': { name: 'Manage Companies', description: 'Manage all companies', category: 'ADMIN' },
  'admin.services': { name: 'Manage Services', description: 'Grant services to companies', category: 'ADMIN' },
  'admin.relationships': { name: 'Manage Relationships', description: 'Manage company relationships', category: 'ADMIN' },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

// =============================================================================
// PERMISSION CATEGORIES
// =============================================================================

export const PERMISSION_CATEGORIES = {
  DEALS: { name: 'Deals', description: 'Deal management permissions' },
  REPORTS: { name: 'Reports', description: 'Report access permissions' },
  USERS: { name: 'Users', description: 'User management permissions' },
  SETTINGS: { name: 'Settings', description: 'Company settings permissions' },
  ADMIN: { name: 'Admin', description: 'Radian admin permissions' },
} as const;

export type PermissionCategory = keyof typeof PERMISSION_CATEGORIES;

// =============================================================================
// SERVICE TO PERMISSION MAPPING
// =============================================================================

/**
 * Maps services to the permissions they unlock.
 * A company must have the service enabled for users to use these permissions.
 */
export const SERVICE_PERMISSIONS: Record<ServiceKey, PermissionKey[]> = {
  deal_portal: [
    'deals.view',
    'deals.create',
    'deals.edit',
    'deals.delete',
    'deals.submit',
    'deals.review',
    'deals.approve',
    'deals.reject',
  ],
  reports: ['reports.view', 'reports.export'],
  analytics: [], // Future permissions
  user_management: ['users.view', 'users.invite', 'users.manage'],
};

// =============================================================================
// UI PERMISSION MAPPING
// =============================================================================

export const UI_PERMISSIONS = {
  // Navigation / Pages
  pages: {
    '/dashboard': null, // Everyone can see dashboard
    '/deals': 'deals.view',
    '/deals/create': 'deals.create',
    '/deals/[id]': 'deals.view',
    '/deals/[id]/edit': 'deals.edit',
    '/reports': 'reports.view',
    '/reports/export': 'reports.export',
    '/settings': null,
    '/settings/users': 'users.view',
    '/settings/roles': 'roles.view',
    '/settings/company': 'company.settings',
    '/admin/companies': 'admin.companies',
    '/admin/services': 'admin.services',
    '/admin/relationships': 'admin.relationships',
  },

  // Sidebar menu items
  sidebar: {
    dashboard: null,
    deals: 'deals.view',
    reports: 'reports.view',
    settings: null,
    'settings.users': 'users.view',
    'settings.roles': 'roles.view',
    'settings.company': 'company.settings',
    admin: 'admin.companies',
    'admin.companies': 'admin.companies',
    'admin.services': 'admin.services',
    'admin.relationships': 'admin.relationships',
  },

  // Action buttons
  actions: {
    'deals.create': 'deals.create',
    'deals.edit': 'deals.edit',
    'deals.delete': 'deals.delete',
    'deals.submit': 'deals.submit',
    'deals.review': 'deals.review',
    'deals.approve': 'deals.approve',
    'deals.reject': 'deals.reject',
    'reports.export': 'reports.export',
    'users.invite': 'users.invite',
    'users.edit': 'users.manage',
    'users.deactivate': 'users.manage',
    'roles.create': 'roles.manage',
    'roles.edit': 'roles.manage',
    'roles.delete': 'roles.manage',
  },
} as const;

export type PagePath = keyof typeof UI_PERMISSIONS.pages;
export type SidebarItem = keyof typeof UI_PERMISSIONS.sidebar;
export type ActionKey = keyof typeof UI_PERMISSIONS.actions;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user has permission for a page
 */
export function canAccessPage(userPermissions: string[], page: PagePath): boolean {
  const required = UI_PERMISSIONS.pages[page];
  if (required === null) return true;
  return userPermissions.includes(required);
}

/**
 * Check if user can see a sidebar item
 */
export function canSeeSidebarItem(userPermissions: string[], item: SidebarItem): boolean {
  const required = UI_PERMISSIONS.sidebar[item];
  if (required === null) return true;
  return userPermissions.includes(required);
}

/**
 * Check if user can perform an action
 */
export function canPerformAction(userPermissions: string[], action: ActionKey): boolean {
  const required = UI_PERMISSIONS.actions[action];
  return userPermissions.includes(required);
}

/**
 * Get all visible sidebar items for user
 */
export function getVisibleSidebarItems(userPermissions: string[]): SidebarItem[] {
  return (Object.keys(UI_PERMISSIONS.sidebar) as SidebarItem[]).filter((item) =>
    canSeeSidebarItem(userPermissions, item)
  );
}

/**
 * Get all available actions for user
 */
export function getAvailableActions(userPermissions: string[]): ActionKey[] {
  return (Object.keys(UI_PERMISSIONS.actions) as ActionKey[]).filter((action) =>
    canPerformAction(userPermissions, action)
  );
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(userPermissions: string[], permission: PermissionKey): boolean {
  return userPermissions.includes(permission);
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(userPermissions: string[], required: PermissionKey[]): boolean {
  return required.every((perm) => userPermissions.includes(perm));
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(userPermissions: string[], required: PermissionKey[]): boolean {
  return required.some((perm) => userPermissions.includes(perm));
}

/**
 * Get permissions by category
 */
export function getPermissionsByCategory(category: PermissionCategory): PermissionKey[] {
  return (Object.keys(PERMISSIONS) as PermissionKey[]).filter(
    (key) => PERMISSIONS[key].category === category
  );
}

/**
 * Get all permission keys
 */
export function getAllPermissionKeys(): PermissionKey[] {
  return Object.keys(PERMISSIONS) as PermissionKey[];
}

/**
 * Get all service keys
 */
export function getAllServiceKeys(): ServiceKey[] {
  return Object.keys(SERVICES) as ServiceKey[];
}
