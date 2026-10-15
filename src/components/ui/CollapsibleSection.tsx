import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, pillBg } from '../../theme';
import { Icon } from './Icon';

export interface CollapsibleSectionProps {
  title: string;
  icon: string;
  count?: number | string;
  badge?: string;
  accentColor?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function CollapsibleSection({
  title,
  icon,
  count,
  badge,
  accentColor,
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
  const displayCount = count !== undefined ? String(count) : badge;

  const activeBorderColor = isOpen && accentColor
    ? (isDark ? `${activeColor}85` : `${activeColor}65`)
    : C.border;

  return (
    <View style={[styles.wrap, containerStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.header,
          {
            backgroundColor: C.surface,
            borderColor: activeBorderColor,
            borderWidth: isOpen && accentColor ? 1.5 : 1,
          },
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

        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
          {title}
        </Text>

        {displayCount ? (
          <View
            style={[
              styles.countBox,
              {
                backgroundColor: pillBg(activeColor, isDark),
                borderColor: isDark ? `${activeColor}95` : `${activeColor}70`,
              },
            ]}
          >
            <Text
              style={[
                styles.countText,
                {
                  color: activeColor,
                  fontFamily: FontFamily.jakartaExtraBold,
                },
              ]}
            >
              {displayCount}
            </Text>
          </View>
        ) : null}

        <Icon
          name={isOpen ? 'chevD' : 'chevR'}
          size={18}
          color={isOpen ? activeColor : C.textMuted}
        />
      </TouchableOpacity>

      {isOpen && <View style={styles.childContainer}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 11,
  } as ViewStyle,

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

  title: {
    flex: 1,
    fontSize: 14.5,
  } as TextStyle,

  countBox: {
    minWidth: 34,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  } as ViewStyle,

  countText: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.3,
  } as TextStyle,

  childContainer: {
    marginTop: 8,
    marginBottom: 2,
  } as ViewStyle,
});
