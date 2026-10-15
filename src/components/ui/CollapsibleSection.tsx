import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, pillBg } from '../../theme';
import { Icon } from './Icon';

export interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon: string;
  count?: number | string;
  countLabel?: string;
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
  subtitle,
  icon,
  count,
  countLabel,
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

        <View style={styles.titleCol}>
          <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {displayCount ? (
          <>
            <View style={[styles.verticalDivider, { backgroundColor: C.border }]} />
            <View style={styles.statCol}>
              <Text
                style={[
                  styles.statVal,
                  {
                    color: activeColor,
                    fontFamily: FontFamily.jakartaExtraBold,
                  },
                ]}
              >
                {displayCount}
              </Text>
              <Text
                style={[
                  styles.statSub,
                  {
                    color: C.text3,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
              >
                {countLabel ?? 'TOOLS'}
              </Text>
            </View>
          </>
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
    gap: 12,
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

  titleCol: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,

  title: {
    fontSize: 14.5,
    lineHeight: 20,
  } as TextStyle,

  subtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  } as TextStyle,

  verticalDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 2,
  } as ViewStyle,

  statCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    marginRight: 4,
  } as ViewStyle,

  statVal: {
    fontSize: 16.5,
    lineHeight: 20,
    textAlign: 'center',
  } as TextStyle,

  statSub: {
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 1,
  } as TextStyle,

  childContainer: {
    marginTop: 8,
    marginBottom: 2,
  } as ViewStyle,
});
