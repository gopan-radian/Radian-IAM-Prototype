/**
 * Permission Configuration
 *
 * This file is the single source of truth for:
 * 1. Permission definitions
 * 2. Permission dependencies (what permissions require other permissions)
 * 3. Permission bundles (pre-defined groups for easy assignment)
 * 4. UI element permission mappings
 *
 * The backend stores permissions and enforces them at the API level.
 * The frontend uses this config to show/hide UI elements based on user permissions.
 */

// =============================================================================
// PERMISSION DEFINITIONS
// =============================================================================

export const PERMISSIONS = {
  // DEALS - Basic
  'deals.view': { description: 'View deals', category: 'DEALS' },
  'deals.create': { description: 'Create new deals (Supplier)', category: 'DEALS' },
  'deals.edit': { description: 'Edit existing deals', category: 'DEALS' },
  'deals.delete': { description: 'Delete deals', category: 'DEALS' },

  // DEALS - Workflow (Supplier actions)
  'deals.submit': { description: 'Submit deals for review (Supplier)', category: 'DEALS' },

  // DEALS - Workflow (Merchant actions)
  'deals.review': { description: 'Review submitted deals (Merchant)', category: 'DEALS' },
  'deals.approve': { description: 'Approve deals (Merchant)', category: 'DEALS' },
  'deals.reject': { description: 'Reject deals (Merchant)', category: 'DEALS' },
  'deals.request_changes': { description: 'Request changes on deals (Merchant)', category: 'DEALS' },

  // REPORTS
  'reports.view': { description: 'View reports', category: 'REPORTS' },
  'reports.export': { description: 'Export reports to CSV/PDF', category: 'REPORTS' },

  // USERS
  'users.view': { description: 'View users in company', category: 'USERS' },
  'users.invite': { description: 'Invite new users', category: 'USERS' },
  'users.manage': { description: 'Edit/deactivate users', category: 'USERS' },

  // SETTINGS
  'roles.view': { description: 'View roles', category: 'SETTINGS' },
  'roles.manage': { description: 'Create/edit roles', category: 'SETTINGS' },
  'company.settings': { description: 'Manage company settings', category: 'SETTINGS' },

  // ADMIN (Radian only)
  'admin.companies': { description: 'Manage all companies', category: 'ADMIN' },
  'admin.company_permissions': { description: 'Grant permissions to companies', category: 'ADMIN' },
  'admin.relationships': { description: 'Manage company relationships', category: 'ADMIN' },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

// =============================================================================
// PERMISSION DEPENDENCIES
// =============================================================================

/**
 * When assigning a permission, these dependencies are automatically included.
 * Example: If you assign 'deals.create', 'deals.view' is auto-included.
 */
export const PERMISSION_DEPENDENCIES: Partial<Record<PermissionKey, PermissionKey[]>> = {
  // Deals - you need to view before you can do anything else
  'deals.create': ['deals.view'],
  'deals.edit': ['deals.view'],
  'deals.delete': ['deals.view'],
  'deals.submit': ['deals.view', 'deals.create'], // Submit requires create

  // Deals - Merchant workflow (all require view)
  'deals.review': ['deals.view'],
  'deals.approve': ['deals.view', 'deals.review'], // Approve requires review
  'deals.reject': ['deals.view', 'deals.review'], // Reject requires review
  'deals.request_changes': ['deals.view', 'deals.review'], // Request changes requires review

  // Reports
  'reports.export': ['reports.view'],

  // Users - invite/manage require viewing
  'users.invite': ['users.view'],
  'users.manage': ['users.view'],

  // Settings - managing requires viewing
  'roles.manage': ['roles.view'],

  // Admin dependencies
  'admin.company_permissions': ['admin.companies'],
  'admin.relationships': ['admin.companies'],
};

/**
 * Get all required permissions for a given permission (recursive)
 */
export function getRequiredPermissions(permission: PermissionKey): PermissionKey[] {
  const required = new Set<PermissionKey>();
  const stack = [permission];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const deps = PERMISSION_DEPENDENCIES[current];
    if (deps) {
      for (const dep of deps) {
        if (!required.has(dep)) {
          required.add(dep);
          stack.push(dep);
        }
      }
    }
  }

  return Array.from(required);
}

