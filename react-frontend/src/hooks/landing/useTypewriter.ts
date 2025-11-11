/**
 * useTypewriter Hook
 * Creates typewriter animation effect for text
 * Updated: 2025-01-11 - Fixed undefined appending bug
 */

import { useState, useEffect } from 'react';

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  enabled?: boolean;
}

export function useTypewriter({ text, speed = 30, enabled = true }: UseTypewriterOptions) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayText('');
      setIsComplete(false);
      setShowCursor(false);
      return;
    }

    let index = 0;
    let cancelled = false;
    setDisplayText('');
    setIsComplete(false);
    setShowCursor(true);

    const interval = setInterval(() => {
      if (cancelled) return;

      if (index >= text.length) {
        clearInterval(interval);
        setIsComplete(true);
        setTimeout(() => {
          if (!cancelled) setShowCursor(false);
        }, 500);
        return;
      }

      const char = text[index];
      if (char !== undefined) {
        setDisplayText((prev) => prev + char);
      }
      index++;
    }, speed);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [text, speed, enabled]);

  return {
    displayText,
    isComplete,
    showCursor,
  };
}
