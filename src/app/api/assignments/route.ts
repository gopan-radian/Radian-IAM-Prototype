import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canAdminAssignPermissions } from '@/lib/permissions';

interface PermissionOverride {
  permissionId: string;
  effect: 'ALLOW' | 'DENY';
  reason?: string;
}

/**
 * GET /api/assignments?companyId=xxx
 * List all assignments for a company
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    const assignments = await prisma.userCompanyAssignment.findMany({
      where: {
        companyId,
        assignmentStatus: 'ACTIVE',
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Also get permission overrides for each assignment
    const assignmentsWithOverrides = await Promise.all(
      assignments.map(async (assignment) => {
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

        return {
          ...assignment,
          permissionOverrides: overrides,
        };
      })
    );

    return NextResponse.json(assignmentsWithOverrides);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assignments
 * Assign an existing user to a company
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      companyId,
      designationId,
      companyRelationshipId,
      permissionOverrides,
      adminUserId, // The admin making this assignment
    } = body as {
      userId: string;
      companyId: string;
      designationId: string;
      companyRelationshipId?: string;
      permissionOverrides?: PermissionOverride[];
      adminUserId: string;
    };

    // Validate required fields
    if (!userId || !companyId || !designationId || !adminUserId) {
      return NextResponse.json(
        { error: 'userId, companyId, designationId, and adminUserId are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.userMaster.findUnique({
      where: { userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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

    // Verify designation exists and belongs to company
    const designation = await prisma.designationMaster.findUnique({
      where: { designationId },
      include: {
        permissions: true,
      },
    });

    if (!designation || designation.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Designation not found or does not belong to the specified company' },
        { status: 400 }
      );
    }

    // Verify relationship if provided
    if (companyRelationshipId) {
      const relationship = await prisma.companyRelationship.findUnique({
        where: { companyRelationshipId },
      });

      if (!relationship) {
        return NextResponse.json(
          { error: 'Company relationship not found' },
          { status: 404 }
        );
      }

      if (relationship.fromCompanyId !== companyId && relationship.toCompanyId !== companyId) {
        return NextResponse.json(
          { error: 'Relationship does not involve the specified company' },
          { status: 400 }
        );
      }
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.userCompanyAssignment.findFirst({
      where: {
        userId,
        companyId,
        companyRelationshipId: companyRelationshipId || null,
        assignmentStatus: 'ACTIVE',
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already assigned to this company with this relationship scope' },
        { status: 400 }
      );
    }

    // Collect all permission IDs being assigned (from role + overrides)
    const rolePermissionIds = designation.permissions.map((p) => p.permissionId);
    const allowOverrideIds = (permissionOverrides || [])
      .filter((o) => o.effect === 'ALLOW')
      .map((o) => o.permissionId);
    const allPermissionIds = [...rolePermissionIds, ...allowOverrideIds];

    // Verify admin has all permissions they are trying to assign
    const { allowed, forbidden } = await canAdminAssignPermissions(
      adminUserId,
      companyId,
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

    // Create assignment and overrides in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the assignment
      const assignment = await tx.userCompanyAssignment.create({
        data: {
          userId,
          companyId,
          designationId,
          companyRelationshipId: companyRelationshipId || null,
          assignmentStatus: 'ACTIVE',
        },
        include: {
          user: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
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

      // Create permission overrides if any
      const createdOverrides = [];
      if (permissionOverrides && permissionOverrides.length > 0) {
        for (const override of permissionOverrides) {
          const created = await tx.userPermissionOverride.create({
            data: {
              userId,
              companyId,
              companyRelationshipId: companyRelationshipId || null,
              permissionId: override.permissionId,
              effect: override.effect,
              reason: override.reason || null,
              overrideStatus: 'ACTIVE',
              createdByUserId: adminUserId,
            },
            include: {
              permission: true,
            },
          });
          createdOverrides.push(created);
        }
      }

      return {
        ...assignment,
        permissionOverrides: createdOverrides,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
}
