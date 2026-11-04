import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

// False until the screen's open animation has finished, so heavy lists are
// built after the transition instead of during it.
export function useAfterInteractions(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => handle.cancel();
  }, []);
  return ready;
}
