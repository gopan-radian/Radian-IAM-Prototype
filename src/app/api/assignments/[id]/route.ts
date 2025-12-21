import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canAdminAssignPermissions } from '@/lib/permissions';

interface PermissionOverride {
  permissionId: string;
  effect: 'ALLOW' | 'DENY';
  reason?: string;
}

/**
 * GET /api/assignments/[id]
 * Get a single assignment with details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const assignment = await prisma.userCompanyAssignment.findUnique({
      where: { userCompanyAssignmentId: id },
      include: {
        user: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
          },
        },
        company: {
          select: {
            companyId: true,
            companyName: true,
            companyType: true,
          },
        },
        designation: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        companyRelationship: {
          include: {
            fromCompany: {
              select: {
                companyId: true,
                companyName: true,
                companyType: true,
              },
            },
            toCompany: {
              select: {
                companyId: true,
                companyName: true,
                companyType: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Get permission overrides for this user/company
    const overrides = await prisma.userPermissionOverride.findMany({
      where: {
        userId: assignment.userId,
        companyId: assignment.companyId,
        overrideStatus: 'ACTIVE',
        OR: [
          { companyRelationshipId: null },
          { companyRelationshipId: assignment.companyRelationshipId },
        ],
      },
      include: {
        permission: true,
      },
    });

    return NextResponse.json({
      ...assignment,
      permissionOverrides: overrides,
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/assignments/[id]
 * Update an assignment (change role and/or overrides)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      designationId,
      permissionOverrides,
      adminUserId,
    } = body as {
      designationId?: string;
      permissionOverrides?: PermissionOverride[];
      adminUserId: string;
    };

    if (!adminUserId) {
      return NextResponse.json(
        { error: 'adminUserId is required' },
        { status: 400 }
      );
    }

    // Get existing assignment
    const existing = await prisma.userCompanyAssignment.findUnique({
      where: { userCompanyAssignmentId: id },
      include: {
        designation: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // If changing designation, verify it belongs to company
    let newDesignation = existing.designation;
    if (designationId && designationId !== existing.designationId) {
      const designation = await prisma.designationMaster.findUnique({
        where: { designationId },
        include: {
          permissions: true,
        },
      });

      if (!designation || designation.companyId !== existing.companyId) {
        return NextResponse.json(
          { error: 'Designation not found or does not belong to the company' },
          { status: 400 }
        );
      }

      newDesignation = designation;
    }

    // Collect all permission IDs being assigned
    const rolePermissionIds = newDesignation.permissions.map((p) => p.permissionId);
    const allowOverrideIds = (permissionOverrides || [])
      .filter((o) => o.effect === 'ALLOW')
      .map((o) => o.permissionId);
    const allPermissionIds = [...rolePermissionIds, ...allowOverrideIds];

    // Verify admin has all permissions they are trying to assign
    const { allowed, forbidden } = await canAdminAssignPermissions(
      adminUserId,
      existing.companyId,
      allPermissionIds
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

    // Update assignment and overrides in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the assignment if designation changed
      if (designationId && designationId !== existing.designationId) {
        await tx.userCompanyAssignment.update({
          where: { userCompanyAssignmentId: id },
          data: { designationId },
        });
      }

      // If permissionOverrides provided, replace all existing overrides
      if (permissionOverrides !== undefined) {
        // Deactivate existing overrides for this user/company/relationship
        await tx.userPermissionOverride.updateMany({
          where: {
            userId: existing.userId,
            companyId: existing.companyId,
            companyRelationshipId: existing.companyRelationshipId,
            overrideStatus: 'ACTIVE',
          },
          data: {
            overrideStatus: 'INACTIVE',
          },
        });

        // Create new overrides
        for (const override of permissionOverrides) {
          await tx.userPermissionOverride.create({
            data: {
              userId: existing.userId,
              companyId: existing.companyId,
              companyRelationshipId: existing.companyRelationshipId,
              permissionId: override.permissionId,
              effect: override.effect,
              reason: override.reason || null,
              overrideStatus: 'ACTIVE',
              createdByUserId: adminUserId,
            },
          });
        }
      }

      // Fetch updated assignment with all relations
      const finalAssignment = await tx.userCompanyAssignment.findUnique({
        where: { userCompanyAssignmentId: id },
        include: {
          user: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
            },
          },
          designation: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
          companyRelationship: {
            include: {
              fromCompany: true,
              toCompany: true,
            },
          },
        },
      });

      // Get updated overrides
      const updatedOverrides = await tx.userPermissionOverride.findMany({
        where: {
          userId: existing.userId,
          companyId: existing.companyId,
          overrideStatus: 'ACTIVE',
          OR: [
            { companyRelationshipId: null },
            { companyRelationshipId: existing.companyRelationshipId },
          ],
        },
        include: {
          permission: true,
        },
      });

      return {
        ...finalAssignment,
        permissionOverrides: updatedOverrides,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update assignment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assignments/[id]
 * Soft delete an assignment (sets status to INACTIVE)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.userCompanyAssignment.findUnique({
      where: { userCompanyAssignmentId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Soft delete assignment and related overrides in transaction
    await prisma.$transaction([
      prisma.userCompanyAssignment.update({
        where: { userCompanyAssignmentId: id },
        data: { assignmentStatus: 'INACTIVE' },
      }),
      prisma.userPermissionOverride.updateMany({
        where: {
          userId: existing.userId,
          companyId: existing.companyId,
          companyRelationshipId: existing.companyRelationshipId,
          overrideStatus: 'ACTIVE',
        },
        data: { overrideStatus: 'INACTIVE' },
      }),
    ]);

    return NextResponse.json({ message: 'Assignment removed successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove assignment' },
      { status: 500 }
    );
  }
}
