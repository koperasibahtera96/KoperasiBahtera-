import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

export function useVerificationStatus() {
  const { data: session, update } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startInterval = () => {
      if (session?.user && (session.user as any).verificationStatus === 'pending') {
        intervalRef.current = setInterval(async () => {
          try {
            const response = await fetch('/api/user/refresh-session', {
              method: 'POST',
            });
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.success && data.user && data.user.verificationStatus !== (session.user as any).verificationStatus) {
                await update();
                
                if (data.user.verificationStatus !== 'pending' && intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
              }
            }
          } catch (error) {
            console.error('Error checking verification status:', error);
          }
        }, 10000);
      }
    };

    const stopInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        startInterval();
      }
    };

    // Handle page freeze/unfreeze events for BFCache
    const handlePageFreeze = () => stopInterval();
    const handlePageResume = () => startInterval();

    // Start initial interval
    startInterval();

    // BFCache-friendly event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('freeze', handlePageFreeze);
    document.addEventListener('resume', handlePageResume);

    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('freeze', handlePageFreeze);
      document.removeEventListener('resume', handlePageResume);
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