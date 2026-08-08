import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily } from '../../theme';
import { Icon } from './Icon';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

// Tappable section header used to group feature lists (Explore, Admin's
// Manage tiles) instead of one long undifferentiated scroll. Each instance
// tracks its own open state independently — no shared/exclusive accordion,
// so opening one section never closes another.
export function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const { C } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={() => setOpen((o) => !o)} style={styles.header} activeOpacity={0.7}>
        <Icon
          name="chevD"
          size={13}
          color={C.textMuted}
          style={{ transform: [{ rotate: open ? '0deg' : '-90deg' }] } as ViewStyle}
        />
        <Text style={[styles.title, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          {title}
        </Text>
      </TouchableOpacity>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 } as ViewStyle,
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 } as ViewStyle,
  title: { fontSize: 11, letterSpacing: 0.8 } as TextStyle,
  body: { marginTop: 9 } as ViewStyle,
});
