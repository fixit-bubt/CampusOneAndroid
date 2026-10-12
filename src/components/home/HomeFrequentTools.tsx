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
  route: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}

export const ALL_TOOLS: FrequentTool[] = [
  { id: 'study-hub', title: 'Study Hub', route: 'StudyHub', icon: 'book-open', color: SectorColors.study },
  { id: 'routines', title: 'Routines', route: 'RoutinesBrowse', icon: 'clock', color: SectorColors.routines },
  { id: 'cover-page', title: 'Cover Page', route: 'CoverPageForm', icon: 'file-text', color: SectorColors.coverpage },
  { id: 'cgpa', title: 'CGPA Calc', route: 'Cgpa', icon: 'percent', color: '#0e9c8a' },
  { id: 'bus', title: 'Bus', route: 'Bus', icon: 'truck', color: SectorColors.bus },
  { id: 'prayer', title: 'Prayer', route: 'Prayer', icon: 'sun', color: SectorColors.prayer },
  { id: 'blood', title: 'Blood', route: 'Blood', icon: 'heart', color: SectorColors.blood },
  { id: 'market', title: 'Market', route: 'Market', icon: 'shopping-bag', color: SectorColors.market },
  { id: 'ride', title: 'Rides', route: 'Rides', icon: 'navigation', color: SectorColors.ride },
  { id: 'lostfound', title: 'Lost & Found', route: 'LostFoundBrowse', icon: 'search', color: SectorColors.lostfound },
  { id: 'clubs', title: 'Clubs', route: 'Clubs', icon: 'users', color: SectorColors.clubs },
  { id: 'events', title: 'Events', route: 'EventsBrowse', icon: 'calendar', color: SectorColors.events },
  { id: 'announce', title: 'Notices', route: 'Announcements', icon: 'bell', color: SectorColors.announce },
  { id: 'jobs', title: 'Jobs', route: 'JobsBrowse', icon: 'briefcase', color: SectorColors.jobs },
  { id: 'directory', title: 'Directory', route: 'Directory', icon: 'user', color: SectorColors.directory },
  { id: 'faculty', title: 'Faculty', route: 'Faculty', icon: 'user-check', color: SectorColors.faculty },
  { id: 'calendar', title: 'Calendar', route: 'AcademicCalendar', icon: 'calendar', color: SectorColors.calendar },
  { id: 'pdfmaker', title: 'PDF Maker', route: 'PdfMaker', icon: 'file', color: SectorColors.pdfmaker },
  { id: 'reports', title: 'Reports', route: 'ReportForm', icon: 'alert-circle', color: SectorColors.reports },
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

      {/* 4 Square Buttons in 1 Horizontal Line */}
      <View style={styles.gridRow}>
        {activeTools.map((tool) => {
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
                <AnimatedIcon name={tool.icon} size={18} color={tool.color} />
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
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {tool.title}
              </Text>
            </TouchableOpacity>
          );
        })}
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
            <View style={styles.handleBar} />

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

            {/* List of features */}
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
                              ? `${item.color}18`
                              : `${item.color}10`
                            : C.surface2,
                          borderColor: isPicked ? item.color : C.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.pickerIconBox,
                          {
                            backgroundColor: isDark ? `${item.color}25` : `${item.color}15`,
                          },
                        ]}
                      >
                        <Feather name={item.icon} size={16} color={item.color} />
                      </View>

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

                      {isPicked ? (
                        <View
                          style={[
                            styles.badgePicked,
                            { backgroundColor: item.color },
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

            {/* Footer Buttons */}
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
                      tempSelected.length === 4 ? C.brand : isDark ? C.surface3 : '#cbd5e1',
                    opacity: tempSelected.length === 4 ? 1 : 0.6,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: '#ffffff', fontFamily: FontFamily.jakartaBold },
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

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
    maxHeight: '80%',
    paddingTop: 12,
    paddingHorizontal: 16,
  } as ViewStyle,

  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(156, 163, 175, 0.4)',
    alignSelf: 'center',
    marginBottom: 12,
  } as ViewStyle,

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  } as ViewStyle,

  sheetTitle: {
    fontSize: 17,
  },

  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  counterPill: {
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 999,
  } as ViewStyle,

  counterText: {
    fontSize: 11.5,
  },

  toolsList: {
    maxHeight: 330,
  } as ViewStyle,

  toolsListContent: {
    paddingVertical: 4,
  } as ViewStyle,

  pickerGrid: {
    gap: 8,
  } as ViewStyle,

  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
  } as ViewStyle,

  pickerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  pickerItemTitle: {
    flex: 1,
    fontSize: 13.5,
  },

  badgePicked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  badgePickedText: {
    color: '#ffffff',
    fontSize: 11,
  },

  badgeUnpicked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  } as ViewStyle,

  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 8,
  } as ViewStyle,

  resetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  resetBtnText: {
    fontSize: 13,
  },

  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  saveBtnText: {
    fontSize: 13.5,
  },
});
