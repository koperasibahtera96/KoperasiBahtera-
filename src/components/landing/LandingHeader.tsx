'use client';

import LandingNavbar from './LandingNavbar';
import { VerificationStatusChecker } from '../VerificationStatusChecker';

export default function LandingHeader() {
  return (
    <>
      <VerificationStatusChecker />
      <LandingNavbar />
    </>
  );
}