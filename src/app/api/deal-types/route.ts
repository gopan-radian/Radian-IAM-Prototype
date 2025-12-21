import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get all deal types with their phases
export async function GET() {
  try {
    const dealTypes = await prisma.dealType.findMany({
      where: { dealTypeStatus: 'ACTIVE' },
      include: {
        phases: {
          where: { phaseStatus: 'ACTIVE' },
          orderBy: { phaseOrder: 'asc' },
        },
      },
      orderBy: { dealTypeName: 'asc' },
    });

    return NextResponse.json(dealTypes);
  } catch (error) {
    console.error('Error fetching deal types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deal types' },
      { status: 500 }
    );
  }
}
