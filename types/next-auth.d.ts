import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      isVerified: boolean;
      userCode: string;
      occupationCode: string;
      phoneNumber: string;
      province: string;
      city: string;
      verificationStatus: string;
      canPurchase: boolean;
      profileImageUrl: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    isVerified: boolean;
    userCode: string;
    occupationCode: string;
    phoneNumber: string;
    province: string;
    city: string;
    verificationStatus: string;
    canPurchase: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    isVerified: boolean;
    userCode: string;
    occupationCode: string;
    phoneNumber: string;
    province: string;
    city: string;
    verificationStatus: string;
    canPurchase: boolean;
    profileImageUrl: string;
  }
}
