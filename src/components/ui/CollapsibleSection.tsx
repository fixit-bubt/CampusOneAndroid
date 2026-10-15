import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, pillBg } from '../../theme';
import { Icon } from './Icon';

export interface CollapsibleSectionProps {
  title: string;
  icon: string;
  badge?: string;
  accentColor?: string;
  variant?: 'enclosed' | 'classic';
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function CollapsibleSection({
  title,
  icon,
  badge,
  accentColor,
  variant = 'classic',
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  children,
  containerStyle,
}: CollapsibleSectionProps) {
  const { C, isDark } = useTheme();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handlePress = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalOpen((o) => !o);
    }
  };

  const activeColor = accentColor ?? C.brand;

  if (variant === 'enclosed') {
    const activeBorderColor = isOpen
      ? (isDark ? `${activeColor}70` : `${activeColor}55`)
      : C.border;

    return (
      <View
        style={[
          styles.enclosedWrap,
          {
            backgroundColor: C.surface,
            borderColor: activeBorderColor,
            borderWidth: isOpen ? 1.5 : 1,
          },
          containerStyle,
        ]}
      >
        <TouchableOpacity
          onPress={handlePress}
          style={[
            styles.enclosedHeader,
            isOpen && [styles.enclosedHeaderOpen, { borderBottomColor: C.border }],
          ]}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: accentColor
                  ? pillBg(accentColor, isDark)
                  : C.surface2,
              },
            ]}
          >
            <Icon name={icon} size={20} color={activeColor} />
          </View>
          <Text
            style={[
              styles.title,
              { color: C.text, fontFamily: FontFamily.jakartaBold },
            ]}
          >
            {title}
          </Text>
          {badge ? (
            <View
              style={[
                styles.badgeBox,
                {
                  backgroundColor: isOpen
                    ? pillBg(activeColor, isDark)
                    : C.surface2,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: isOpen ? activeColor : C.text3,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
              >
                {badge}
              </Text>
            </View>
          ) : null}
          <Icon
            name={isOpen ? 'chevD' : 'chevR'}
            size={18}
            color={isOpen ? activeColor : C.textMuted}
          />
        </TouchableOpacity>
        {isOpen && <View style={styles.enclosedBody}>{children}</View>}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, containerStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.header, { backgroundColor: C.surface, borderColor: C.border }]}
        activeOpacity={0.75}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: accentColor
                ? pillBg(accentColor, isDark)
                : C.surface2,
            },
          ]}
        >
          <Icon name={icon} size={20} color={activeColor} />
        </View>
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
          {title}
        </Text>
        {badge ? (
          <View style={[styles.badgeBox, { backgroundColor: C.surface2 }]}>
            <Text style={[styles.badgeText, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
              {badge}
            </Text>
          </View>
        ) : null}
        <Icon
          name={isOpen ? 'chevD' : 'chevR'}
          size={18}
          color={isOpen ? activeColor : C.textMuted}
        />
      </TouchableOpacity>
      {isOpen && <View style={styles.body}>{children}</View>}
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
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  title: { flex: 1, fontSize: 14.5 } as TextStyle,
  body: { marginTop: 11 } as ViewStyle,

  // Enclosed variant styles
  enclosedWrap: {
    borderRadius: 16,
    marginBottom: 11,
  } as ViewStyle,
  enclosedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 14,
  } as ViewStyle,
  enclosedHeaderOpen: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  enclosedBody: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  } as ViewStyle,
  badgeBox: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    marginRight: 4,
  } as ViewStyle,
  badgeText: {
    fontSize: 11,
    letterSpacing: 0.2,
  } as TextStyle,
});
