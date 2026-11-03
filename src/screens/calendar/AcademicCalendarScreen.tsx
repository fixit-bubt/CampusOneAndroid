import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  RefreshControl,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { CampusPdfViewerModal } from '../../components/pdf/CampusPdfViewerModal';
import { FontFamily, Radius } from '../../theme';
import {
  fetchAcademicCalendars,
} from '../../services/academicCalendarService';
import type { AcademicCalendarDoc } from '../../constants/academicCalendar';

// 58dp Calendar Semester Bar
const CalendarBar58 = memo(function CalendarBar58({
  item,
  onPress,
  C,
}: {
  item: AcademicCalendarDoc;
  onPress: (item: AcademicCalendarDoc) => void;
  C: any;
}) {
  const isImage = item.file_type === 'image';
  const iconName = isImage ? 'image' : 'file-text';
  const fileBadge = isImage ? 'PHOTO' : 'PDF';

  return (
    <TouchableOpacity
      style={[
        styles.bar58,
        {
          backgroundColor: C.surface,
          borderColor: C.border,
        },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {/* 32dp Monochrome Leading Icon */}
      <View style={styles.iconSlot32}>
        <Feather name={iconName} size={32} color={C.text} />
      </View>

      {/* Middle Title & Term Metadata */}
      <View style={styles.barTextCol}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {item.is_active && (
            <View style={[styles.activeBadge, { backgroundColor: C.brand + '20' }]}>
              <Text style={[styles.activeBadgeTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                ACTIVE
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}
          numberOfLines={1}
        >
          {item.semester || 'Official BUBT Term'} · {fileBadge}
        </Text>
      </View>

      <Feather name="chevron-right" size={18} color={C.textMuted} />
    </TouchableOpacity>
  );
});

export function AcademicCalendarScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const isAdmin = profile?.role === 'admin';

  const [calendars, setCalendars] = useState<AcademicCalendarDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Document viewer modal states
  const [selectedDoc, setSelectedDoc] = useState<AcademicCalendarDoc | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);

  const loadCalendars = useCallback(async () => {
    try {
      const data = await fetchAcademicCalendars();
      setCalendars(data);
    } catch {
      toast({ type: 'error', title: 'Error', message: 'Could not load academic calendars' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      loadCalendars();
    }, [loadCalendars])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCalendars();
  }, [loadCalendars]);

  // Featured calendar: active semester or the top item
  const featuredCalendar = useMemo(() => {
    if (calendars.length === 0) return null;
    return calendars.find((c) => c.is_active) || calendars[0];
  }, [calendars]);

  const handleOpenCalendar = (doc: AcademicCalendarDoc) => {
    if (doc.file_type === 'image') {
      setSelectedDoc(doc);
      setPhotoViewerVisible(true);
    } else {
      setSelectedDoc(doc);
    }
  };

  const handleShareCalendar = async (doc: AcademicCalendarDoc) => {
    try {
      await Share.share({
        title: doc.title,
        message: `Official BUBT Academic Calendar (${doc.semester}): ${doc.file_url}`,
        url: doc.file_url,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      {/* SubBar with Back Navigation and Admin Action */}
      <SubBar
        title="Academic Calendar"
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ManageAcademicCalendar')}
                style={styles.headerBtn}
                hitSlop={8}
                activeOpacity={0.75}
              >
                <Feather name="settings" size={20} color={C.text} />
              </TouchableOpacity>
            )}
            {featuredCalendar && (
              <TouchableOpacity
                onPress={() => handleShareCalendar(featuredCalendar)}
                style={styles.headerBtn}
                hitSlop={8}
                activeOpacity={0.75}
              >
                <Feather name="share-2" size={20} color={C.text} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <FlatList
        data={calendars}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.brand}
            colors={[C.brand]}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* Admin Management Strip Shortcut */}
            {isAdmin && (
              <TouchableOpacity
                style={[
                  styles.adminStrip,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.brand + '40',
                  },
                ]}
                onPress={() => navigation.navigate('ManageAcademicCalendar')}
                activeOpacity={0.8}
              >
                <View style={styles.adminStripLeft}>
                  <Feather name="shield" size={18} color={C.brand} style={{ marginRight: 8 }} />
                  <Text
                    style={[
                      styles.adminStripTxt,
                      { color: C.text, fontFamily: FontFamily.jakartaBold },
                    ]}
                  >
                    Admin: Upload / Manage Calendars
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={C.brand} />
              </TouchableOpacity>
            )}

            {/* Featured Active Calendar Hero Card */}
            {featuredCalendar && (
              <View
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                  },
                ]}
              >
                <View style={styles.heroTopRow}>
                  <View style={[styles.heroPill, { backgroundColor: C.brand + '18' }]}>
                    <Feather name="award" size={12} color={C.brand} style={{ marginRight: 4 }} />
                    <Text
                      style={[
                        styles.heroPillTxt,
                        { color: C.brand, fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      LATEST OFFICIAL CALENDAR
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.heroTypeTxt,
                      { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                    ]}
                  >
                    {featuredCalendar.file_type === 'image' ? 'Photo / Notice' : 'PDF Document'}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.heroTitle,
                    { color: C.text, fontFamily: FontFamily.jakartaExtraBold },
                  ]}
                  numberOfLines={2}
                >
                  {featuredCalendar.title}
                </Text>

                <Text
                  style={[
                    styles.heroSub,
                    { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                  ]}
                  numberOfLines={1}
                >
                  {featuredCalendar.description || 'Published by BUBT Registrar · University-Wide'}
                </Text>

                {/* Direct 1-Tap Open Button */}
                <TouchableOpacity
                  style={[
                    styles.heroOpenBtn,
                    { backgroundColor: C.brand },
                  ]}
                  onPress={() => handleOpenCalendar(featuredCalendar)}
                  activeOpacity={0.8}
                >
                  <Feather name="external-link" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text
                    style={[
                      styles.heroOpenBtnTxt,
                      { color: '#ffffff', fontFamily: FontFamily.jakartaBold },
                    ]}
                  >
                    Open Full Document
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Section Header for All Semesters */}
            <View style={styles.sectionHeaderRow}>
              <Text
                style={[
                  styles.sectionHeader,
                  { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold },
                ]}
              >
                ALL SEMESTER CALENDARS
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <CalendarBar58
            item={item}
            onPress={handleOpenCalendar}
            C={C}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={C.brand} />
            </View>
          ) : (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <Feather name="calendar" size={36} color={C.textMuted} />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: C.text, fontFamily: FontFamily.jakartaBold },
                ]}
              >
                No Calendars Available
              </Text>
              <Text
                style={[
                  styles.emptySub,
                  { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                ]}
              >
                The academic calendar will appear here once published by the university.
              </Text>
            </View>
          )
        }
      />

      {/* PDF Document Viewer Modal */}
      {selectedDoc && selectedDoc.file_type === 'pdf' && (
        <CampusPdfViewerModal
          visible={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          title={selectedDoc.title}
          subtitle={selectedDoc.semester || 'Official BUBT Academic Calendar'}
          fileUrl={selectedDoc.file_url}
        />
      )}

      {/* Fullscreen Photo Viewer Modal */}
      {selectedDoc && selectedDoc.file_type === 'image' && (
        <Modal
          visible={photoViewerVisible}
          animationType="fade"
          transparent
          onRequestClose={() => {
            setPhotoViewerVisible(false);
            setSelectedDoc(null);
          }}
        >
          <View style={styles.photoViewerContainer}>
            <View style={[styles.photoHeader, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity
                style={styles.photoCloseBtn}
                onPress={() => {
                  setPhotoViewerVisible(false);
                  setSelectedDoc(null);
                }}
              >
                <Feather name="x" size={24} color="#ffffff" />
              </TouchableOpacity>
              <Text
                style={[styles.photoTitle, { fontFamily: FontFamily.jakartaBold }]}
                numberOfLines={1}
              >
                {selectedDoc.title}
              </Text>
              <TouchableOpacity
                style={styles.photoShareBtn}
                onPress={() => handleShareCalendar(selectedDoc)}
              >
                <Feather name="share-2" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.photoBody}>
              <Image
                source={{ uri: selectedDoc.file_url }}
                style={styles.photoImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerBlock: {
    marginBottom: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Admin shortcut banner
  adminStrip: {
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  adminStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminStripTxt: {
    fontSize: 13,
  },
  // Hero Featured Card
  heroCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  heroPillTxt: {
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  heroTypeTxt: {
    fontSize: 12,
  },
  heroTitle: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 14,
  },
  heroOpenBtn: {
    height: 46,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOpenBtnTxt: {
    fontSize: 14,
  },
  sectionHeaderRow: {
    marginTop: 4,
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 12,
    letterSpacing: 0.6,
  },
  // 58dp Bar
  bar58: {
    height: 58,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  iconSlot32: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  barTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  barSubtitle: {
    fontSize: 11.5,
    lineHeight: 15,
    marginTop: 1,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activeBadgeTxt: {
    fontSize: 9.5,
    letterSpacing: 0.3,
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 260,
  },
  // Photo Viewer Modal
  photoViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  photoCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    marginHorizontal: 12,
  },
  photoShareBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
});
