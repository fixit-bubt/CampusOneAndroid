import { useMemo } from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

// Drop-in for react-native-safe-area-context's SafeAreaView.
//
// The library's native Android view applies the insets one frame after it is
// drawn, so every screen first rendered under the status bar and then jumped
// down mid-transition. The provider already holds the insets in JS, so pad
// with them on the very first frame instead (same additive rules as the
// library: insets are added to the style's own padding).
const ALL_EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

interface Props extends ViewProps {
  edges?: readonly Edge[];
}

export function SafeAreaView({ edges = ALL_EDGES, style, ...rest }: Props) {
  const insets = useSafeAreaInsets();

  const padded = useMemo(() => {
    const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, any>;
    const p = typeof flat.padding === 'number' ? flat.padding : 0;
    const pv = typeof flat.paddingVertical === 'number' ? flat.paddingVertical : p;
    const ph = typeof flat.paddingHorizontal === 'number' ? flat.paddingHorizontal : p;
    const base = {
      top: typeof flat.paddingTop === 'number' ? flat.paddingTop : pv,
      right: typeof flat.paddingRight === 'number' ? flat.paddingRight : ph,
      bottom: typeof flat.paddingBottom === 'number' ? flat.paddingBottom : pv,
      left: typeof flat.paddingLeft === 'number' ? flat.paddingLeft : ph,
    };
    const has = (e: Edge) => edges.includes(e);
    return {
      paddingTop: base.top + (has('top') ? insets.top : 0),
      paddingRight: base.right + (has('right') ? insets.right : 0),
      paddingBottom: base.bottom + (has('bottom') ? insets.bottom : 0),
      paddingLeft: base.left + (has('left') ? insets.left : 0),
    };
  }, [style, edges, insets.top, insets.right, insets.bottom, insets.left]);

  return <View style={[style, padded]} {...rest} />;
}
