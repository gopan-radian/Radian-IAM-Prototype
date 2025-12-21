import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET - Get a single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.userMaster.findUnique({
      where: { userId: id },
      select: {
        userId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        companyAssignments: {
          include: {
            company: true,
            designation: {
              include: {
                permissions: {
                  include: { permission: true },
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
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT - Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { firstName, lastName, middleName, email, phone, status, password } = body;

    // Check if user exists
    const existing = await prisma.userMaster.findUnique({
      where: { userId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check email uniqueness if changing
    if (email && email !== existing.email) {
      const emailExists = await prisma.userMaster.findUnique({
        where: { email },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already in use by another user' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (middleName !== undefined) updateData.middleName = middleName;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (status) updateData.status = status;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await prisma.userMaster.update({
      where: { userId: id },
      data: updateData,
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if user exists
    const existing = await prisma.userMaster.findUnique({
      where: { userId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to INACTIVE
    await prisma.$transaction([
      prisma.userMaster.update({
        where: { userId: id },
        data: { status: 'INACTIVE' },
      }),
      prisma.userCompanyAssignment.updateMany({
        where: { userId: id },
        data: { assignmentStatus: 'INACTIVE' },
      }),
    ]);

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
