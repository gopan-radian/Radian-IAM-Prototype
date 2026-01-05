import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/bundles - Get available permission bundles
 *
 * Query params:
 * - companyId: Filter to bundles available for this company (system + company-specific)
 * - type: 'system' | 'company' | 'all' (default: 'all')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const type = searchParams.get('type') || 'all';

    // Build where clause
    const whereClause: any = {
      bundleStatus: 'ACTIVE',
    };

    if (type === 'system') {
      whereClause.companyId = null;
    } else if (type === 'company' && companyId) {
      whereClause.companyId = companyId;
    } else if (companyId) {
      // Get both system bundles and company-specific bundles
      whereClause.OR = [
        { companyId: null },
        { companyId: companyId },
      ];
    }

    const bundles = await prisma.permissionBundle.findMany({
      where: whereClause,
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
        _count: {
          select: {
            designationBundles: true,
            userBundleAssignments: true,
          },
        },
      },
      orderBy: [
        { companyId: 'asc' }, // System bundles first (null)
        { bundleName: 'asc' },
      ],
    });

    // Transform response
    const response = bundles.map((bundle) => ({
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
      usageCount: {
        roles: bundle._count.designationBundles,
        users: bundle._count.userBundleAssignments,
      },
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Bundles GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bundles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bundles - Create a new permission bundle
 *
 * Body:
 * - bundleName: string (required)
 * - bundleDescription?: string
 * - companyId?: string (null for system bundles - Radian only)
 * - permissionIds: string[] (required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bundleName, bundleDescription, companyId, permissionIds } = body;

    if (!bundleName || !Array.isArray(permissionIds) || permissionIds.length === 0) {
      return NextResponse.json(
        { error: 'bundleName and permissionIds are required' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.permissionBundle.findFirst({
      where: {
        bundleName,
        companyId: companyId || null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A bundle with this name already exists' },
        { status: 409 }
      );
    }

    // Create bundle with permissions in a transaction
    const bundle = await prisma.$transaction(async (tx) => {
      const newBundle = await tx.permissionBundle.create({
        data: {
          bundleName,
          bundleDescription,
          companyId: companyId || null,
        },
      });

      // Add permissions to bundle
      await tx.bundlePermission.createMany({
        data: permissionIds.map((permissionId: string) => ({
          bundleId: newBundle.bundleId,
          permissionId,
        })),
      });

      return tx.permissionBundle.findUnique({
        where: { bundleId: newBundle.bundleId },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });

    return NextResponse.json(bundle, { status: 201 });
  } catch (error) {
    console.error('Bundles POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to create bundle' },
      { status: 500 }
    );
  }
}
