import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import '@/env'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'אימייל', type: 'email' },
        password: { label: 'סיסמה', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('נא להזין אימייל וסיסמה')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            password: true,
            isBanned: true,
            banReason: true,
            isAdmin: true,
            tokenVersion: true,
          },
        })

        if (!user) {
          throw new Error('אימייל או סיסמה שגויים')
        }

        if (user.isBanned) {
          throw new Error('החשבון הושעה. לפרטים צרו קשר עם התמיכה.')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) {
          throw new Error('אימייל או סיסמה שגויים')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          isAdmin: user.isAdmin,
          tokenVersion: user.tokenVersion,
        }
      },
    }),
  ],
  // 7-day session expiry. Prevents stolen tokens from being permanently valid.
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isAdmin = user.isAdmin
        token.tokenVersion = user.tokenVersion
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.isAdmin = token.isAdmin as boolean
        session.user.tokenVersion = token.tokenVersion as number
      }
      return session
    },
  },
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      isAdmin: boolean
      tokenVersion: number
    }
  }

  interface User {
    id: string
    isAdmin: boolean
    tokenVersion: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    isAdmin: boolean
    tokenVersion: number
  }
}
