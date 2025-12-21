import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get permissions for a specific company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    // Get all permissions
    const allPermissions = await prisma.permissionMaster.findMany({
      where: { permissionStatus: 'ACTIVE' },
      orderBy: [
        { permissionCategory: 'asc' },
        { permissionKey: 'asc' },
      ],
    });

    // Get company's available permissions
    const companyPermissions = await prisma.companyAvailablePermission.findMany({
      where: { companyId },
      include: {
        permission: true,
        grantedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const grantedPermissionIds = new Set(
      companyPermissions.map((cp) => cp.permissionId)
    );

    // Combine into a response showing which permissions are granted
    const permissionsWithStatus = allPermissions.map((permission) => ({
      ...permission,
      isGranted: grantedPermissionIds.has(permission.permissionId),
      grantedInfo: companyPermissions.find(
        (cp) => cp.permissionId === permission.permissionId
      ),
    }));

    // Group by category
    const grouped = permissionsWithStatus.reduce((acc, permission) => {
      const category = permission.permissionCategory;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {} as Record<string, typeof permissionsWithStatus>);

    return NextResponse.json({
      permissions: permissionsWithStatus,
      grouped,
      grantedCount: grantedPermissionIds.size,
      totalCount: allPermissions.length,
    });
  } catch (error) {
    console.error('Error fetching company permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company permissions' },
      { status: 500 }
    );
  }
}

// POST - Grant or revoke permissions for a company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, permissionId, action, grantedByUserId } = body;

    if (!companyId || !permissionId || !action) {
      return NextResponse.json(
        { error: 'companyId, permissionId, and action are required' },
        { status: 400 }
      );
    }

    if (!['grant', 'revoke'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be either "grant" or "revoke"' },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await prisma.companyMaster.findUnique({
      where: { companyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Prevent modifying Radian's permissions
    if (company.companyType === 'RADIAN') {
      return NextResponse.json(
        { error: 'Cannot modify Radian company permissions' },
        { status: 400 }
      );
    }

    // Verify permission exists
    const permission = await prisma.permissionMaster.findUnique({
      where: { permissionId },
    });

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    if (action === 'grant') {
      // Check if already granted
      const existing = await prisma.companyAvailablePermission.findUnique({
        where: {
          companyId_permissionId: { companyId, permissionId },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Permission already granted to this company' },
          { status: 400 }
        );
      }

      // Grant the permission
      await prisma.companyAvailablePermission.create({
        data: {
          companyId,
          permissionId,
          grantedByUserId,
        },
      });

      return NextResponse.json({
        message: 'Permission granted successfully',
        permissionKey: permission.permissionKey,
      });
    } else {
      // Revoke the permission
      const existing = await prisma.companyAvailablePermission.findUnique({
        where: {
          companyId_permissionId: { companyId, permissionId },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Permission not granted to this company' },
          { status: 400 }
        );
      }

      // Also remove from any roles that have this permission
      await prisma.designationPermission.deleteMany({
        where: {
          permissionId,
          designation: {
            companyId,
          },
        },
      });

      // Revoke the permission
      await prisma.companyAvailablePermission.delete({
        where: {
          companyId_permissionId: { companyId, permissionId },
        },
      });

      return NextResponse.json({
        message: 'Permission revoked successfully',
        permissionKey: permission.permissionKey,
      });
    }
  } catch (error) {
    console.error('Error modifying company permission:', error);
    return NextResponse.json(
      { error: 'Failed to modify company permission' },
      { status: 500 }
    );
  }
}

// PUT - Bulk update permissions for a company
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, permissionIds, grantedByUserId } = body;

    if (!companyId || !Array.isArray(permissionIds)) {
      return NextResponse.json(
        { error: 'companyId and permissionIds array are required' },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await prisma.companyMaster.findUnique({
      where: { companyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Prevent modifying Radian's permissions
    if (company.companyType === 'RADIAN') {
      return NextResponse.json(
        { error: 'Cannot modify Radian company permissions' },
        { status: 400 }
      );
    }

    // Get current permissions
    const currentPermissions = await prisma.companyAvailablePermission.findMany({
      where: { companyId },
    });
    const currentIds = new Set(currentPermissions.map((cp) => cp.permissionId));

    // Determine which to add and remove
    const newIds = new Set(permissionIds);
    const toAdd = permissionIds.filter((id: string) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !newIds.has(id));

    // Remove permissions (also remove from roles)
    if (toRemove.length > 0) {
      await prisma.designationPermission.deleteMany({
        where: {
          permissionId: { in: toRemove },
          designation: { companyId },
        },
      });

      await prisma.companyAvailablePermission.deleteMany({
        where: {
          companyId,
          permissionId: { in: toRemove },
        },
      });
    }

    // Add new permissions
    if (toAdd.length > 0) {
      await prisma.companyAvailablePermission.createMany({
        data: toAdd.map((permissionId: string) => ({
          companyId,
          permissionId,
          grantedByUserId,
        })),
      });
    }

    return NextResponse.json({
      message: 'Permissions updated successfully',
      added: toAdd.length,
      removed: toRemove.length,
    });
  } catch (error) {
    console.error('Error updating company permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update company permissions' },
      { status: 500 }
    );
  }
}