/**
 * Expand permissions to include all dependencies
 */
export function expandPermissions(permissions: PermissionKey[]): PermissionKey[] {
  const expanded = new Set<PermissionKey>(permissions);

  for (const perm of permissions) {
    const deps = getRequiredPermissions(perm);
    deps.forEach((dep) => expanded.add(dep));
  }

  return Array.from(expanded);
}

// =============================================================================
// PERMISSION BUNDLES
// =============================================================================

/**
 * Pre-defined permission bundles for common use cases.
 * These are Radian-defined and available to all companies.
 */
export const PERMISSION_BUNDLES = {
  // Viewer bundles - read-only access
  'viewer.deals': {
    name: 'Deal Viewer',
    description: 'Can view deals and related information',
    permissions: ['deals.view'] as PermissionKey[],
  },
  'viewer.reports': {
    name: 'Report Viewer',
    description: 'Can view reports',
    permissions: ['reports.view'] as PermissionKey[],
  },
  'viewer.full': {
    name: 'Full Viewer',
    description: 'Read-only access to deals, reports, and users',
    permissions: ['deals.view', 'reports.view', 'users.view'] as PermissionKey[],
  },

  // Deal management bundles - Supplier
  'deals.supplier_contributor': {
    name: 'Supplier - Deal Contributor',
    description: 'Can create, edit and submit deals (Supplier)',
    permissions: ['deals.view', 'deals.create', 'deals.edit', 'deals.submit'] as PermissionKey[],
  },
  'deals.supplier_admin': {
    name: 'Supplier - Deal Admin',
    description: 'Full supplier deal management including deletion',
    permissions: ['deals.view', 'deals.create', 'deals.edit', 'deals.delete', 'deals.submit'] as PermissionKey[],
  },

  // Deal management bundles - Merchant
  'deals.merchant_reviewer': {
    name: 'Merchant - Deal Reviewer',
    description: 'Can review and request changes on deals (Merchant)',
    permissions: ['deals.view', 'deals.review', 'deals.request_changes'] as PermissionKey[],
  },
  'deals.merchant_approver': {
    name: 'Merchant - Deal Approver',
    description: 'Can review, approve, and reject deals (Merchant)',
    permissions: ['deals.view', 'deals.review', 'deals.approve', 'deals.reject', 'deals.request_changes'] as PermissionKey[],
  },

  // Legacy bundles (backward compatibility)
  'deals.contributor': {
    name: 'Deal Contributor',
    description: 'Can create and edit deals',
    permissions: ['deals.view', 'deals.create', 'deals.edit'] as PermissionKey[],
  },
  'deals.manager': {
    name: 'Deal Manager',
    description: 'Full deal management including approval',
    permissions: ['deals.view', 'deals.create', 'deals.edit', 'deals.submit', 'deals.review', 'deals.approve'] as PermissionKey[],
  },
  'deals.admin': {
    name: 'Deal Admin',
    description: 'Full deal management including deletion',
    permissions: ['deals.view', 'deals.create', 'deals.edit', 'deals.delete', 'deals.submit', 'deals.review', 'deals.approve', 'deals.reject', 'deals.request_changes'] as PermissionKey[],
  },

  // User management bundles
  'users.inviter': {
    name: 'User Inviter',
    description: 'Can view and invite users',
    permissions: ['users.view', 'users.invite'] as PermissionKey[],
  },
  'users.manager': {
    name: 'User Manager',
    description: 'Full user management',
    permissions: ['users.view', 'users.invite', 'users.manage'] as PermissionKey[],
  },

  // Role-based bundles (common combinations)
  'role.basic': {
    name: 'Basic User',
    description: 'View deals and reports',
    permissions: ['deals.view', 'reports.view'] as PermissionKey[],
  },
  'role.standard': {
    name: 'Standard User',
    description: 'Create deals, view reports',
    permissions: ['deals.view', 'deals.create', 'reports.view'] as PermissionKey[],
  },
  'role.power': {
    name: 'Power User',
    description: 'Full deal and report access',
    permissions: [
      'deals.view', 'deals.create', 'deals.edit', 'deals.approve',
      'reports.view', 'reports.export',
    ] as PermissionKey[],
  },
  'role.admin': {
    name: 'Company Admin',
    description: 'Full access to deals, reports, users, and settings',
    permissions: [
      'deals.view', 'deals.create', 'deals.edit', 'deals.delete', 'deals.approve',
      'reports.view', 'reports.export',
      'users.view', 'users.invite', 'users.manage',
      'roles.view', 'roles.manage',
      'company.settings',
    ] as PermissionKey[],
  },

  // Radian-specific bundles
  'radian.support': {
    name: 'Radian Support',
    description: 'Support specialist access',
    permissions: ['deals.view', 'reports.view', 'users.view'] as PermissionKey[],
  },
  'radian.account_manager': {
    name: 'Radian Account Manager',
    description: 'Account manager with admin capabilities',
    permissions: [
      'deals.view', 'deals.create', 'deals.edit', 'deals.approve',
      'reports.view', 'reports.export',
      'users.view', 'users.invite',
      'admin.companies', 'admin.company_permissions', 'admin.relationships',
    ] as PermissionKey[],
  },
  'radian.super_admin': {
    name: 'Radian Super Admin',
    description: 'Full system access',
    permissions: Object.keys(PERMISSIONS) as PermissionKey[],
  },
} as const;

