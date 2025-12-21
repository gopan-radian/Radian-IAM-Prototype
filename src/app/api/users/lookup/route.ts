import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/lookup?email=user@example.com
 * Check if a user exists by email
 * Returns minimal info - does NOT expose other company assignments
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await prisma.userMaster.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json({ exists: false });
    }

    // Only return minimal info - don't expose other company assignments
    return NextResponse.json({
      exists: true,
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
    });
  } catch (error) {
    console.error('User lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup user' },
      { status: 500 }
    );
  }
}
