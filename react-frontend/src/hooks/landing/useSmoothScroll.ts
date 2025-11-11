/**
 * useSmoothScroll Hook
 * Custom smooth scrolling with cubic bezier easing
 */

import { useEffect } from 'react';

/**
 * Smooth scroll to target element with cubic bezier easing
 */
function smoothScrollTo(target: HTMLElement, duration = 2000) {
  const navHeight = document.querySelector('nav')?.offsetHeight || 0;
  const targetPosition = target.offsetTop - navHeight - 20;
  const startPosition = window.pageYOffset;
  const distance = targetPosition - startPosition;
  let startTime: number | null = null;

  function easeInOutCubic(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animation(currentTime: number) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const ease = easeInOutCubic(progress);

    window.scrollTo(0, startPosition + distance * ease);

    if (timeElapsed < duration) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}

/**
 * Hook to initialize smooth scrolling for anchor links
 */
export function useSmoothScroll() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href^="#"]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href === '#' || href === '') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        smoothScrollTo(target as HTMLElement, 2000);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
}