export type BundleKey = keyof typeof PERMISSION_BUNDLES;

/**
 * Get permissions for a bundle (with dependencies expanded)
 */
export function getBundlePermissions(bundleKey: BundleKey): PermissionKey[] {
  const bundle = PERMISSION_BUNDLES[bundleKey];
  return expandPermissions(bundle.permissions);
}

// =============================================================================
// UI PERMISSION MAPPING
// =============================================================================

/**
 * Maps UI elements to required permissions.
 * Components use this to determine what to show/hide.
 */
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
    '/settings': null, // Settings page always visible, sub-items controlled
    '/settings/users': 'users.view',
    '/settings/roles': 'roles.view',
    '/settings/company': 'company.settings',
    '/admin/companies': 'admin.companies',
    '/admin/company-permissions': 'admin.company_permissions',
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
    'admin.permissions': 'admin.company_permissions',
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
    'deals.request_changes': 'deals.request_changes',
    'reports.export': 'reports.export',
    'users.invite': 'users.invite',
    'users.edit': 'users.manage',
    'users.deactivate': 'users.manage',
    'roles.create': 'roles.manage',
    'roles.edit': 'roles.manage',
    'roles.delete': 'roles.manage',
  },
} as const;

// Type helpers for UI permissions
export type PagePath = keyof typeof UI_PERMISSIONS.pages;
export type SidebarItem = keyof typeof UI_PERMISSIONS.sidebar;
export type ActionKey = keyof typeof UI_PERMISSIONS.actions;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user has permission for a page
 */
export function canAccessPage(
  userPermissions: string[],
  page: PagePath
): boolean {
  const required = UI_PERMISSIONS.pages[page];
  if (required === null) return true;
  return userPermissions.includes(required);
}

/**
 * Check if user can see a sidebar item
 */
export function canSeeSidebarItem(
  userPermissions: string[],
  item: SidebarItem
): boolean {
  const required = UI_PERMISSIONS.sidebar[item];
  if (required === null) return true;
  return userPermissions.includes(required);
}

/**
 * Check if user can perform an action
 */
export function canPerformAction(
  userPermissions: string[],
  action: ActionKey
): boolean {
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
