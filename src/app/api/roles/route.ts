import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canAdminAssignPermissions, expandPermissionIds } from '@/lib/permissions';

// GET - List roles (designations) for a company
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

    const roles = await prisma.designationMaster.findMany({
      where: {
        companyId,
        designationStatus: 'ACTIVE',
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userAssignments: true,
          },
        },
      },
      orderBy: { designationName: 'asc' },
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

// POST - Create a new role for a company
// Enforces that admin can only assign permissions they have
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, designationName, permissionIds, adminUserId } = body as {
      companyId: string;
      designationName: string;
      permissionIds?: string[];
      adminUserId?: string;
    };

    if (!companyId || !designationName) {
      return NextResponse.json(
        { error: 'companyId and designationName are required' },
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

    // Get company's available permissions
    const availablePermissions = await prisma.companyAvailablePermission.findMany({
      where: { companyId },
    });
    const availablePermissionIds = new Set(availablePermissions.map((p) => p.permissionId));

    // Expand permissions to include dependencies
    let expandedPermissionIds: string[] = [];
    if (permissionIds && permissionIds.length > 0) {
      expandedPermissionIds = await expandPermissionIds(permissionIds);

      // Validate that all expanded permissions are available to this company
      for (const permId of expandedPermissionIds) {
        if (!availablePermissionIds.has(permId)) {
          return NextResponse.json(
            { error: 'One or more permissions (including required dependencies) are not available to this company' },
            { status: 400 }
          );
        }
      }

      // If adminUserId provided, enforce that admin has all permissions they're assigning
      if (adminUserId) {
        const { allowed, forbidden } = await canAdminAssignPermissions(
          adminUserId,
          companyId,
          expandedPermissionIds
        );

        if (!allowed) {
          return NextResponse.json(
            {
              error: 'You cannot assign permissions you do not have',
              forbidden,
            },
            { status: 403 }
          );
        }
      }
    }

    // Check for duplicate role name
    const existing = await prisma.designationMaster.findFirst({
      where: {
        companyId,
        designationName,
        designationStatus: 'ACTIVE',
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A role with this name already exists' },
        { status: 400 }
      );
    }

    // Create role with permissions in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const role = await tx.designationMaster.create({
        data: {
          companyId,
          designationName,
          designationStatus: 'ACTIVE',
        },
      });

      // Add expanded permissions (includes dependencies)
      if (expandedPermissionIds.length > 0) {
        await tx.designationPermission.createMany({
          data: expandedPermissionIds.map((permissionId: string) => ({
            designationId: role.designationId,
            permissionId,
          })),
        });
      }

      return role;
    });

    // Fetch complete role with permissions
    const role = await prisma.designationMaster.findUnique({
      where: { designationId: result.designationId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}
