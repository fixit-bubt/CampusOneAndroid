import { View } from 'react-native';

// Index keys let a list reuse the same card views when the data changes (tab switch).
export const indexKey = (_item: unknown, index: number) => String(index);

const gaps: Record<number, () => React.ReactElement> = {};
// Stable separator component per height (an inline one would remount every render).
export function listGap(height: number) {
  return (gaps[height] ??= () => <View style={{ height }} />);
}
