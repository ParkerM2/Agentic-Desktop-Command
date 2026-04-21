/**
 * useCooldown — rate-limiting hook with failure counter + interval cooldown
 *
 * Tracks consecutive failures and triggers a countdown timer
 * once `maxAttempts` is reached. Resets automatically when the timer expires.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useCooldown(maxAttempts: number, cooldownSeconds: number) {
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isCoolingDown = cooldownRemaining > 0;

  const startCooldown = useCallback(() => {
    setCooldownRemaining(cooldownSeconds);

    if (cooldownTimerRef.current !== null) {
      clearInterval(cooldownTimerRef.current);
    }

    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current !== null) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cooldownSeconds]);

  const recordFailure = useCallback(() => {
    setFailedAttempts((prev) => {
      const next = prev + 1;
      if (next >= maxAttempts) {
        startCooldown();
      }
      return next;
    });
  }, [maxAttempts, startCooldown]);

  const reset = useCallback(() => {
    setFailedAttempts(0);
    setCooldownRemaining(0);
    if (cooldownTimerRef.current !== null) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current !== null) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  return { failedAttempts, cooldownRemaining, isCoolingDown, recordFailure, reset };
}
