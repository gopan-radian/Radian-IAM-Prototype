import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get a single relationship by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const relationship = await prisma.companyRelationship.findUnique({
      where: { companyRelationshipId: id },
      include: {
        fromCompany: true,
        toCompany: true,
        userAssignments: {
          include: {
            user: {
              select: {
                userId: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            designation: true,
          },
        },
      },
    });

    if (!relationship) {
      return NextResponse.json(
        { error: 'Relationship not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(relationship);
  } catch (error) {
    console.error('Error fetching relationship:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relationship' },
      { status: 500 }
    );
  }
}

// PUT - Update a relationship status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { relationshipStatus } = body;

    // Check if relationship exists
    const existing = await prisma.companyRelationship.findUnique({
      where: { companyRelationshipId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Relationship not found' },
        { status: 404 }
      );
    }

    // Validate status
    if (relationshipStatus && !['ACTIVE', 'INACTIVE', 'PENDING'].includes(relationshipStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACTIVE, INACTIVE, or PENDING' },
        { status: 400 }
      );
    }

    const relationship = await prisma.companyRelationship.update({
      where: { companyRelationshipId: id },
      data: {
        ...(relationshipStatus && { relationshipStatus }),
      },
      include: {
        fromCompany: true,
        toCompany: true,
      },
    });

    return NextResponse.json(relationship);
  } catch (error) {
    console.error('Error updating relationship:', error);
    return NextResponse.json(
      { error: 'Failed to update relationship' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a relationship (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if relationship exists
    const existing = await prisma.companyRelationship.findUnique({
      where: { companyRelationshipId: id },
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
        { error: 'Relationship not found' },
        { status: 404 }
      );
    }

    // Warn if there are user assignments
    if (existing._count.userAssignments > 0) {
      // First deactivate user assignments for this relationship
      await prisma.userCompanyAssignment.updateMany({
        where: { companyRelationshipId: id },
        data: { assignmentStatus: 'INACTIVE' },
      });
    }

    // Soft delete by setting status to INACTIVE
    const relationship = await prisma.companyRelationship.update({
      where: { companyRelationshipId: id },
      data: { relationshipStatus: 'INACTIVE' },
    });

    return NextResponse.json({
      message: 'Relationship deactivated successfully',
      relationship,
      deactivatedAssignments: existing._count.userAssignments,
    });
  } catch (error) {
    console.error('Error deleting relationship:', error);
    return NextResponse.json(
      { error: 'Failed to delete relationship' },
      { status: 500 }
    );
  }
}
