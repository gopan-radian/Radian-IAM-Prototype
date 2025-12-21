import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all routes with their permission mappings (for admin/preview purposes)
export async function GET() {
  try {
    const routes = await prisma.route.findMany({
      where: { routeStatus: 'ACTIVE' },
      include: {
        permissions: {
          include: { permission: true },
        },
        parentRoute: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json(routes);
  } catch (error) {
    console.error('Routes GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}

// POST: Filter routes by user permissions (for sidebar)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { permissions } = body;

    if (!permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Invalid permissions array' },
        { status: 400 }
      );
    }

    const routes = await prisma.route.findMany({
      where: { routeStatus: 'ACTIVE' },
      include: {
        permissions: {
          include: { permission: true },
        },
        childRoutes: {
          where: { routeStatus: 'ACTIVE' },
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    const accessibleRoutes = routes.filter((route) => {
      // If route has no permissions, it's accessible to all
      if (route.permissions.length === 0) return true;
      // Check if user has any required permission
      return route.permissions.some((rp) => permissions.includes(rp.permission.permissionKey));
    });

    return NextResponse.json(accessibleRoutes);
  } catch (error) {
    console.error('Routes API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}
