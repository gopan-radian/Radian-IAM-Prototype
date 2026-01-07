import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/assignments/[id]
 * Get a single assignment with details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const assignment = await prisma.userCompanyAssignment.findUnique({
      where: { userCompanyAssignmentId: id },
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
        company: {
          select: {
            companyId: true,
            companyName: true,
            companyType: true,
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
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/assignments/[id]
 * Update an assignment (change role)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { designationId } = body as {
      designationId?: string;
    };

    // Get existing assignment
    const existing = await prisma.userCompanyAssignment.findUnique({
      where: { userCompanyAssignmentId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // If changing designation, verify it belongs to company
    if (designationId && designationId !== existing.designationId) {
      const designation = await prisma.designationMaster.findUnique({
        where: { designationId },
      });

      if (!designation || designation.companyId !== existing.companyId) {
        return NextResponse.json(
          { error: 'Designation not found or does not belong to the company' },
          { status: 400 }
        );
      }

      // Update the assignment
      await prisma.userCompanyAssignment.update({
        where: { userCompanyAssignmentId: id },
        data: { designationId },
      });
    }

    // Fetch updated assignment with all relations
    const updatedAssignment = await prisma.userCompanyAssignment.findUnique({
      where: { userCompanyAssignmentId: id },
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
            fromCompany: true,
            toCompany: true,
          },
        },
      },
    });

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update assignment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assignments/[id]
 * Soft delete an assignment (sets status to INACTIVE)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.userCompanyAssignment.findUnique({
      where: { userCompanyAssignmentId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Soft delete assignment
    await prisma.userCompanyAssignment.update({
      where: { userCompanyAssignmentId: id },
      data: { assignmentStatus: 'INACTIVE' },
    });

    return NextResponse.json({ message: 'Assignment removed successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove assignment' },
      { status: 500 }
    );
  }
}
