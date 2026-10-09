import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, SectorColors } from '../../theme';

interface FrequentTool {
  id: string;
  title: string;
  route: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}

const TOOLS: FrequentTool[] = [
  {
    id: 'study-hub',
    title: 'Study Hub',
    route: 'StudyHub',
    icon: 'book-open',
    color: SectorColors.study,
  },
  {
    id: 'routines',
    title: 'Routines',
    route: 'RoutinesBrowse',
    icon: 'clock',
    color: SectorColors.routines,
  },
  {
    id: 'cover-page',
    title: 'Cover Page',
    route: 'CoverPageForm',
    icon: 'file-text',
    color: SectorColors.coverpage,
  },
  {
    id: 'cgpa',
    title: 'CGPA Calc',
    route: 'Cgpa',
    icon: 'percent',
    color: '#0e9c8a',
  },
];

export function HomeFrequentTools() {
  const navigation = useNavigation<any>();
  const { C, isDark } = useTheme();

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <Feather name="zap" size={13} color={C.textMuted} />
        <Text style={[styles.headerText, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          FREQUENTLY USED
        </Text>
      </View>

      {/* 4 Square Buttons in 1 Horizontal Line */}
      <View style={styles.gridRow}>
        {TOOLS.map((tool) => {
          const bgTint = isDark ? `${tool.color}18` : `${tool.color}12`;
          const borderTint = isDark ? `${tool.color}35` : `${tool.color}25`;

          return (
            <TouchableOpacity
              key={tool.id}
              activeOpacity={0.75}
              onPress={() => navigation.navigate(tool.route)}
              style={[
                styles.toolCard,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: bgTint,
                    borderColor: borderTint,
                  },
                ]}
              >
                <Feather name={tool.icon} size={18} color={tool.color} />
              </View>
              <Text
                style={[
                  styles.toolTitle,
                  {
                    color: C.text,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
                numberOfLines={1}
              >
                {tool.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 12,
  } as ViewStyle,

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  } as ViewStyle,

  headerText: {
    fontSize: 11,
    letterSpacing: 0.8,
  },

  gridRow: {
    flexDirection: 'row',
    gap: 8,
  } as ViewStyle,

  toolCard: {
    flex: 1,
    aspectRatio: 1,
    minHeight: 76,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  } as ViewStyle,

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  toolTitle: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
});
