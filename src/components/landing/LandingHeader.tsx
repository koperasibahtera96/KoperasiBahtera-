"use client";

import LandingNavbar from "./LandingNavbar";
import { VerificationStatusChecker } from "../VerificationStatusChecker";

export default function LandingHeader() {
  return (
    <>
      <VerificationStatusChecker />
      <LandingNavbar />
      {/* Spacer to account for the fixed navbar height so content below doesn't show a gap */}
      {/* <div aria-hidden="true" className="h-16 sm:h-20 lg:h-20" /> */}
    </>
  );
}
