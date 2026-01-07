import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    return NextResponse.json(assignments);
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
    } = body as {
      userId: string;
      companyId: string;
      designationId: string;
      companyRelationshipId?: string;
    };

    // Validate required fields
    if (!userId || !companyId || !designationId) {
      return NextResponse.json(
        { error: 'userId, companyId, and designationId are required' },
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

    // Create the assignment
    const assignment = await prisma.userCompanyAssignment.create({
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

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
}
