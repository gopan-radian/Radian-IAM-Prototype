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
 */
export async function getUserPermissions(
  userId: string,
  companyId: string,
  companyRelationshipId?: string | null
): Promise<string[]> {
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
        },
      },
    },
  });

  if (!assignment) return [];

  return assignment.designation.permissions.map((dp) => dp.permission.permissionKey);
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
 * Get filtered routes based on user permissions
 */
export async function getAccessibleRoutes(userPermissions: string[]) {
  const routes = await prisma.route.findMany({
    where: { routeStatus: 'ACTIVE' },
    include: {
      permissions: {
        include: { permission: true },
      },
      childRoutes: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
    orderBy: { displayOrder: 'asc' },
  });

  return routes.filter((route) => {
    // If route has no permissions, it's accessible to all
    if (route.permissions.length === 0) return true;
    // Check if user has any required permission
    return route.permissions.some((rp) => userPermissions.includes(rp.permission.permissionKey));
  });
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
