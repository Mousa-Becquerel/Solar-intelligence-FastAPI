/**
 * useStickyNav Hook
 * Sticky navigation with glassmorphism effect on scroll
 */

import { useEffect, useState } from 'react';

export function useStickyNav(threshold = 100) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsSticky(scrollY > threshold);
    };

    // Set initial state
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isSticky;
}
