import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily } from '../../theme';
import { Icon } from './Icon';

interface CollapsibleSectionProps {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

// Tappable section header used to group feature lists (Explore, Admin's
// Manage tiles) instead of one long undifferentiated scroll. Styled as a
// full card bar (icon + label + chevron) to match the other tappable rows
// on the screen (e.g. the AI Assistant card) rather than a small text label
// — the small-label version read as decorative, not something to tap.
// Each instance tracks its own open state independently — no shared/
// exclusive accordion, so opening one section never closes another.
export function CollapsibleSection({ title, icon, defaultOpen = true, children }: CollapsibleSectionProps) {
  const { C } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={() => setOpen((o) => !o)}
        style={[styles.header, { backgroundColor: C.surface, borderColor: C.border }]}
        activeOpacity={0.75}
      >
        <View style={[styles.iconBox, { backgroundColor: C.surface2 }]}>
          <Icon name={icon} size={20} color={C.brand} />
        </View>
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
          {title}
        </Text>
        <Icon
          name="chevD"
          size={18}
          color={C.textMuted}
          style={{ transform: [{ rotate: open ? '0deg' : '-90deg' }] } as ViewStyle}
        />
      </TouchableOpacity>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 11 } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  iconBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  title: { flex: 1, fontSize: 14.5 } as TextStyle,
  // No gap here — Explore's row cards carry their own marginBottom, and
  // Admin's tile grid carries its own gap; this just adds room under the header.
  body: { marginTop: 11 } as ViewStyle,
});
