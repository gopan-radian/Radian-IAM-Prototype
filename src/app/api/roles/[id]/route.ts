import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canAdminAssignPermissions, expandPermissionIds } from '@/lib/permissions';

// GET - Get a single role by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const role = await prisma.designationMaster.findUnique({
      where: { designationId: id },
      include: {
        company: true,
        permissions: {
          include: {
            permission: true,
          },
        },
        userAssignments: {
          where: { assignmentStatus: 'ACTIVE' },
          include: {
            user: {
              select: {
                userId: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role' },
      { status: 500 }
    );
  }
}

// PUT - Update a role
// Enforces that admin can only assign permissions they have
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { designationName, permissionIds, adminUserId } = body as {
      designationName?: string;
      permissionIds?: string[];
      adminUserId?: string;
    };

    // Check if role exists
    const existing = await prisma.designationMaster.findUnique({
      where: { designationId: id },
      include: { company: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Expand permissions to include dependencies
    let expandedPermissionIds: string[] = [];
    if (permissionIds !== undefined && permissionIds.length > 0) {
      expandedPermissionIds = await expandPermissionIds(permissionIds);

      const availablePermissions = await prisma.companyAvailablePermission.findMany({
        where: { companyId: existing.companyId },
      });
      const availablePermissionIds = new Set(availablePermissions.map((p) => p.permissionId));

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
          existing.companyId,
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

    // Check for duplicate name if changing
    if (designationName && designationName !== existing.designationName) {
      const duplicate = await prisma.designationMaster.findFirst({
        where: {
          companyId: existing.companyId,
          designationName,
          designationStatus: 'ACTIVE',
          NOT: { designationId: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A role with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      // Update role name if provided
      if (designationName) {
        await tx.designationMaster.update({
          where: { designationId: id },
          data: { designationName },
        });
      }

      // Update permissions if provided (use expanded permissions)
      if (permissionIds !== undefined) {
        // Remove all existing permissions
        await tx.designationPermission.deleteMany({
          where: { designationId: id },
        });

        // Add expanded permissions (includes dependencies)
        if (expandedPermissionIds.length > 0) {
          await tx.designationPermission.createMany({
            data: expandedPermissionIds.map((permissionId: string) => ({
              designationId: id,
              permissionId,
            })),
          });
        }
      }
    });

    // Fetch updated role
    const role = await prisma.designationMaster.findUnique({
      where: { designationId: id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    return NextResponse.json(role);
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate a role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if role exists
    const existing = await prisma.designationMaster.findUnique({
      where: { designationId: id },
      include: {
        _count: {
          select: { userAssignments: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if role has active user assignments
    const activeAssignments = await prisma.userCompanyAssignment.count({
      where: {
        designationId: id,
        assignmentStatus: 'ACTIVE',
      },
    });

    if (activeAssignments > 0) {
      return NextResponse.json(
        { error: `Cannot delete role with ${activeAssignments} active user(s). Reassign users first.` },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.designationMaster.update({
      where: { designationId: id },
      data: { designationStatus: 'INACTIVE' },
    });

    return NextResponse.json({ message: 'Role deactivated successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}
