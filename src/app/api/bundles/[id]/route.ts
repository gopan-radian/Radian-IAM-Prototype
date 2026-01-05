import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bundles/[id] - Get a specific bundle with its permissions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const bundle = await prisma.permissionBundle.findUnique({
      where: { bundleId: id },
      include: {
        company: {
          select: {
            companyId: true,
            companyName: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
        designationBundles: {
          include: {
            designation: {
              select: {
                designationId: true,
                designationName: true,
                company: {
                  select: {
                    companyId: true,
                    companyName: true,
                  },
                },
              },
            },
          },
        },
        userBundleAssignments: {
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
            company: {
              select: {
                companyId: true,
                companyName: true,
              },
            },
          },
        },
      },
    });

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    // Transform response
    const response = {
      bundleId: bundle.bundleId,
      bundleName: bundle.bundleName,
      bundleDescription: bundle.bundleDescription,
      bundleStatus: bundle.bundleStatus,
      isSystemBundle: bundle.companyId === null,
      company: bundle.company,
      permissions: bundle.permissions.map((bp) => ({
        permissionId: bp.permission.permissionId,
        permissionKey: bp.permission.permissionKey,
        permissionDescription: bp.permission.permissionDescription,
        permissionCategory: bp.permission.permissionCategory,
      })),
      assignedToRoles: bundle.designationBundles.map((db) => ({
        designationId: db.designation.designationId,
        designationName: db.designation.designationName,
        company: db.designation.company,
      })),
      assignedToUsers: bundle.userBundleAssignments.map((uba) => ({
        userId: uba.user.userId,
        userName: `${uba.user.firstName} ${uba.user.lastName}`,
        email: uba.user.email,
        company: uba.company,
      })),
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Bundle GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bundle' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/bundles/[id] - Update a bundle
 *
 * Body:
 * - bundleName?: string
 * - bundleDescription?: string
 * - permissionIds?: string[] (replaces all permissions)
 * - bundleStatus?: 'ACTIVE' | 'INACTIVE'
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { bundleName, bundleDescription, permissionIds, bundleStatus } = body;

    // Check bundle exists
    const existing = await prisma.permissionBundle.findUnique({
      where: { bundleId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    // Update in transaction
    const bundle = await prisma.$transaction(async (tx) => {
      // Update bundle fields
      await tx.permissionBundle.update({
        where: { bundleId: id },
        data: {
          ...(bundleName && { bundleName }),
          ...(bundleDescription !== undefined && { bundleDescription }),
          ...(bundleStatus && { bundleStatus }),
        },
      });

      // If permissionIds provided, replace all permissions
      if (Array.isArray(permissionIds)) {
        // Remove existing permissions
        await tx.bundlePermission.deleteMany({
          where: { bundleId: id },
        });

        // Add new permissions
        if (permissionIds.length > 0) {
          await tx.bundlePermission.createMany({
            data: permissionIds.map((permissionId: string) => ({
              bundleId: id,
              permissionId,
            })),
          });
        }
      }

      return tx.permissionBundle.findUnique({
        where: { bundleId: id },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });

    return NextResponse.json(bundle);
  } catch (error) {
    console.error('Bundle PUT API error:', error);
    return NextResponse.json(
      { error: 'Failed to update bundle' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bundles/[id] - Delete a bundle (soft delete if in use)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check bundle exists
    const existing = await prisma.permissionBundle.findUnique({
      where: { bundleId: id },
      include: {
        _count: {
          select: {
            designationBundles: true,
            userBundleAssignments: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    // Check if bundle is in use
    const activeAssignments =
      existing._count.designationBundles + existing._count.userBundleAssignments;

    if (activeAssignments > 0) {
      // Soft delete - set status to INACTIVE
      await prisma.permissionBundle.update({
        where: { bundleId: id },
        data: { bundleStatus: 'INACTIVE' },
      });

      return NextResponse.json({
        message: 'Bundle deactivated (still assigned to roles/users)',
        bundleId: id,
        activeAssignments,
      });
    }

    // Hard delete if not in use
    await prisma.$transaction(async (tx) => {
      // Remove bundle permissions
      await tx.bundlePermission.deleteMany({
        where: { bundleId: id },
      });

      // Delete bundle
      await tx.permissionBundle.delete({
        where: { bundleId: id },
      });
    });

    return NextResponse.json({
      message: 'Bundle deleted',
      bundleId: id,
    });
  } catch (error) {
    console.error('Bundle DELETE API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete bundle' },
      { status: 500 }
    );
  }
}
