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
        identifier: { label: "Email atau No. HP", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("Email/No. HP dan password wajib diisi");
        }

        try {
          await dbConnect();

          // Helper to normalize Indonesian phone numbers
          const normalizePhone = (input: string) => {
            let v = input.replace(/\s|\-/g, ""); // remove spaces and dashes
            // Remove parentheses and dots if any
            v = v.replace(/[().]/g, "");

            if (v.startsWith("+62")) return v;
            if (v.startsWith("62")) return "+" + v; // to +62
            if (v.startsWith("0")) return "+62" + v.slice(1);
            return v; // return as-is; DB regex will still enforce valid numbers on registration
          };

          const isEmail = credentials.identifier.includes("@");
          const identifier = credentials.identifier.trim();

          let user = null as any;
          if (isEmail) {
            user = await User.findOne({
              email: identifier.toLowerCase(),
              isActive: true,
            });
          } else {
            const plus62 = normalizePhone(identifier);
            // Also prepare alternative zero-leading in case DB stored with 0 prefix
            let zeroLeading = identifier;
            if (plus62.startsWith("+62")) {
              zeroLeading = "0" + plus62.slice(3);
            } else if (identifier.startsWith("62")) {
              zeroLeading = "0" + identifier.slice(2);
            }

            user = await User.findOne({
              isActive: true,
              $or: [
                { phoneNumber: plus62 },
                { phoneNumber: zeroLeading },
                { phoneNumber: identifier },
              ],
            });
          }

          if (!user) {
            throw new Error("Email/No. HP atau password tidak valid");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("Email/No. HP atau password tidak valid");
          }

          // Update last login
          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.fullName,
            role: user.role,
            isVerified: user.isEmailVerified,
            isActive: user.isActive,
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
    maxAge: 7 * 24 * 60 * 60, // 7 days for better mobile QR experience
    updateAge: 24 * 60 * 60, // Update token daily
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.name = user.name; // Store fullName from user
        token.role = user.role;
        token.isVerified = user.isVerified;
        token.isActive = (user as any).isActive; // Add isActive to token
        token.userCode = user.userCode;
        token.occupationCode = user.occupationCode;
        token.phoneNumber = user.phoneNumber;
        token.province = user.province;
        token.city = user.city;
        token.verificationStatus = user.verificationStatus;
        token.canPurchase = user.canPurchase;
        token.profileImageUrl = (user as any).profileImageUrl;
        // Ensure email on token is always in sync at sign-in
        if ((user as any).email) {
          token.email = (user as any).email as string;
        }
      }

      // Handle session updates by fetching fresh data from database
      if (trigger === "update" && token.sub) {
        try {
          await dbConnect();
          const dbUser = await User.findById(token.sub).select("-password");
          if (dbUser) {
            token.name = dbUser.fullName;
            token.role = dbUser.role;
            token.isVerified = dbUser.isEmailVerified;
            token.isActive = dbUser.isActive; // Update isActive in token
            token.userCode = dbUser.userCode;
            token.occupationCode = dbUser.occupationCode;
            token.phoneNumber = dbUser.phoneNumber;
            token.province = dbUser.province;
            token.city = dbUser.city;
            token.verificationStatus = dbUser.verificationStatus;
            token.canPurchase = dbUser.canPurchase;
            token.profileImageUrl = dbUser.profileImageUrl;
            token.email = dbUser.email;
          }
        } catch (error) {
          console.error("Error updating token from database:", error);
        }
      }

      // IMPORTANT: Always refresh isActive status from DB on every JWT callback
      // This ensures deactivated users are logged out quickly without waiting for token expiry
      if (token.sub) {
        try {
          await dbConnect();
          const dbUser = await User.findById(token.sub).select("isActive");
          if (dbUser) {
            token.isActive = dbUser.isActive;
          } else {
            // User was deleted, mark as inactive
            token.isActive = false;
          }
        } catch (error) {
          console.error("Error checking user isActive status:", error);
          // Keep existing isActive value on error
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.name = token.name as string; // Map fullName to session
        session.user.role = token.role as string;
        session.user.isVerified = token.isVerified as boolean;
        session.user.isActive = token.isActive as boolean;
        session.user.userCode = token.userCode as string;
        session.user.occupationCode = token.occupationCode as string;
        session.user.phoneNumber = token.phoneNumber as string;
        session.user.province = token.province as string;
        session.user.city = token.city as string;
        session.user.verificationStatus = token.verificationStatus as string;
        session.user.canPurchase = token.canPurchase as boolean;
        session.user.profileImageUrl = token.profileImageUrl as string;
        // Map email from token, if present
        if (token.email) {
          session.user.email = token.email as string;
        }
      }
      // Safety net: fetch the latest email, name, and isActive to avoid stale session after admin changes
      try {
        if (token.sub) {
          await dbConnect();
          const dbUser = await User.findById(token.sub).select("email fullName isActive");
          if (dbUser && session.user) {
            session.user.email = dbUser.email;
            session.user.name = dbUser.fullName;
            
            // Force logout if user is deactivated
            if (!dbUser.isActive) {
              throw new Error("User account has been deactivated");
            }
          } else if (!dbUser) {
            // User was deleted
            throw new Error("User account not found");
          }
        }
      } catch (error) {
        console.error("Error verifying user session:", error);
        // Return null session to force logout
        throw error;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
