import { prisma } from './prisma';

export interface UserContext {
  userId: string;
  companyId: string;
  designationId: string;
  companyRelationshipId?: string | null;
  permissions: string[];
  services: string[];
}

/**
 * Get user's permissions for a specific company context
 *
 * Simplified flow:
 * 1. Check company's enabled services
 * 2. Get permissions from user's role (DesignationPermission)
 * 3. Filter by company's available services
 */
export async function getUserPermissions(
  userId: string,
  companyId: string,
  companyRelationshipId?: string | null
): Promise<string[]> {
  // Get assignment with designation and permissions
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

  // Get permissions from role
  const permissions = assignment.designation.permissions.map(
    (dp) => dp.permission.permissionKey
  );

  return permissions;
}

/**
 * Get company's enabled services
 */
export async function getCompanyServices(companyId: string): Promise<string[]> {
  const services = await prisma.companyService.findMany({
    where: {
      companyId,
      isEnabled: true,
    },
    include: {
      service: true,
    },
  });

  return services.map((cs) => cs.service.serviceKey);
}

/**
 * Get user's full context including permissions and services
 */
export async function getUserContext(
  userId: string,
  companyId: string,
  companyRelationshipId?: string | null
): Promise<UserContext | null> {
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

  if (!assignment) return null;

  const permissions = assignment.designation.permissions.map(
    (dp) => dp.permission.permissionKey
  );

  const services = await getCompanyServices(companyId);

  return {
    userId,
    companyId,
    designationId: assignment.designationId,
    companyRelationshipId: companyRelationshipId || null,
    permissions,
    services,
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
 * Check if company has a specific service enabled
 */
export function hasService(companyServices: string[], requiredService: string): boolean {
  return companyServices.includes(requiredService);
}

/**
 * Get all permissions for a role/designation
 */
export async function getRolePermissions(designationId: string): Promise<string[]> {
  const permissions = await prisma.designationPermission.findMany({
    where: { designationId },
    include: { permission: true },
  });

  return permissions.map((dp) => dp.permission.permissionKey);
}

/**
 * Get all available permissions (master list)
 */
export async function getAllPermissions(): Promise<
  Array<{
    permissionId: string;
    permissionKey: string;
    permissionName: string;
    permissionDescription: string | null;
    permissionCategory: string;
  }>
> {
  const permissions = await prisma.permissionMaster.findMany({
    where: { permissionStatus: 'ACTIVE' },
    orderBy: [{ permissionCategory: 'asc' }, { permissionKey: 'asc' }],
  });

  return permissions;
}

/**
 * Get all available services (master list)
 */
export async function getAllServices(): Promise<
  Array<{
    serviceId: string;
    serviceKey: string;
    serviceName: string;
    serviceDescription: string | null;
  }>
> {
  const services = await prisma.serviceMaster.findMany({
    where: { serviceStatus: 'ACTIVE' },
    orderBy: { serviceName: 'asc' },
  });

  return services;
}

/**
 * Assign permissions to a role/designation
 */
export async function assignPermissionsToRole(
  designationId: string,
  permissionIds: string[]
): Promise<void> {
  // Remove existing permissions
  await prisma.designationPermission.deleteMany({
    where: { designationId },
  });

  // Add new permissions
  if (permissionIds.length > 0) {
    await prisma.designationPermission.createMany({
      data: permissionIds.map((permissionId) => ({
        designationId,
        permissionId,
      })),
    });
  }
}

/**
 * Enable/disable services for a company
 */
export async function setCompanyServices(
  companyId: string,
  serviceIds: string[],
  enabled: boolean
): Promise<void> {
  for (const serviceId of serviceIds) {
    await prisma.companyService.upsert({
      where: {
        companyId_serviceId: { companyId, serviceId },
      },
      update: { isEnabled: enabled },
      create: {
        companyId,
        serviceId,
        isEnabled: enabled,
      },
    });
  }
}

/**
 * Get company's service status (which services are enabled)
 */
export async function getCompanyServiceStatus(
  companyId: string
): Promise<Array<{ serviceId: string; serviceKey: string; serviceName: string; isEnabled: boolean }>> {
  // Get all services
  const allServices = await prisma.serviceMaster.findMany({
    where: { serviceStatus: 'ACTIVE' },
    orderBy: { serviceName: 'asc' },
  });

  // Get company's enabled services
  const companyServices = await prisma.companyService.findMany({
    where: { companyId },
  });

  const enabledMap = new Map(companyServices.map((cs) => [cs.serviceId, cs.isEnabled]));

  return allServices.map((service) => ({
    serviceId: service.serviceId,
    serviceKey: service.serviceKey,
    serviceName: service.serviceName,
    isEnabled: enabledMap.get(service.serviceId) ?? false,
  }));
}
