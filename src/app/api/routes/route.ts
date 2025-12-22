import { NextRequest, NextResponse } from 'next/server';
import { UI_PERMISSIONS, getVisibleSidebarItems, canAccessPage, type PagePath } from '@/config/permissions';

/**
 * Routes are now defined in code (src/config/permissions.ts), not in the database.
 * This endpoint provides route information for clients that need it.
 */

// Navigation item structure for frontend
interface NavItem {
  path: string;
  label: string;
  icon: string;
  permission: string | null;
  children?: NavItem[];
}

// Static navigation structure (mirrors src/config/permissions.ts)
const NAVIGATION: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'home', permission: null },
  { path: '/deals', label: 'Deals', icon: 'file-text', permission: 'deals.view' },
  { path: '/reports', label: 'Reports', icon: 'bar-chart', permission: 'reports.view' },
  {
    path: '/settings',
    label: 'Settings',
    icon: 'settings',
    permission: null,
    children: [
      { path: '/settings/users', label: 'User Management', icon: 'users', permission: 'users.view' },
      { path: '/settings/roles', label: 'Role Management', icon: 'shield', permission: 'roles.view' },
      { path: '/settings/company', label: 'Company Settings', icon: 'building-2', permission: 'company.settings' },
    ],
  },
  {
    path: '/admin',
    label: 'Admin',
    icon: 'shield-check',
    permission: 'admin.companies',
    children: [
      { path: '/admin/companies', label: 'Companies', icon: 'building', permission: 'admin.companies' },
      { path: '/admin/company-permissions', label: 'Company Permissions', icon: 'key', permission: 'admin.company_permissions' },
      { path: '/admin/relationships', label: 'Relationships', icon: 'link', permission: 'admin.relationships' },
    ],
  },
];

// GET: Return all routes with their permission requirements
export async function GET() {
  try {
    return NextResponse.json({
      navigation: NAVIGATION,
      pagePermissions: UI_PERMISSIONS.pages,
      actionPermissions: UI_PERMISSIONS.actions,
    });
  } catch (error) {
    console.error('Routes GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}

// POST: Filter routes by user permissions (for sidebar)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { permissions } = body;

    if (!permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Invalid permissions array' },
        { status: 400 }
      );
    }

    // Filter navigation items based on permissions
    const filterNavItems = (items: NavItem[]): NavItem[] => {
      return items
        .filter((item) => {
          // If no permission required, check if it has accessible children
          if (item.permission === null) {
            if (item.children) {
              const accessibleChildren = filterNavItems(item.children);
              return accessibleChildren.length > 0;
            }
            return true;
          }
          return permissions.includes(item.permission);
        })
        .map((item) => ({
          ...item,
          children: item.children ? filterNavItems(item.children) : undefined,
        }));
    };

    const accessibleNavigation = filterNavItems(NAVIGATION);

    // Also return which pages user can access
    const accessiblePages = (Object.keys(UI_PERMISSIONS.pages) as PagePath[]).filter(
      (page) => canAccessPage(permissions, page)
    );

    return NextResponse.json({
      navigation: accessibleNavigation,
      accessiblePages,
      visibleSidebarItems: getVisibleSidebarItems(permissions),
    });
  } catch (error) {
    console.error('Routes API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}
