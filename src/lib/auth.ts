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
          console.log('Stored hash:', user.password);
          console.log('Password to compare:', credentials.password);

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );
          console.log('bcrypt.compare result:', isValid);

          if (!isValid) {
            console.error('Invalid password for user:', credentials.email);
            return null;
          }

          return {
            id: user.userId,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            assignments: user.companyAssignments as any,
          };
        } catch (error) {
          console.error('Auth authorize error:', error);
          return null;
        }
      },
    }),
  ],
};
