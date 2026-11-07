import { useEffect, useState, type ComponentType } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { SubBar } from '../components/layout/TopBar';

const wrapped = new WeakMap<ComponentType<any>, ComponentType<any>>();

interface Options {
  // Screens with their own header (not SubBar) slide in on a plain page so
  // the placeholder header doesn't jump when the real one replaces it.
  plain?: boolean;
}

// Building a heavy screen inside the first frames of the slide-in freezes
// the animation. Slide a lightweight page first (the same SubBar the screen
// renders, so only the title and content fill in), mount the real screen after.
export function afterTransition(Screen: ComponentType<any>, opts: Options = {}): ComponentType<any> {
  const cached = wrapped.get(Screen);
  if (cached) return cached;

  function Deferred(props: any) {
    const { C } = useTheme();
    const insets = useSafeAreaInsets();
    const [ready, setReady] = useState(false);

    useEffect(() => {
      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        setReady(true);
      };
      const unsub = props.navigation?.addListener?.('transitionEnd', go);
      const timer = setTimeout(go, 600);
      return () => {
        unsub?.();
        clearTimeout(timer);
      };
    }, []);

    if (ready) return <Screen {...props} />;
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: opts.plain ? 0 : insets.top }}>
        {opts.plain ? null : <SubBar title="" onBack={() => props.navigation?.goBack?.()} />}
      </View>
    );
  }
  Deferred.displayName = `Deferred(${Screen.displayName || Screen.name || 'Screen'})`;
  wrapped.set(Screen, Deferred);
  return Deferred;
}
