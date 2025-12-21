import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const { handlers } = NextAuth({
  ...authOptions,
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-key-change-in-production',
});

export const { GET, POST } = handlers;
