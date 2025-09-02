'use client';

import LandingNavbar from './LandingNavbar';
import { VerificationStatusChecker } from '../VerificationStatusChecker';

export default function LandingHeader() {
  return (
    <>
      <VerificationStatusChecker />
      <header className="w-full fixed top-0 z-50">
        <LandingNavbar />
      </header>
    </>
  );
}