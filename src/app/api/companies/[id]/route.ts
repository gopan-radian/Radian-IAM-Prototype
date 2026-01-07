import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get a single company by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const company = await prisma.companyMaster.findUnique({
      where: { companyId: id },
      include: {
        designations: {
          include: {
            _count: {
              select: { userAssignments: true },
            },
          },
        },
        services: {
          include: {
            service: true,
          },
        },
        relationshipsAsFrom: {
          include: {
            toCompany: true,
          },
        },
        relationshipsAsTo: {
          include: {
            fromCompany: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
}

// PUT - Update a company
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { companyName, companyType, isClient, companyStatus } = body;

    // Check if company exists
    const existing = await prisma.companyMaster.findUnique({
      where: { companyId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Validate company type if provided
    if (companyType) {
      const validTypes = ['RADIAN', 'MERCHANT', 'SUPPLIER', 'BROKER'];
      if (!validTypes.includes(companyType)) {
        return NextResponse.json(
          { error: 'Invalid company type' },
          { status: 400 }
        );
      }
    }

    const company = await prisma.companyMaster.update({
      where: { companyId: id },
      data: {
        ...(companyName && { companyName }),
        ...(companyType && { companyType }),
        ...(typeof isClient === 'boolean' && { isClient }),
        ...(companyStatus && { companyStatus }),
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a company (soft delete by setting status to INACTIVE)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if company exists
    const existing = await prisma.companyMaster.findUnique({
      where: { companyId: id },
      include: {
        _count: {
          select: {
            userAssignments: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Prevent deletion if company has active users
    if (existing._count.userAssignments > 0) {
      return NextResponse.json(
        { error: 'Cannot delete company with active user assignments' },
        { status: 400 }
      );
    }

    // Soft delete by setting status to INACTIVE
    const company = await prisma.companyMaster.update({
      where: { companyId: id },
      data: { companyStatus: 'INACTIVE' },
    });

    return NextResponse.json({ message: 'Company deactivated successfully', company });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
}
