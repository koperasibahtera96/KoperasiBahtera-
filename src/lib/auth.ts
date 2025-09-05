import User from "@/models/User";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "./mongodb";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan password wajib diisi");
        }

        try {
          await dbConnect();

          const user = await User.findOne({
            email: credentials.email.toLowerCase().trim(),
            isActive: true,
          });

          if (!user) {
            throw new Error("Email atau password tidak valid");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("Email atau password tidak valid");
          }

          // Update last login
          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.fullName,
            role: user.role,
            isVerified: user.isEmailVerified,
            userCode: user.userCode,
            occupationCode: user.occupationCode,
            phoneNumber: user.phoneNumber,
            province: user.province,
            city: user.city,
            verificationStatus: user.verificationStatus,
            canPurchase: user.canPurchase,
            profileImageUrl: user.profileImageUrl,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        token.isVerified = user.isVerified;
        token.userCode = user.userCode;
        token.occupationCode = user.occupationCode;
        token.phoneNumber = user.phoneNumber;
        token.province = user.province;
        token.city = user.city;
        token.verificationStatus = user.verificationStatus;
        token.canPurchase = user.canPurchase;
        token.profileImageUrl = (user as any).profileImageUrl;
      }

      // Handle session updates by fetching fresh data from database
      if (trigger === "update" && token.sub) {
        try {
          await dbConnect();
          const dbUser = await User.findById(token.sub).select("-password");
          if (dbUser) {
            token.role = dbUser.role;
            token.isVerified = dbUser.isEmailVerified;
            token.userCode = dbUser.userCode;
            token.occupationCode = dbUser.occupationCode;
            token.phoneNumber = dbUser.phoneNumber;
            token.province = dbUser.province;
            token.city = dbUser.city;
            token.verificationStatus = dbUser.verificationStatus;
            token.canPurchase = dbUser.canPurchase;
            token.profileImageUrl = dbUser.profileImageUrl;
          }
        } catch (error) {
          console.error("Error updating token from database:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.isVerified = token.isVerified as boolean;
        session.user.userCode = token.userCode as string;
        session.user.occupationCode = token.occupationCode as string;
        session.user.phoneNumber = token.phoneNumber as string;
        session.user.province = token.province as string;
        session.user.city = token.city as string;
        session.user.verificationStatus = token.verificationStatus as string;
        session.user.canPurchase = token.canPurchase as boolean;
        session.user.profileImageUrl = token.profileImageUrl as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
