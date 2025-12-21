import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - List all permissions
export async function GET() {
  try {
    const permissions = await prisma.permissionMaster.findMany({
      where: { permissionStatus: 'ACTIVE' },
      orderBy: [
        { permissionCategory: 'asc' },
        { permissionKey: 'asc' },
      ],
    });

    // Group by category
    const grouped = permissions.reduce((acc, permission) => {
      const category = permission.permissionCategory;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return NextResponse.json({
      permissions,
      grouped,
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}
