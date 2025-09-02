'use client';

import { useVerificationStatus } from '@/hooks/useVerificationStatus';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export function VerificationStatusChecker() {
  const { data: session } = useSession();
  const { refreshVerificationStatus } = useVerificationStatus();

  useEffect(() => {
    // Add event listener for focus to check when user returns to tab
    const handleFocus = async () => {
      if (session?.user && (session.user as any).verificationStatus === 'pending') {
        await refreshVerificationStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [session, refreshVerificationStatus]);

  // This component doesn't render anything
  return null;
}