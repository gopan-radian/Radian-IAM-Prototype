'use client';

import React, { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  type PermissionKey,
  type ActionKey,
  type SidebarItem,
  type PagePath,
  canAccessPage,
  canSeeSidebarItem,
  canPerformAction,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getVisibleSidebarItems,
  getAvailableActions,
} from '@/config/permissions';

interface Assignment {
  companyId: string;
  company: {
    companyId: string;
    companyName: string;
    companyType: string;
  };
  designation: {
    designationId: string;
    designationName: string;
  };
  companyRelationship?: {
    companyRelationshipId: string;
    fromCompany: { companyId: string; companyName: string };
    toCompany: { companyId: string; companyName: string };
  } | null;
  effectivePermissions: string[];
}

interface UsePermissionsOptions {
  /**
   * Optional: Specify which company context to use.
   * If not provided, uses the first assignment.
   */
  companyId?: string;
  /**
   * Optional: Specify relationship context for scoped permissions.
   */
  companyRelationshipId?: string;
}

interface UsePermissionsReturn {
  /**
   * Array of permission keys the user has in the current context
   */
  permissions: string[];
  /**
   * The current assignment being used for permissions
   */
  currentAssignment: Assignment | null;
  /**
   * All assignments the user has
   */
  allAssignments: Assignment[];
  /**
   * Check if user has a specific permission
   */
  can: (permission: PermissionKey) => boolean;
  /**
   * Check if user has ALL of the specified permissions
   */
  canAll: (permissions: PermissionKey[]) => boolean;
  /**
   * Check if user has ANY of the specified permissions
   */
  canAny: (permissions: PermissionKey[]) => boolean;
  /**
   * Check if user can access a specific page
   */
  canAccessPage: (page: PagePath) => boolean;
  /**
   * Check if user can see a sidebar item
   */
  canSeeSidebarItem: (item: SidebarItem) => boolean;
  /**
   * Check if user can perform an action
   */
  canPerformAction: (action: ActionKey) => boolean;
  /**
   * Get all visible sidebar items for the user
   */
  visibleSidebarItems: SidebarItem[];
  /**
   * Get all available actions for the user
   */
  availableActions: ActionKey[];
  /**
   * Loading state
   */
  isLoading: boolean;
  /**
   * Whether user is authenticated
   */
  isAuthenticated: boolean;
}

/**
 * Hook to access user permissions and permission-checking utilities.
 *
 * @example
 * ```tsx
 * function DealsList() {
 *   const { can, canPerformAction } = usePermissions();
 *
 *   return (
 *     <div>
 *       <h1>Deals</h1>
 *       {canPerformAction('deals.create') && (
 *         <button>Create Deal</button>
 *       )}
 *       {can('deals.delete') && (
 *         <button>Delete Selected</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With company context
 * ```tsx
 * function CompanyDeals({ companyId }: { companyId: string }) {
 *   const { can, permissions } = usePermissions({ companyId });
 *
 *   // Uses permissions for the specified company
 *   if (!can('deals.view')) return <AccessDenied />;
 *
 *   return <DealsList />;
 * }
 * ```
 */
export function usePermissions(options: UsePermissionsOptions = {}): UsePermissionsReturn {
  const { data: session, status } = useSession();
  const { companyId, companyRelationshipId } = options;

  const result = useMemo(() => {
    const isLoading = status === 'loading';
    const isAuthenticated = status === 'authenticated';
    const assignments = (session?.user as any)?.assignments as Assignment[] || [];

    // Find the current assignment based on options
    let currentAssignment: Assignment | null = null;

    if (companyId) {
      if (companyRelationshipId) {
        // Find assignment for specific company + relationship
        currentAssignment = assignments.find(
          (a) =>
            a.companyId === companyId &&
            a.companyRelationship?.companyRelationshipId === companyRelationshipId
        ) || null;
      } else {
        // Find assignment for specific company (without relationship scope)
        currentAssignment = assignments.find(
          (a) => a.companyId === companyId && !a.companyRelationship
        ) || assignments.find((a) => a.companyId === companyId) || null;
      }
    } else {
      // Default to first assignment
      currentAssignment = assignments[0] || null;
    }

    const permissions = currentAssignment?.effectivePermissions || [];

    return {
      permissions,
      currentAssignment,
      allAssignments: assignments,
      can: (permission: PermissionKey) => hasPermission(permissions, permission),
      canAll: (perms: PermissionKey[]) => hasAllPermissions(permissions, perms),
      canAny: (perms: PermissionKey[]) => hasAnyPermission(permissions, perms),
      canAccessPage: (page: PagePath) => canAccessPage(permissions, page),
      canSeeSidebarItem: (item: SidebarItem) => canSeeSidebarItem(permissions, item),
      canPerformAction: (action: ActionKey) => canPerformAction(permissions, action),
      visibleSidebarItems: getVisibleSidebarItems(permissions),
      availableActions: getAvailableActions(permissions),
      isLoading,
      isAuthenticated,
    };
  }, [session, status, companyId, companyRelationshipId]);

  return result;
}

/**
 * Component wrapper that only renders children if user has permission.
 *
 * @example
 * ```tsx
 * <RequirePermission permission="deals.create">
 *   <CreateDealButton />
 * </RequirePermission>
 * ```
 */
export function RequirePermission({
  permission,
  children,
  fallback = null,
  companyId,
}: {
  permission: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  companyId?: string;
}) {
  const { can } = usePermissions({ companyId });

  if (!can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Component wrapper that only renders children if user can perform action.
 *
 * @example
 * ```tsx
 * <RequireAction action="deals.create">
 *   <button>Create Deal</button>
 * </RequireAction>
 * ```
 */
export function RequireAction({
  action,
  children,
  fallback = null,
  companyId,
}: {
  action: ActionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  companyId?: string;
}) {
  const { canPerformAction: canAct } = usePermissions({ companyId });

  if (!canAct(action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default usePermissions;
