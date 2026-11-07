import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

// Fallback when no transition event arrives (tab switches, no animation).
const SETTLE_MS = 450;

// Refetch on focus without fighting the back animation.
//
// First mount, or `run` changing while the screen stays focused, runs it right
// away like useFocusEffect. Coming back to a screen (pop, tab switch) waits
// until the reveal has settled: refetching mid-slide re-rendered the list
// under the animation and dropped frames on every back press.
export function useFocusRefresh(run: () => unknown): void {
  const navigation = useNavigation<any>();
  const blurred = useRef(false);

  useEffect(() => navigation.addListener('blur', () => { blurred.current = true; }), [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!blurred.current) {
        run();
        return;
      }
      blurred.current = false;

      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        run();
      };
      // Tab screens never get transitionEnd themselves; the stack route that
      // holds the tab navigator does, so listen up the parent chain.
      const unsubs: (() => void)[] = [];
      for (let nav = navigation; nav; nav = nav.getParent?.()) {
        unsubs.push(nav.addListener('transitionEnd', (e: any) => {
          if (!e?.data?.closing) go();
        }));
      }
      const timer = setTimeout(go, SETTLE_MS);
      return () => {
        done = true;
        clearTimeout(timer);
        unsubs.forEach((u) => u());
      };
    }, [navigation, run]),
  );
}
