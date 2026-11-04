import { View, type ListRenderItemInfo, type StyleProp, type ViewStyle } from 'react-native';

const HIDDEN: ViewStyle = { display: 'none' };
export const LIST_POOL = 10;

// Pads a short list with copies of a real item so the same card views stay
// mounted when a tab has fewer rows. The padding slots are hidden by renderPooled.
export function padToPool<T>(items: T[], size = LIST_POOL): T[] {
  if (items.length === 0 || items.length >= size) return items;
  return [...items, ...Array<T>(size - items.length).fill(items[0])];
}

export function renderPooled<T>(
  render: (info: ListRenderItemInfo<T>) => React.ReactElement | null,
  realCount: number,
  style?: StyleProp<ViewStyle>,
) {
  return (info: ListRenderItemInfo<T>) => (
    <View style={info.index >= realCount ? HIDDEN : style}>{render(info)}</View>
  );
}
