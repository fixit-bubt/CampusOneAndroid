import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { AnimatedIcon } from '../ui/AnimatedIcon';
import { FontFamily, SectorColors } from '../../theme';

export interface FrequentTool {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}

export const ALL_TOOLS: FrequentTool[] = [
  { id: 'study-hub', title: 'Study Hub', subtitle: 'Lecture notes, syllabus, and study resources', route: 'StudyHub', icon: 'book-open', color: SectorColors.study },
  { id: 'routines', title: 'Routines', subtitle: 'Intake class routines and exam schedules', route: 'RoutinesBrowse', icon: 'clock', color: SectorColors.routines },
  { id: 'cover-page', title: 'Cover Page', subtitle: 'Standard assignment cover page generator', route: 'CoverPageForm', icon: 'file-text', color: SectorColors.coverpage },
  { id: 'cgpa', title: 'CGPA Calc', subtitle: 'Semester and cumulative grade point calculator', route: 'Cgpa', icon: 'percent', color: '#0e9c8a' },
  { id: 'bus', title: 'Bus', subtitle: 'Shuttle routes and departure countdowns', route: 'Bus', icon: 'truck', color: SectorColors.bus },
  { id: 'prayer', title: 'Prayer', subtitle: 'Salah prayer times and Azan countdown', route: 'Prayer', icon: 'sun', color: SectorColors.prayer },
  { id: 'blood', title: 'Blood', subtitle: 'Emergency blood donors and urgent requests', route: 'Blood', icon: 'heart', color: SectorColors.blood },
  { id: 'market', title: 'Market', subtitle: 'Student marketplace for books and gear', route: 'Market', icon: 'shopping-bag', color: SectorColors.market },
  { id: 'ride', title: 'Rides', subtitle: 'Campus ride sharing and seat availability', route: 'Rides', icon: 'navigation', color: SectorColors.ride },
  { id: 'lostfound', title: 'Lost & Found', subtitle: 'Report missing items or claim found gear', route: 'LostFoundBrowse', icon: 'search', color: SectorColors.lostfound },
  { id: 'clubs', title: 'Clubs', subtitle: 'BUBT student clubs, communities, and events', route: 'Clubs', icon: 'users', color: SectorColors.clubs },
  { id: 'events', title: 'Events', subtitle: 'Upcoming campus workshops, seminars, and fests', route: 'EventsBrowse', icon: 'calendar', color: SectorColors.events },
  { id: 'announce', title: 'Notices', subtitle: 'Official administrative notices and alerts', route: 'Announcements', icon: 'bell', color: SectorColors.announce },
  { id: 'jobs', title: 'Jobs', subtitle: 'Campus recruitment, internships, and vacancies', route: 'JobsBrowse', icon: 'briefcase', color: SectorColors.jobs },
  { id: 'directory', title: 'Directory', subtitle: 'Search peers and manage connection requests', route: 'Directory', icon: 'user', color: SectorColors.directory },
  { id: 'faculty', title: 'Faculty', subtitle: 'Teacher directory, office rooms, and mentors', route: 'Faculty', icon: 'user-check', color: SectorColors.faculty },
  { id: 'calendar', title: 'Calendar', subtitle: 'Academic terms, holidays, and exam dates', route: 'AcademicCalendar', icon: 'calendar', color: SectorColors.calendar },
  { id: 'pdfmaker', title: 'PDF Maker', subtitle: 'Merge, compress, scan, and convert documents', route: 'PdfMaker', icon: 'file', color: SectorColors.pdfmaker },
  { id: 'reports', title: 'Reports', subtitle: 'Campus maintenance issues and status tracking', route: 'ReportForm', icon: 'alert-circle', color: SectorColors.reports },
];

export const DEFAULT_TOOL_IDS = ['study-hub', 'routines', 'cover-page', 'cgpa'];

const STORAGE_KEY = (uid?: string) => `@campusone_frequent_tools_${uid || 'guest'}`;

