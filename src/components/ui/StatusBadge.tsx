import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, FontSize, SectorColors } from '../../theme';
import { AnimatedIcon, type IconFamily } from './AnimatedIcon';

export type BadgeVariant =
  | 'vehicle'
  | 'urgency'
  | 'medical'
  | 'platelet'
  | 'affiliation'
  | 'shortlisted'
  | 'bags'
  | 'meetup'
  | 'deadline'
  | 'role';

interface StatusBadgeProps {
  variant: BadgeVariant;
  value?: string;
  count?: number;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
  style?: ViewStyle;
}

interface BadgeMeta {
  family: IconFamily;
  icon: string;
  label: string;
  fg: string;
  bg: string;
  border?: string;
}

export function StatusBadge({
  variant,
  value,
  count,
  label,
  size = 'md',
  pulse = false,
  style,
}: StatusBadgeProps) {
  const { C, isDark } = useTheme();

  const getMeta = (): BadgeMeta => {
    switch (variant) {
      case 'vehicle': {
        const v = (value || 'Car').toLowerCase();
        if (v.includes('rickshaw')) {
          return {
            family: 'mci',
            icon: 'rickshaw',
            label: label || 'Rickshaw',
            fg: isDark ? '#38bdf8' : '#0284c7',
            bg: isDark ? 'rgba(56, 189, 248, 0.14)' : 'rgba(2, 132, 199, 0.1)',
          };
        }
        if (v.includes('bike')) {
          return {
            family: 'mci',
            icon: 'motorbike',
            label: label || 'Bike',
            fg: isDark ? '#fb923c' : '#ea580c',
            bg: isDark ? 'rgba(251, 146, 60, 0.14)' : 'rgba(234, 88, 12, 0.1)',
          };
        }
        if (v.includes('cng')) {
          return {
            family: 'mci',
            icon: 'taxi',
            label: label || 'CNG',
            fg: isDark ? '#34d399' : '#059669',
            bg: isDark ? 'rgba(52, 211, 153, 0.14)' : 'rgba(5, 150, 105, 0.1)',
          };
        }
        return {
          family: 'mci',
          icon: 'car-side',
          label: label || 'Car',
          fg: isDark ? '#818cf8' : '#4f46e5',
          bg: isDark ? 'rgba(129, 140, 248, 0.14)' : 'rgba(79, 70, 229, 0.1)',
        };
      }

      case 'role': {
        const isRequest = value === 'request' || value === 'Need Ride';
        return {
          family: 'mci',
          icon: isRequest ? 'hand-back-right' : 'steering',
          label: label || (isRequest ? 'Need Ride' : 'Offer'),
          fg: isRequest ? (isDark ? '#c084fc' : '#9333ea') : (isDark ? '#818cf8' : '#4f46e5'),
          bg: isRequest
            ? (isDark ? 'rgba(192, 132, 252, 0.14)' : 'rgba(147, 51, 234, 0.1)')
            : (isDark ? 'rgba(129, 140, 248, 0.14)' : 'rgba(79, 70, 229, 0.1)'),
        };
      }

      case 'urgency': {
        const isUrgent = value === 'Urgent' || value === 'urgent_only';
        const isToday = value === 'Today' || value === 'today_plus';
        if (isUrgent) {
          return {
            family: 'feather',
            icon: 'alert-triangle',
            label: label || 'Urgent',
            fg: C.danger,
            bg: isDark ? 'rgba(248, 113, 113, 0.18)' : 'rgba(220, 38, 38, 0.12)',
            border: isDark ? 'rgba(248, 113, 113, 0.35)' : 'rgba(220, 38, 38, 0.25)',
          };
        }
        if (isToday) {
          return {
            family: 'feather',
            icon: 'clock',
            label: label || 'Today',
            fg: C.warn,
            bg: isDark ? 'rgba(251, 191, 36, 0.16)' : 'rgba(217, 119, 6, 0.12)',
            border: isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(217, 119, 6, 0.2)',
          };
        }
        return {
          family: 'feather',
          icon: 'calendar',
          label: label || (value ?? 'Scheduled'),
          fg: C.text2,
          bg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
        };
      }

      case 'bags': {
        const bagCount = count && count > 0 ? count : 1;
        return {
          family: 'mci',
          icon: 'blood-bag',
          label: label || `${bagCount} ${bagCount === 1 ? 'Bag Needed' : 'Bags Needed'}`,
          fg: SectorColors.blood,
          bg: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.1)',
        };
      }

      case 'medical': {
        const r = (value || '').toLowerCase();
        let icon = 'needle';
        let fam: IconFamily = 'mci';
        if (r.includes('accident') || r.includes('trauma')) {
          icon = 'alert-decagram';
        } else if (r.includes('childbirth') || r.includes('c-section')) {
          icon = 'baby-carriage';
        } else if (r.includes('thalassemia')) {
          icon = 'blood-bag';
        } else if (r.includes('icu') || r.includes('critical')) {
          icon = 'hospital-building';
        } else if (!r.includes('surgery')) {
          icon = 'activity';
          fam = 'feather';
        }
        return {
          family: fam,
          icon,
          label: label || value || 'Medical',
          fg: SectorColors.medical,
          bg: isDark ? 'rgba(244, 63, 94, 0.14)' : 'rgba(225, 29, 72, 0.1)',
        };
      }

      case 'platelet': {
        return {
          family: 'feather',
          icon: 'zap',
          label: label || 'Platelets (প্লাটিলেট)',
          fg: isDark ? '#facc15' : '#b45309',
          bg: isDark ? 'rgba(234, 179, 8, 0.14)' : 'rgba(234, 179, 8, 0.10)',
          border: isDark ? 'rgba(234, 179, 8, 0.35)' : 'rgba(234, 179, 8, 0.25)',
        };
      }

      case 'affiliation': {
        const a = (value || '').toLowerCase();
        let icon = 'school';
        let fam: IconFamily = 'mci';
        if (a.includes('faculty') || a.includes('staff')) {
          icon = 'briefcase';
          fam = 'feather';
        } else if (a.includes('family')) {
          icon = 'users';
          fam = 'feather';
        }
        return {
          family: fam,
          icon,
          label: label || value || 'BUBT Student',
          fg: C.brand,
          bg: isDark ? 'rgba(91, 133, 247, 0.14)' : 'rgba(59, 130, 246, 0.1)',
        };
      }

      case 'shortlisted': {
        return {
          family: 'feather',
          icon: 'award',
          label: label || 'Shortlisted',
          fg: C.success,
          bg: isDark ? 'rgba(52, 211, 153, 0.16)' : 'rgba(16, 185, 129, 0.12)',
          border: isDark ? 'rgba(52, 211, 153, 0.35)' : 'rgba(16, 185, 129, 0.25)',
        };
      }

      case 'deadline': {
        return {
          family: 'feather',
          icon: 'clock',
          label: label || value || 'Deadline',
          fg: C.text2,
          bg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
        };
      }

      case 'meetup': {
        return {
          family: 'feather',
          icon: 'map-pin',
          label: label || value || 'Meetup Spot',
          fg: SectorColors.market,
          bg: isDark ? 'rgba(244, 63, 94, 0.14)' : 'rgba(225, 29, 72, 0.1)',
        };
      }
    }
  };

  const meta = getMeta();
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: meta.bg,
          borderColor: meta.border || 'transparent',
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 7 : 10,
        },
        style,
      ]}
    >
      <AnimatedIcon
        family={meta.family}
        name={meta.icon}
        size={isSmall ? 12 : 14}
        color={meta.fg}
        animation={
          pulse || (variant === 'urgency' && meta.label === 'Urgent')
            ? 'wobble'
            : variant === 'platelet'
            ? 'wobble'
            : variant === 'shortlisted'
            ? 'bounce'
            : 'entrance'
        }
        loop={false}
        style={{ marginRight: 5 }}
      />
      <Text
        style={[
          styles.label,
          {
            color: meta.fg,
            fontSize: isSmall ? FontSize.xs - 1 : FontSize.xs,
            fontFamily: FontFamily.jakartaBold,
          },
        ]}
        numberOfLines={1}
      >
        {meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  } as ViewStyle,
  label: {
    letterSpacing: 0.1,
  } as TextStyle,
});
