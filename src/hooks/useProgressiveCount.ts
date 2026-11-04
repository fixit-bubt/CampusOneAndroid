import { useEffect, useState } from 'react';

// How many list rows to render now. Starts small and grows in steps until all
// rows are shown, so a long list is built over several frames instead of one.
// It never shrinks, so rows that are already on screen are not rebuilt.
export function useProgressiveCount(total: number, first = 4, step = 4, delayMs = 50): number {
  const [count, setCount] = useState(first);
  useEffect(() => {
    if (count >= total) return;
    const id = setTimeout(() => setCount(c => Math.min(c + step, total)), delayMs);
    return () => clearTimeout(id);
  }, [count, total, step, delayMs]);
  return count;
}
