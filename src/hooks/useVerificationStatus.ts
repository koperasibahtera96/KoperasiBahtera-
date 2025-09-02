import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

export function useVerificationStatus() {
  const { data: session, update } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only check for users who are pending verification
    if (session?.user && (session.user as any).verificationStatus === 'pending') {
      // Check every 10 seconds for more responsive updates
      intervalRef.current = setInterval(async () => {
        try {
          const response = await fetch('/api/user/refresh-session', {
            method: 'POST',
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // If verification status changed, update the session
            if (data.success && data.user && data.user.verificationStatus !== (session.user as any).verificationStatus) {
              // Trigger NextAuth session update
              await update();
              
              // Stop checking once approved or rejected
              if (data.user.verificationStatus !== 'pending' && intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }
          }
        } catch (error) {
          console.error('Error checking verification status:', error);
        }
      }, 10000); // Check every 10 seconds for faster updates
    }

    // Cleanup interval on unmount or when session changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session, update]);

  // Manual refresh function
  const refreshVerificationStatus = async () => {
    if (!session?.user) return null;

    try {
      // First get the latest data from database
      const response = await fetch('/api/user/refresh-session', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          // Trigger NextAuth session update which will call the JWT callback with trigger: 'update'
          await update();
          return data.user;
        }
      }
    } catch (error) {
      console.error('Error refreshing verification status:', error);
      throw error;
    }
    return null;
  };

  return { refreshVerificationStatus };
}