import { prisma } from './prisma';

export interface UserContext {
  userId: string;
  companyId: string;
  designationId: string;
  companyRelationshipId?: string | null;
  permissions: string[];
}

/**
 * Get user's permissions for a specific company context
 *
 * Permission sources (in order of application):
 * 1. Base permissions from role (DesignationPermission)
 * 2. Permissions from bundles assigned to role (DesignationBundle)
 * 3. Permissions from bundles assigned directly to user (UserBundleAssignment)
 * 4. User permission overrides (ALLOW adds, DENY removes)
 */
export async function getUserPermissions(
  userId: string,
  companyId: string,
  companyRelationshipId?: string | null
): Promise<string[]> {
  // 1. Get base permissions from assignment/designation
  const assignment = await prisma.userCompanyAssignment.findFirst({
    where: {
      userId,
      companyId,
      companyRelationshipId: companyRelationshipId || null,
      assignmentStatus: 'ACTIVE',
    },
    include: {
      designation: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          // Include bundles assigned to this designation/role
          bundles: {
            where: {
              bundle: { bundleStatus: 'ACTIVE' },
            },
            include: {
              bundle: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!assignment) return [];

  // 2. Start with base permissions from role
  const permissions = new Set(
    assignment.designation.permissions.map((dp) => dp.permission.permissionKey)
  );

  // 3. Add permissions from bundles assigned to the role
  for (const designationBundle of assignment.designation.bundles) {
    for (const bundlePermission of designationBundle.bundle.permissions) {
      permissions.add(bundlePermission.permission.permissionKey);
    }
  }

  // 4. Get bundles assigned directly to user for this company
  const userBundles = await prisma.userBundleAssignment.findMany({
    where: {
      userId,
      companyId,
      assignmentStatus: 'ACTIVE',
      bundle: { bundleStatus: 'ACTIVE' },
      // Match relationship scope: null applies to all, specific matches specific
      OR: [
        { companyRelationshipId: null },
        { companyRelationshipId: companyRelationshipId || null },
      ],
    },
    include: {
      bundle: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  // 5. Add permissions from user's directly assigned bundles
  for (const userBundle of userBundles) {
    for (const bundlePermission of userBundle.bundle.permissions) {
      permissions.add(bundlePermission.permission.permissionKey);
    }
  }

  // 6. Get user's permission overrides for this company
  const overrides = await prisma.userPermissionOverride.findMany({
    where: {
      userId,
      companyId,
      overrideStatus: 'ACTIVE',
      // Match relationship scope: null applies to all, specific matches specific
      OR: [
        { companyRelationshipId: null },
        { companyRelationshipId: companyRelationshipId || null },
      ],
    },
    include: {
      permission: true,
    },
  });

  // 7. Apply overrides (ALLOW adds, DENY removes)
  for (const override of overrides) {
    if (override.effect === 'ALLOW') {
      permissions.add(override.permission.permissionKey);
    } else if (override.effect === 'DENY') {
      permissions.delete(override.permission.permissionKey);
    }
  }

  return Array.from(permissions);
}

/**
 * Get user's permissions with detailed breakdown of sources
 * Useful for UI display to show where permissions come from
 */
export interface PermissionWithSource {
  permissionKey: string;
  permissionId: string;
  source: 'ROLE' | 'ROLE_BUNDLE' | 'USER_BUNDLE' | 'OVERRIDE_ALLOW';
  sourceName?: string; // Bundle name if from bundle
  denied?: boolean;
  overrideReason?: string;
}

export async function getUserPermissionsWithBreakdown(
  userId: string,
  companyId: string,
  companyRelationshipId?: string | null
): Promise<{
  effectivePermissions: string[];
  breakdown: PermissionWithSource[];
}> {
  const assignment = await prisma.userCompanyAssignment.findFirst({
    where: {
      userId,
      companyId,
      companyRelationshipId: companyRelationshipId || null,
      assignmentStatus: 'ACTIVE',
    },
    include: {
      designation: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          bundles: {
            where: {
              bundle: { bundleStatus: 'ACTIVE' },
            },
            include: {
              bundle: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    return { effectivePermissions: [], breakdown: [] };
  }

  const breakdown: PermissionWithSource[] = [];
  const effectivePermissions = new Set<string>();
  const deniedPermissions = new Set<string>();

  // Add role permissions
  for (const dp of assignment.designation.permissions) {
    breakdown.push({
      permissionKey: dp.permission.permissionKey,
      permissionId: dp.permission.permissionId,
      source: 'ROLE',
    });
    effectivePermissions.add(dp.permission.permissionKey);
  }

  // Add permissions from bundles assigned to role
  for (const designationBundle of assignment.designation.bundles) {
    for (const bundlePermission of designationBundle.bundle.permissions) {
      if (!effectivePermissions.has(bundlePermission.permission.permissionKey)) {
        breakdown.push({
          permissionKey: bundlePermission.permission.permissionKey,
          permissionId: bundlePermission.permission.permissionId,
          source: 'ROLE_BUNDLE',
          sourceName: designationBundle.bundle.bundleName,
        });
        effectivePermissions.add(bundlePermission.permission.permissionKey);
      }
    }
  }

  // Get bundles assigned directly to user
  const userBundles = await prisma.userBundleAssignment.findMany({
    where: {
      userId,
      companyId,
      assignmentStatus: 'ACTIVE',
      bundle: { bundleStatus: 'ACTIVE' },
      OR: [
        { companyRelationshipId: null },
        { companyRelationshipId: companyRelationshipId || null },
      ],
    },
    include: {
      bundle: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  // Add permissions from user's directly assigned bundles
  for (const userBundle of userBundles) {
    for (const bundlePermission of userBundle.bundle.permissions) {
      if (!effectivePermissions.has(bundlePermission.permission.permissionKey)) {
        breakdown.push({
          permissionKey: bundlePermission.permission.permissionKey,
          permissionId: bundlePermission.permission.permissionId,
          source: 'USER_BUNDLE',
          sourceName: userBundle.bundle.bundleName,
        });
        effectivePermissions.add(bundlePermission.permission.permissionKey);
      }
    }
  }

  // Get overrides
  const overrides = await prisma.userPermissionOverride.findMany({
    where: {
      userId,
      companyId,
      overrideStatus: 'ACTIVE',
      OR: [
        { companyRelationshipId: null },
        { companyRelationshipId: companyRelationshipId || null },
      ],
    },
    include: {
      permission: true,
    },
  });

  // Apply overrides
  for (const override of overrides) {
    if (override.effect === 'ALLOW') {
      // Only add to breakdown if not already from role/bundle
      if (!effectivePermissions.has(override.permission.permissionKey)) {
        breakdown.push({
          permissionKey: override.permission.permissionKey,
          permissionId: override.permission.permissionId,
          source: 'OVERRIDE_ALLOW',
          overrideReason: override.reason || undefined,
        });
      }
      effectivePermissions.add(override.permission.permissionKey);
    } else if (override.effect === 'DENY') {
      effectivePermissions.delete(override.permission.permissionKey);
      deniedPermissions.add(override.permission.permissionKey);
    }
  }

  // Mark denied permissions in breakdown
  const finalBreakdown = breakdown
    .filter((b) => !deniedPermissions.has(b.permissionKey))
    .concat(
      Array.from(deniedPermissions).map((key) => {
        const override = overrides.find(
          (o) => o.permission.permissionKey === key && o.effect === 'DENY'
        );
        return {
          permissionKey: key,
          permissionId: override?.permission.permissionId || '',
          source: 'ROLE' as const,
          denied: true,
          overrideReason: override?.reason || undefined,
        };
      })
    );

  return {
    effectivePermissions: Array.from(effectivePermissions),
    breakdown: finalBreakdown,
  };
}

/**
 * Check if an admin can assign specific permissions
 * Admins can only assign permissions they themselves have
 */
export async function canAdminAssignPermissions(
  adminUserId: string,
  adminCompanyId: string,
  permissionIdsToAssign: string[],
  adminCompanyRelationshipId?: string | null
): Promise<{ allowed: boolean; forbidden: string[] }> {
  if (permissionIdsToAssign.length === 0) {
    return { allowed: true, forbidden: [] };
  }

  // Get admin's own permissions
  const adminPermissions = await getUserPermissions(
    adminUserId,
    adminCompanyId,
    adminCompanyRelationshipId
  );

  // Get permission keys for the IDs being assigned
  const targetPermissions = await prisma.permissionMaster.findMany({
    where: { permissionId: { in: permissionIdsToAssign } },
  });

  const forbidden: string[] = [];

  for (const target of targetPermissions) {
    if (!adminPermissions.includes(target.permissionKey)) {
      forbidden.push(target.permissionKey);
    }
  }

  return {
    allowed: forbidden.length === 0,
    forbidden,
  };
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has ANY of the required permissions
 */
export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some((p) => userPermissions.includes(p));
}

/**
 * Check if user has ALL of the required permissions
 */
export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every((p) => userPermissions.includes(p));
}

/**
 * Permission dependencies - when assigning a permission, these are auto-included.
 * This mirrors the config in src/config/permissions.ts for server-side use.
 */
const PERMISSION_DEPENDENCIES: Record<string, string[]> = {
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
 * Expand permission keys to include all dependencies (recursive)
 */
export function expandPermissionKeys(permissionKeys: string[]): string[] {
  const expanded = new Set<string>(permissionKeys);

  const addDependencies = (key: string) => {
    const deps = PERMISSION_DEPENDENCIES[key];
    if (deps) {
      for (const dep of deps) {
        if (!expanded.has(dep)) {
          expanded.add(dep);
          addDependencies(dep); // Recursive for nested deps
        }
      }
    }
  };

  for (const key of permissionKeys) {
    addDependencies(key);
  }

  return Array.from(expanded);
}

/**
 * Expand permission IDs to include all dependencies.
 * Takes permission IDs, looks up their keys, expands, and returns expanded IDs.
 */
export async function expandPermissionIds(permissionIds: string[]): Promise<string[]> {
  if (permissionIds.length === 0) return [];

  // Get permission keys for the given IDs
  const permissions = await prisma.permissionMaster.findMany({
    where: { permissionId: { in: permissionIds } },
  });

  const permissionKeys = permissions.map((p) => p.permissionKey);
  const expandedKeys = expandPermissionKeys(permissionKeys);

  // Get IDs for all expanded permissions
  const allPermissions = await prisma.permissionMaster.findMany({
    where: { permissionKey: { in: expandedKeys } },
  });

  return allPermissions.map((p) => p.permissionId);
}

/**
 * Get company's available permissions (what Radian has granted)
 */
export async function getCompanyAvailablePermissions(companyId: string): Promise<string[]> {
  const available = await prisma.companyAvailablePermission.findMany({
    where: { companyId },
    include: { permission: true },
  });

  return available.map((a) => a.permission.permissionKey);
}
