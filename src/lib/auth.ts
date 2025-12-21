import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

/**
 * Compute effective permissions for an assignment
 * Base permissions from role + ALLOW overrides - DENY overrides
 */
async function computeEffectivePermissions(
  userId: string,
  companyId: string,
  companyRelationshipId: string | null,
  rolePermissions: { permission: { permissionKey: string } }[]
): Promise<string[]> {
  // Start with base permissions from role
  const permissions = new Set(
    rolePermissions.map((p) => p.permission.permissionKey)
  );

  // Get user's permission overrides for this company
  const overrides = await prisma.userPermissionOverride.findMany({
    where: {
      userId,
      companyId,
      overrideStatus: 'ACTIVE',
      OR: [
        { companyRelationshipId: null },
        { companyRelationshipId: companyRelationshipId },
      ],
    },
    include: {
      permission: true,
    },
  });

  // Apply overrides
  for (const override of overrides) {
    if (override.effect === 'ALLOW') {
      permissions.add(override.permission.permissionKey);
    } else if (override.effect === 'DENY') {
      permissions.delete(override.permission.permissionKey);
    }
  }

  return Array.from(permissions);
}

export const authOptions: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.userId = user.id;
        token.assignments = user.assignments;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.userId = token.userId;
        session.user.assignments = token.assignments;
      }
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.userMaster.findUnique({
            where: { email: credentials.email as string },
            include: {
              companyAssignments: {
                where: { assignmentStatus: 'ACTIVE' },
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
            console.error('User not found:', credentials.email);
            return null;
          }

          console.log('Found user:', user.email);

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) {
            console.error('Invalid password for user:', credentials.email);
            return null;
          }

          // Compute effective permissions for each assignment (includes overrides)
          const assignmentsWithEffectivePermissions = await Promise.all(
            user.companyAssignments.map(async (assignment) => {
              const effectivePermissions = await computeEffectivePermissions(
                user.userId,
                assignment.companyId,
                assignment.companyRelationshipId,
                assignment.designation.permissions
              );

              return {
                ...assignment,
                // Add computed permissions that include overrides
                effectivePermissions,
              };
            })
          );

          return {
            id: user.userId,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            assignments: assignmentsWithEffectivePermissions as any,
          };
        } catch (error) {
          console.error('Auth authorize error:', error);
          return null;
        }
      },
    }),
  ],
};
