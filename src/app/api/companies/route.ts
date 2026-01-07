import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - List all companies
export async function GET() {
  try {
    const companies = await prisma.companyMaster.findMany({
      include: {
        _count: {
          select: {
            userAssignments: true,
            designations: true,
            services: true,
          },
        },
        relationshipsAsFrom: {
          include: {
            toCompany: {
              select: {
                companyId: true,
                companyName: true,
                companyType: true,
              },
            },
          },
        },
        relationshipsAsTo: {
          include: {
            fromCompany: {
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

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

// POST - Create a new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, companyType, isClient } = body;

    if (!companyName || !companyType) {
      return NextResponse.json(
        { error: 'Company name and type are required' },
        { status: 400 }
      );
    }

    const validTypes = ['RADIAN', 'MERCHANT', 'SUPPLIER', 'BROKER'];
    if (!validTypes.includes(companyType)) {
      return NextResponse.json(
        { error: 'Invalid company type. Must be one of: RADIAN, MERCHANT, SUPPLIER, BROKER' },
        { status: 400 }
      );
    }

    const company = await prisma.companyMaster.create({
      data: {
        companyName,
        companyType,
        isClient: isClient ?? false,
        companyStatus: 'ACTIVE',
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}
