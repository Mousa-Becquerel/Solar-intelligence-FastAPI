/**
 * useAccordion Hook
 * Manages accordion state (one-at-a-time behavior)
 */

import { useState } from 'react';

export function useAccordion(initialIndex = 0) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const toggleItem = (index: number) => {
    // If clicking the active item, close it; otherwise open the new one
    setActiveIndex((prev) => (prev === index ? -1 : index));
  };

  const isActive = (index: number) => activeIndex === index;

  return {
    activeIndex,
    toggleItem,
    isActive,
  };
}
