import { useEffect, useState } from 'react';

// False until the JS thread goes idle after mount, so heavy lists are built
// after the open transition instead of during it. (InteractionManager, used
// before, is deprecated in RN 0.85; requestIdleCallback is its replacement.)
export function useAfterInteractions(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const handle = requestIdleCallback(() => setReady(true), { timeout: 500 });
    return () => cancelIdleCallback(handle);
  }, []);
  return ready;
}
