import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

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
                  company: {
                    include: {
                      services: {
                        where: { isEnabled: true },
                        include: { service: true },
                      },
                    },
                  },
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

          // Map assignments with permissions from role
          const assignments = user.companyAssignments.map((assignment) => {
            const permissions = assignment.designation.permissions.map(
              (p) => p.permission.permissionKey
            );
            const services = assignment.company.services.map(
              (s) => s.service.serviceKey
            );

            return {
              userCompanyAssignmentId: assignment.userCompanyAssignmentId,
              companyId: assignment.companyId,
              companyName: assignment.company.companyName,
              companyType: assignment.company.companyType,
              designationId: assignment.designationId,
              designationName: assignment.designation.designationName,
              companyRelationshipId: assignment.companyRelationshipId,
              companyRelationship: assignment.companyRelationship,
              permissions,
              services,
            };
          });

          return {
            id: user.userId,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            assignments,
          };
        } catch (error) {
          console.error('Auth authorize error:', error);
          return null;
        }
      },
    }),
  ],
};
