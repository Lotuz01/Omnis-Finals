import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from '@/database';
import bcrypt from 'bcryptjs';

interface ExtendedUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

interface ExtendedToken {
  isAdmin: boolean;
  [key: string]: unknown;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const connection = await connectToDatabase();
          const [rows] = await connection.execute(
            'SELECT * FROM users WHERE username = ?',
            [credentials.username]
          ) as [{ id: number; username: string; password: string; name: string; is_admin: number }[], unknown];

          if (rows.length === 0) {
            connection.end();
            return null;
          }

          const user = rows[0];
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          connection.end();

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id.toString(),
            name: user.name || user.username,
            email: user.username,
            isAdmin: Boolean(user.is_admin)
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.isAdmin = (user as ExtendedUser).isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        return {
          ...session,
          user: {
            ...session.user,
            isAdmin: (token as ExtendedToken).isAdmin
          }
        };
      }
      return session;
    }
  }
};