export function HomeFrequentTools() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { C, isDark } = useTheme();
  const { user } = useAuth();

  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_TOOL_IDS);
  const [modalVisible, setModalVisible] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>(DEFAULT_TOOL_IDS);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY(user?.id));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length === 4) {
            setSelectedIds(parsed);
            return;
          }
        }
      } catch {
        // fallback to defaults
      }
      setSelectedIds(DEFAULT_TOOL_IDS);
    })();
  }, [user?.id]);

  const activeTools = useMemo(() => {
    const list = selectedIds
      .map((id) => ALL_TOOLS.find((t) => t.id === id))
      .filter((t): t is FrequentTool => !!t);
    return list.length === 4
      ? list
      : DEFAULT_TOOL_IDS.map((id) => ALL_TOOLS.find((t) => t.id === id)!);
  }, [selectedIds]);

  const handleOpenModal = () => {
    setTempSelected(selectedIds);
    setModalVisible(true);
  };

  const handleToggle = (id: string) => {
    if (tempSelected.includes(id)) {
      if (tempSelected.length > 1) {
        setTempSelected((prev) => prev.filter((x) => x !== id));
      }
    } else {
      if (tempSelected.length < 4) {
        setTempSelected((prev) => [...prev, id]);
      } else {
        setTempSelected((prev) => [...prev.slice(0, 3), id]);
      }
    }
  };

  const handleReset = () => {
    setTempSelected(DEFAULT_TOOL_IDS);
  };

  const handleSave = async () => {
    if (tempSelected.length !== 4) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEY(user?.id), JSON.stringify(tempSelected));
      setSelectedIds(tempSelected);
    } catch {
      // quiet fallback
    }
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Section Header with Customize Action */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="zap" size={13} color={C.textMuted} />
          <Text
            style={[
              styles.headerText,
              { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold },
            ]}
          >
            FREQUENTLY USED
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOpenModal}
          style={[
            styles.customizePill,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.border },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="sliders" size={11} color={C.textMuted} />
          <Text
            style={[
              styles.customizeText,
              { color: C.textMuted, fontFamily: FontFamily.jakartaBold },
            ]}
          >
            Customize
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4 Standard 72dp Fixed-Height Shortcut Cards */}
      <View style={styles.gridRow}>
        {activeTools.map((tool) => (
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
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : C.border,
                },
              ]}
            >
              <AnimatedIcon name={tool.icon} size={18} color={tool.color} animation="entrance" />
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
        ))}
      </View>

      {/* Customization Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />

          <View
            style={[
              styles.sheetContent,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            {/* Grab Handle */}
            <View
              style={[
                styles.handleBar,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)' },
              ]}
            />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.sheetTitle,
                    { color: C.text, fontFamily: FontFamily.jakartaExtraBold },
                  ]}
                >
                  Customize Shortcuts
                </Text>
                <Text
                  style={[
                    styles.sheetSubtitle,
                    { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                  ]}
                >
                  Choose 4 features for your home quick access
                </Text>
              </View>

              <View
                style={[
                  styles.counterPill,
                  {
                    backgroundColor:
                      tempSelected.length === 4
                        ? isDark
                          ? 'rgba(16, 185, 129, 0.2)'
                          : '#d1fae5'
                        : isDark
                          ? 'rgba(245, 158, 11, 0.2)'
                          : '#fef3c7',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.counterText,
                    {
                      color:
                        tempSelected.length === 4
                          ? isDark
                            ? '#6ee7b7'
                            : '#065f46'
                          : isDark
                            ? '#fcd34d'
                            : '#92400e',
                      fontFamily: FontFamily.jakartaBold,
                    },
                  ]}
                >
                  {tempSelected.length}/4
                </Text>
              </View>
            </View>

            {/* Calm, Neutral 19-Feature Selection Catalog */}
            <ScrollView
              style={styles.toolsList}
              contentContainerStyle={styles.toolsListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.pickerGrid}>
                {ALL_TOOLS.map((item) => {
                  const isPicked = tempSelected.includes(item.id);
                  const order = tempSelected.indexOf(item.id) + 1;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.75}
                      onPress={() => handleToggle(item.id)}
                      style={[
                        styles.pickerItem,
                        {
                          backgroundColor: isPicked
                            ? isDark
                              ? 'rgba(255, 255, 255, 0.06)'
                              : C.surfaceAlt
                            : C.surface2,
                          borderColor: isPicked ? C.brand : C.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.pickerIconBox,
                          {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : C.border,
                          },
                        ]}
                      >
                        <AnimatedIcon name={item.icon} size={18} color={item.color} animation="entrance" />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.pickerItemTitle,
                            {
                              color: C.text,
                              fontFamily: isPicked
                                ? FontFamily.jakartaBold
                                : FontFamily.jakartaMedium,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[
                            styles.pickerItemSub,
                            { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                          ]}
                          numberOfLines={1}
                        >
                          {item.subtitle}
                        </Text>
                      </View>

                      {isPicked ? (
                        <View
                          style={[
                            styles.badgePicked,
                            { backgroundColor: C.brand },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgePickedText,
                              { fontFamily: FontFamily.jakartaExtraBold },
                            ]}
                          >
                            {order}
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.badgeUnpicked,
                            { borderColor: C.border },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Equal-Width 50/50 Footer Buttons */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleReset}
                style={[
                  styles.resetBtn,
                  { borderColor: C.border, backgroundColor: C.surface2 },
                ]}
              >
                <Text
                  style={[
                    styles.resetBtnText,
                    { color: C.textMuted, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  Reset Defaults
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSave}
                disabled={tempSelected.length !== 4}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor:
                      tempSelected.length === 4 ? C.brand : C.border,
                    opacity: tempSelected.length === 4 ? 1 : 0.5,
                  },
                ]}
              >
                <Feather
                  name="check"
                  size={16}
                  color={tempSelected.length === 4 ? '#ffffff' : C.textMuted}
                />
                <Text
                  style={[
                    styles.saveBtnText,
                    {
                      color: tempSelected.length === 4 ? '#ffffff' : C.textMuted,
                      fontFamily: FontFamily.jakartaBold,
                    },
                  ]}
                >
                  Save Shortcuts
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  } as ViewStyle,

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,

  headerText: {
    fontSize: 11,
    letterSpacing: 0.8,
  },

  customizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 8,
  } as ViewStyle,

  customizeText: {
    fontSize: 10.5,
  },

  gridRow: {
    flexDirection: 'row',
    gap: 8,
  } as ViewStyle,

  toolCard: {
    flex: 1,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  } as ViewStyle,

  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  toolTitle: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  } as ViewStyle,

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  } as ViewStyle,

  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '82%',
    paddingTop: 12,
    paddingHorizontal: 20,
  } as ViewStyle,

  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  } as ViewStyle,

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  } as ViewStyle,

  sheetTitle: {
    fontSize: 17,
    letterSpacing: -0.3,
  },

  sheetSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },

  counterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  } as ViewStyle,

  counterText: {
    fontSize: 12,
  },

  toolsList: {
    maxHeight: 380,
  } as ViewStyle,

  toolsListContent: {
    paddingTop: 6,
    paddingBottom: 16,
  } as ViewStyle,

  pickerGrid: {
    gap: 10,
  } as ViewStyle,

  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  } as ViewStyle,

  pickerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  pickerItemTitle: {
    fontSize: 14.5,
  },

  pickerItemSub: {
    fontSize: 11.5,
    marginTop: 2,
  },

  badgePicked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  badgePickedText: {
    color: '#ffffff',
    fontSize: 11,
  },

  badgeUnpicked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  } as ViewStyle,

  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  } as ViewStyle,

  resetBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  resetBtnText: {
    fontSize: 14,
  },

  saveBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,

  saveBtnText: {
    fontSize: 14,
  },
});
