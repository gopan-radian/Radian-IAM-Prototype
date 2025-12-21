import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - List all relationships
export async function GET() {
  try {
    const relationships = await prisma.companyRelationship.findMany({
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
        _count: {
          select: {
            userAssignments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(relationships);
  } catch (error) {
    console.error('Error fetching relationships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relationships' },
      { status: 500 }
    );
  }
}

// POST - Create a new relationship
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromCompanyId, toCompanyId, relationshipType } = body;

    if (!fromCompanyId || !toCompanyId || !relationshipType) {
      return NextResponse.json(
        { error: 'fromCompanyId, toCompanyId, and relationshipType are required' },
        { status: 400 }
      );
    }

    // Validate companies exist
    const [fromCompany, toCompany] = await Promise.all([
      prisma.companyMaster.findUnique({ where: { companyId: fromCompanyId } }),
      prisma.companyMaster.findUnique({ where: { companyId: toCompanyId } }),
    ]);

    if (!fromCompany) {
      return NextResponse.json(
        { error: 'From company not found' },
        { status: 404 }
      );
    }

    if (!toCompany) {
      return NextResponse.json(
        { error: 'To company not found' },
        { status: 404 }
      );
    }

    // Validate relationship type
    const validTypes = ['MERCHANT_SUPPLIER', 'BROKER_SUPPLIER', 'PARTNER'];
    if (!validTypes.includes(relationshipType)) {
      return NextResponse.json(
        { error: 'Invalid relationship type. Must be one of: MERCHANT_SUPPLIER, BROKER_SUPPLIER, PARTNER' },
        { status: 400 }
      );
    }

    // Validate relationship makes sense based on company types
    if (relationshipType === 'MERCHANT_SUPPLIER') {
      if (fromCompany.companyType !== 'MERCHANT') {
        return NextResponse.json(
          { error: 'For MERCHANT_SUPPLIER relationship, fromCompany must be a MERCHANT' },
          { status: 400 }
        );
      }
      if (toCompany.companyType !== 'SUPPLIER') {
        return NextResponse.json(
          { error: 'For MERCHANT_SUPPLIER relationship, toCompany must be a SUPPLIER' },
          { status: 400 }
        );
      }
    }

    if (relationshipType === 'BROKER_SUPPLIER') {
      if (fromCompany.companyType !== 'BROKER') {
        return NextResponse.json(
          { error: 'For BROKER_SUPPLIER relationship, fromCompany must be a BROKER' },
          { status: 400 }
        );
      }
      if (toCompany.companyType !== 'SUPPLIER') {
        return NextResponse.json(
          { error: 'For BROKER_SUPPLIER relationship, toCompany must be a SUPPLIER' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate relationship
    const existing = await prisma.companyRelationship.findFirst({
      where: {
        fromCompanyId,
        toCompanyId,
        relationshipType,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This relationship already exists' },
        { status: 400 }
      );
    }

    const relationship = await prisma.companyRelationship.create({
      data: {
        fromCompanyId,
        toCompanyId,
        relationshipType,
        relationshipStatus: 'ACTIVE',
      },
      include: {
        fromCompany: true,
        toCompany: true,
      },
    });

    return NextResponse.json(relationship, { status: 201 });
  } catch (error) {
    console.error('Error creating relationship:', error);
    return NextResponse.json(
      { error: 'Failed to create relationship' },
      { status: 500 }
    );
  }
}
