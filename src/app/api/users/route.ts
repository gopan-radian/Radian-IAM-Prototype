import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET - List users (optionally filtered by company)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    const where = companyId
      ? {
          companyAssignments: {
            some: {
              companyId,
              assignmentStatus: 'ACTIVE',
            },
          },
        }
      : {};

    const users = await prisma.userMaster.findMany({
      where,
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        companyAssignments: {
          where: companyId ? { companyId, assignmentStatus: 'ACTIVE' } : { assignmentStatus: 'ACTIVE' },
          include: {
            company: {
              select: {
                companyId: true,
                companyName: true,
                companyType: true,
              },
            },
            designation: {
              select: {
                designationId: true,
                designationName: true,
              },
            },
            companyRelationship: {
              include: {
                fromCompany: { select: { companyName: true } },
                toCompany: { select: { companyName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create a new user with company assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      companyId,
      designationId,
      companyRelationshipId,
    } = body as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone?: string;
      companyId: string;
      designationId: string;
      companyRelationshipId?: string;
    };

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !companyId || !designationId) {
      return NextResponse.json(
        { error: 'firstName, lastName, email, password, companyId, and designationId are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.userMaster.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    if (existingUser) {
      // Return 409 Conflict with user info so client can use assignment endpoint
      return NextResponse.json(
        {
          error: 'User with this email already exists',
          exists: true,
          userId: existingUser.userId,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          status: existingUser.status,
        },
        { status: 409 }
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
          { error: 'Relationship not found' },
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and assignment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.userMaster.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          password: hashedPassword,
          phone,
          status: 'ACTIVE',
        },
      });

      // Create company assignment
      const assignment = await tx.userCompanyAssignment.create({
        data: {
          userId: user.userId,
          companyId,
          designationId,
          companyRelationshipId: companyRelationshipId || null,
          assignmentStatus: 'ACTIVE',
        },
      });

      return { user, assignment };
    });

    return NextResponse.json(
      {
        userId: result.user.userId,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        assignmentId: result.assignment.userCompanyAssignmentId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
