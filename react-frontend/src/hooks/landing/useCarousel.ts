/**
 * useCarousel Hook
 * Manages carousel state with auto-rotation and manual interaction
 */

import { useState, useEffect, useCallback } from 'react';

interface UseCarouselOptions {
  itemCount: number;
  autoRotateDuration?: number;
  pauseDuration?: number;
}

export function useCarousel({
  itemCount,
  autoRotateDuration = 8000,
  pauseDuration = 10000,
}: UseCarouselOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % itemCount);
  }, [itemCount]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Auto-rotation
  useEffect(() => {
    if (isPaused || itemCount === 0) return;

    const interval = setInterval(next, autoRotateDuration);
    return () => clearInterval(interval);
  }, [next, autoRotateDuration, isPaused, itemCount]);

  // Manual interaction handler
  const handleManualNext = useCallback(() => {
    setIsPaused(true);
    next();

    // Resume auto-rotation after pause duration
    const timeout = setTimeout(() => {
      setIsPaused(false);
    }, pauseDuration);

    return () => clearTimeout(timeout);
  }, [next, pauseDuration]);

  return {
    currentIndex,
    next: handleManualNext,
    goTo,
    isPaused,
  };
}
