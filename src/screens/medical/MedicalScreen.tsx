import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  type ViewStyle,
} from 'react-native';
import { TactileSwitch } from '../../components/ui/TactileSwitch';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useApp } from '../../store/appStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { useToast } from '../../components/ui/Toast';
import { DirectionMapModal } from '../../components/location/DirectionMapModal';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { useT, type Dict } from '../../i18n';
import {
  nowDhakaMinutes,
  dhakaWeekday,
  toMinutes,
  formatTime12,
  fmtCountdown,
} from '../../utils/transitPrayer';
import { openUrl } from '../../utils/link';
import {
  BUBT_CLINIC_INFO,
  CLINIC_SERVICES,
  DISPENSARY_MEDICINES,
  NEARBY_HOSPITALS,
  EMERGENCY_CONTACTS,
  type EmergencyHospital,
} from '../../constants/medicalServices';
import type { Doctor } from '../../types/database';

const MED_COLOR = SectorColors.medical;
const MED_BG = `${SectorColors.medical}1e`;

type MedicalTab = 'staff' | 'services' | 'emergency';
type FilterType = 'all' | 'doctors' | 'psychologist' | 'today';

interface DutyState {
  badge: 'on_duty' | 'starting_soon' | 'off_duty' | 'on_leave';
  label: string;
  sub?: string;
  color: string;
  bg: string;
}

function isClinicOpenNow(): boolean {
  const day = dhakaWeekday();
  const openDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  if (!openDays.includes(day)) return false;
  const mins = nowDhakaMinutes();
  return mins >= 9 * 60 && mins < 17 * 60;
}

function getDoctorDuty(doc: Doctor, C: any, t: Dict): DutyState {
  if (doc.is_on_leave) {
    return {
      badge: 'on_leave',
      label: t.medical2.onLeaveBadge,
      sub: doc.leave_note || t.medical2.onLeaveToday,
      color: C.danger,
      bg: C.dangerBg,
    };
  }
  if (!doc.active) {
    return {
      badge: 'off_duty',
      label: t.medical2.notAvailableNow,
      color: C.textMuted,
      bg: C.surface2,
    };
  }

  const currentDay = dhakaWeekday();
  const days = Array.isArray(doc.days) ? doc.days : [];
  const worksToday = days.includes(currentDay);

  const startMins = toMinutes(doc.start_time);
  const endMins = toMinutes(doc.end_time);
  const nowMins = nowDhakaMinutes();

  if (worksToday) {
    if (nowMins >= startMins && nowMins < endMins) {
      const remaining = endMins - nowMins;
      return {
        badge: 'on_duty',
        label: t.medical2.onDuty,
        sub: remaining > 0 ? t.medical2.endsIn(fmtCountdown(remaining)) : undefined,
        color: C.success,
        bg: C.successBg,
      };
    }
    if (nowMins < startMins && startMins - nowMins <= 60) {
      const until = startMins - nowMins;
      return {
        badge: 'starting_soon',
        label: t.medical2.startsIn(fmtCountdown(until)),
        sub: `${t.medical2.today} ${formatTime12(doc.start_time)}`,
        color: C.warn,
        bg: C.warnBg,
      };
    }
    if (nowMins < startMins) {
      return {
        badge: 'off_duty',
        label: `${t.medical2.today} ${formatTime12(doc.start_time)}`,
        sub: `${formatTime12(doc.start_time)} - ${formatTime12(doc.end_time)}`,
        color: C.textMuted,
        bg: C.surface2,
      };
    }
    return {
      badge: 'off_duty',
      label: t.medical2.notAvailableNow,
      sub: `${formatTime12(doc.start_time)} - ${formatTime12(doc.end_time)}`,
      color: C.textMuted,
      bg: C.surface2,
    };
  }

  return {
    badge: 'off_duty',
    label: t.medical2.notAvailableNow,
    sub: `${formatTime12(doc.start_time)} - ${formatTime12(doc.end_time)}${days.length > 0 ? ` · ${days.join(', ')}` : ''}`,
    color: C.textMuted,
    bg: C.surface2,
  };
}

export function MedicalScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { lang } = useApp();
  const isBn = lang === 'bn';
  const toast = useToast();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [activeTab, setActiveTab] = useState<MedicalTab>('staff');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [dispensaryOpen, setDispensaryOpen] = useState(false);
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [mapHospital, setMapHospital] = useState<EmergencyHospital | null>(null);

  const [editModalDoc, setEditModalDoc] = useState<Doctor | null>(null);
  const [editIsOnLeave, setEditIsOnLeave] = useState(false);
  const [editLeaveNote, setEditLeaveNote] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const clinicOpen = isClinicOpenNow();

  const load = useCallback(async () => {
    const cached = await getCache<Doctor[]>(CacheKeys.DOCTORS);
    if (cached && cached.length > 0) {
      setDoctors(cached);
      setLoading(false);
    }

    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('name')
      .limit(100);

    if (error || !data) {
      if (cached && cached.length > 0) {
        setIsOffline(true);
      }
      setLoading(false);
      return;
    }

    setIsOffline(false);
    setDoctors(data as Doctor[]);
    setCache(CacheKeys.DOCTORS, data as Doctor[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const tabs: TabItem<MedicalTab>[] = useMemo(
    () => [
      { id: 'staff', label: t.medical2.tabStaff, accentColor: MED_COLOR },
      { id: 'services', label: t.medical2.tabServices, accentColor: MED_COLOR },
      { id: 'emergency', label: t.medical2.tabEmergency, accentColor: C.danger },
    ],
    [t, C.danger]
  );

  const filterOptions = useMemo(
    () => [
      {
        id: 'all' as FilterType,
        label: isBn ? 'সকল ডাক্তার ও স্পেশালিস্ট' : 'All Doctors & Specialists',
        sub: isBn ? 'সব মেডিকেল অফিসার ও কাউন্সেলিং বিশেষজ্ঞ' : 'All medical officers and counseling specialists',
        icon: 'medical',
      },
      {
        id: 'doctors' as FilterType,
        label: t.medical2.filterDoctors,
        sub: isBn ? 'জ্বর, ঠাণ্ডা ও সাধারণ চিকিৎসার এমবিবিএস ডাক্তার' : 'General physicians for fever, cold and consultations',
        icon: 'user-check',
      },
      {
        id: 'psychologist' as FilterType,
        label: t.medical2.filterCounseling,
        sub: isBn ? 'মানসিক স্বাস্থ্য সহায়তা ও গোপনীয় কাউন্সেলিং' : 'Confidential psychological support and counseling',
        icon: 'heart',
      },
      {
        id: 'today' as FilterType,
        label: t.medical2.filterOnDuty,
        sub: isBn ? 'আজ যাদের নির্ধারিত ডিউটি ও পরামর্শের সময় রয়েছে' : 'Staff members with active consultation hours today',
        icon: 'clock',
      },
    ],
    [t, isBn]
  );

  const selectedFilterObj = useMemo(
    () => filterOptions.find((f) => f.id === selectedFilter) || filterOptions[0],
    [filterOptions, selectedFilter]
  );

  const filteredMeds = useMemo(() => {
    const q = medSearchQuery.trim().toLowerCase();
    if (!q) return DISPENSARY_MEDICINES;
    return DISPENSARY_MEDICINES.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.useFor.toLowerCase().includes(q) ||
        (m.nameBn && m.nameBn.includes(q)) ||
        (m.useForBn && m.useForBn.includes(q))
    );
  }, [medSearchQuery]);

  const filteredDoctors = useMemo(() => {
    const today = dhakaWeekday();
    const query = searchQuery.trim().toLowerCase();

    return doctors.filter((d) => {
      if (!isAdmin && d.active === false) return false;

      if (selectedFilter === 'doctors') {
        const isDoc = d.role_type === 'doctor' || !d.role_type;
        if (!isDoc) return false;
      } else if (selectedFilter === 'psychologist') {
        const isPsych =
          d.role_type === 'psychologist' ||
          (d.specialty && d.specialty.toLowerCase().includes('psycholog'));
        if (!isPsych) return false;
      } else if (selectedFilter === 'today') {
        const worksToday = Array.isArray(d.days) && d.days.includes(today);
        if (!worksToday) return false;
      }

      if (query) {
        const nameMatch = d.name.toLowerCase().includes(query);
        const specMatch = d.specialty.toLowerCase().includes(query);
        const roomMatch = (d.room || '').toLowerCase().includes(query);
        const qualMatch = (d.qualifications || '').toLowerCase().includes(query);
        return nameMatch || specMatch || roomMatch || qualMatch;
      }

      return true;
    });
  }, [doctors, searchQuery, selectedFilter, isAdmin]);

  function openEditModal(d: Doctor) {
    setEditModalDoc(d);
    setEditIsOnLeave(!!d.is_on_leave);
    setEditLeaveNote(d.leave_note || '');
    setEditRoom(d.room || '');
  }

  async function handleSaveDoctorEdit() {
    if (!editModalDoc) return;
    setSavingEdit(true);

    const updates = {
      is_on_leave: editIsOnLeave,
      leave_note: editLeaveNote.trim() || null,
      room: editRoom.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('doctors')
      .update(updates)
      .eq('id', editModalDoc.id);

    setSavingEdit(false);
    if (error) {
      toast({ type: 'error', title: t.common.error, message: error.message });
      return;
    }

    const updatedList = doctors.map((d) =>
      d.id === editModalDoc.id ? { ...d, ...updates } : d
    );
    setDoctors(updatedList);
    setCache(CacheKeys.DOCTORS, updatedList);
    setEditModalDoc(null);
    toast({ type: 'success', title: t.medical2.updatedSuccess });
  }

  function handleDialPhone(phone: string) {
    openUrl(`tel:${phone.replace(/\s+/g, '')}`);
  }

  function handleOpenHospitalMap(hospital: EmergencyHospital) {
    setMapHospital(hospital);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.sectors.medical}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: Layout.screenPadding },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.brand}
          />
        }
      >
        <OfflineBanner visible={isOffline} onRetry={load} />

        {/* Hero BUBT Medical Unit Card */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={[styles.heroIconBadge, { backgroundColor: MED_BG }]}>
              <Icon name="medical" size={24} color={MED_COLOR} animation="entrance" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.heroTitle,
                  { color: C.text, fontFamily: FontFamily.jakartaExtraBold },
                ]}
              >
                {t.medical2.unitTitle}
              </Text>
              <Text
                style={[
                  styles.heroSub,
                  { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                ]}
              >
                {t.medical2.unitSub}
              </Text>
            </View>
            <View
              style={[
                styles.openPill,
                { backgroundColor: clinicOpen ? C.successBg : C.surface2 },
              ]}
            >
              <View
                style={[
                  styles.openDot,
                  { backgroundColor: clinicOpen ? C.success : C.textMuted },
                ]}
              />
              <Text
                style={[
                  styles.openTxt,
                  {
                    color: clinicOpen ? C.success : C.textMuted,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
              >
                {clinicOpen ? t.medical2.openNow : t.medical2.closedNow}
              </Text>
            </View>
          </View>

          <View style={[styles.heroDivider, { backgroundColor: C.border }]} />

          <View style={styles.heroBottomStack}>
            <View style={styles.heroHoursRow}>
              <View style={[styles.heroMiniIcon, { backgroundColor: C.surface2 }]}>
                <Icon name="clock" size={12} color={C.textMuted} />
              </View>
              <Text
                style={[
                  styles.heroHoursTxt,
                  { color: C.text2, fontFamily: FontFamily.jakartaMedium },
                ]}
              >
                {t.medical2.hoursToday}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.heroCallBtn, { backgroundColor: MED_BG }]}
              onPress={() => handleDialPhone(BUBT_CLINIC_INFO.phoneDirect)}
              activeOpacity={0.75}
            >
              <Icon name="phone" size={13} color={MED_COLOR} />
              <Text
                style={[
                  styles.heroCallBtnTxt,
                  { color: MED_COLOR, fontFamily: FontFamily.jakartaBold },
                ]}
                numberOfLines={1}
              >
                {isBn
                  ? `মেডিকেল ডেস্ক: ${BUBT_CLINIC_INFO.phoneDirect} (রুম ২০৫, এক্সট. ${BUBT_CLINIC_INFO.phoneExt})`
                  : `Medical Desk: ${BUBT_CLINIC_INFO.phoneDirect} (Ext. ${BUBT_CLINIC_INFO.phoneExt})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Universal Segmented Navigation Standard */}
        <View style={styles.tabContainer}>
          <SegmentedTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            size="md"
          />
        </View>

        {/* TAB 1: DOCTORS & STAFF */}
        {activeTab === 'staff' && (
          <View style={styles.tabContent}>
            {/* Search Input */}
            <View
              style={[
                styles.searchBox,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <Icon name="search" size={18} color={C.textMuted} />
              <TextInput
                style={[
                  styles.searchInput,
                  { color: C.text, fontFamily: FontFamily.jakartaMedium },
                ]}
                placeholder={t.medical2.searchPlaceholder}
                placeholderTextColor={C.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="close" size={14} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* 72dp Universal Dropdown Selector Card Standard */}
            <TouchableOpacity
              style={[
                styles.dropdownBar,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
              onPress={() => setFilterModalVisible(true)}
              activeOpacity={0.75}
            >
              <View style={[styles.dropdownIconTile, { backgroundColor: MED_BG }]}>
                <Icon name={selectedFilterObj.icon} size={20} color={MED_COLOR} />
              </View>
              <View style={styles.dropdownBody}>
                <Text
                  style={[
                    styles.dropdownLabel,
                    { color: C.textMuted, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  {isBn ? 'তালিকা ফিল্টার' : 'ROSTER FILTER'}
                </Text>
                <Text
                  style={[
                    styles.dropdownValue,
                    { color: C.text, fontFamily: FontFamily.jakartaBold },
                  ]}
                  numberOfLines={1}
                >
                  {selectedFilterObj.label}
                </Text>
              </View>
              <Icon name="chevD" size={18} color={C.textMuted} />
            </TouchableOpacity>

            {/* Doctor List */}
            {loading && doctors.length === 0 ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={C.brand} />
            ) : filteredDoctors.length === 0 ? (
              <View style={styles.empty}>
                <Icon name="medical" size={28} color={C.textMuted} />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: C.text, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  {t.medical2.noMatches}
                </Text>
              </View>
            ) : (
              <View style={styles.doctorList}>
                {filteredDoctors.map((doc) => {
                  const duty = getDoctorDuty(doc, C, t);
                  const isPsych =
                    doc.role_type === 'psychologist' ||
                    (doc.specialty &&
                      doc.specialty.toLowerCase().includes('psycholog'));

                  return (
                    <TouchableOpacity
                      key={doc.id}
                      style={[
                        styles.doctorCard72,
                        { backgroundColor: C.surface, borderColor: C.border },
                      ]}
                      onPress={() =>
                        navigation.navigate('DoctorDetail', { doctorId: doc.id })
                      }
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.docThumb44,
                          {
                            backgroundColor: isPsych
                              ? isDark
                                ? 'rgba(168, 85, 247, 0.16)'
                                : 'rgba(147, 51, 234, 0.1)'
                              : MED_BG,
                          },
                        ]}
                      >
                        <Icon
                          name={isPsych ? 'heart' : 'medical'}
                          size={20}
                          color={isPsych ? '#a855f7' : MED_COLOR}
                        />
                      </View>

                      <View style={styles.docBody72}>
                        <Text
                          style={[
                            styles.docName72,
                            { color: C.text, fontFamily: FontFamily.jakartaBold },
                          ]}
                          numberOfLines={1}
                        >
                          {doc.name}
                        </Text>
                        <Text
                          style={[
                            styles.docSub72,
                            {
                              color: isPsych ? '#a855f7' : C.textMuted,
                              fontFamily: FontFamily.jakartaMedium,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {doc.specialty} · {doc.room ?? BUBT_CLINIC_INFO.room}
                        </Text>
                      </View>

                      <View style={styles.docRight72}>
                        <View
                          style={[
                            styles.dutyBadge72,
                            { backgroundColor: duty.bg },
                          ]}
                        >
                          {duty.badge === 'on_duty' && (
                            <View
                              style={[
                                styles.dutyLiveDot,
                                { backgroundColor: duty.color },
                              ]}
                            />
                          )}
                          <Text
                            style={[
                              styles.dutyBadgeTxt72,
                              {
                                color: duty.color,
                                fontFamily: FontFamily.jakartaBold,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {duty.label}
                          </Text>
                        </View>
                        {isAdmin && (
                          <TouchableOpacity
                            style={[
                              styles.adminQuickBtn36,
                              { backgroundColor: C.surface2 },
                            ]}
                            onPress={() => openEditModal(doc)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Icon name="sliders" size={13} color={C.textMuted} />
                          </TouchableOpacity>
                        )}
                        <Icon name="chevR" size={16} color={C.textMuted} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: CLINIC SERVICES & FREE MEDICINE */}
        {activeTab === 'services' && (
          <View style={styles.tabContent}>
            {/* Clinic Policy Card */}
            <View
              style={[
                styles.policyCard,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <View style={styles.policyRow}>
                <View style={[styles.policyIconBadge, { backgroundColor: C.infoBg }]}>
                  <Icon name="shield" size={16} color={C.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.policyTitle,
                      { color: C.text, fontFamily: FontFamily.jakartaBold },
                    ]}
                  >
                    {t.medical2.rulesNotice}
                  </Text>
                  <Text
                    style={[
                      styles.policySub,
                      { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                    ]}
                  >
                    {t.medical2.servicesSub}
                  </Text>
                </View>
              </View>
            </View>

            {/* On-Campus Healthcare Services */}
            <Text
              style={[
                styles.sectionHeader,
                { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold },
              ]}
            >
              {t.medical2.servicesOverview}
            </Text>

            <View style={styles.serviceList72}>
              {CLINIC_SERVICES.map((srv) => (
                <View
                  key={srv.id}
                  style={[
                    styles.serviceCard72,
                    { backgroundColor: C.surface, borderColor: C.border },
                  ]}
                >
                  <View
                    style={[
                      styles.srvIconBox44,
                      {
                        backgroundColor:
                          srv.id === 'mental_health'
                            ? isDark
                              ? 'rgba(168, 85, 247, 0.16)'
                              : 'rgba(147, 51, 234, 0.1)'
                            : MED_BG,
                      },
                    ]}
                  >
                    <Icon
                      name={srv.icon}
                      size={20}
                      color={srv.id === 'mental_health' ? '#a855f7' : MED_COLOR}
                    />
                  </View>
                  <View style={styles.srvBody72}>
                    <Text
                      style={[
                        styles.srvTitle72,
                        { color: C.text, fontFamily: FontFamily.jakartaBold },
                      ]}
                      numberOfLines={1}
                    >
                      {isBn ? srv.titleBn : srv.title}
                    </Text>
                    <Text
                      style={[
                        styles.srvDesc72,
                        { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                      ]}
                      numberOfLines={1}
                    >
                      {isBn ? srv.descBn : srv.desc}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.srvBadge72,
                      {
                        backgroundColor:
                          srv.id === 'mental_health'
                            ? isDark
                              ? 'rgba(168, 85, 247, 0.16)'
                              : 'rgba(147, 51, 234, 0.1)'
                            : C.surface2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.srvBadgeTxt72,
                        {
                          color: srv.id === 'mental_health' ? '#a855f7' : C.text2,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {isBn ? srv.badgeBn : srv.badge}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Free Dispensary Medicines Dropdown Accordion (72dp Bar Standard) */}
            <TouchableOpacity
              style={[
                styles.dispensaryHeaderBar72,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
              onPress={() => setDispensaryOpen((prev) => !prev)}
              activeOpacity={0.75}
            >
              <View style={[styles.srvIconBox44, { backgroundColor: MED_BG }]}>
                <Icon name="shield" size={20} color={MED_COLOR} />
              </View>
              <View style={styles.srvBody72}>
                <Text
                  style={[
                    styles.srvTitle72,
                    { color: C.text, fontFamily: FontFamily.jakartaBold },
                  ]}
                  numberOfLines={1}
                >
                  {t.medical2.dispensaryTitle}
                </Text>
                <Text
                  style={[
                    styles.srvDesc72,
                    { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                  ]}
                  numberOfLines={1}
                >
                  {dispensaryOpen
                    ? (isBn ? 'ওষুধের তালিকা লুকাতে ট্যাপ করুন' : 'Tap to collapse medicine list')
                    : (isBn ? 'রুম ২০৫-এ সংরক্ষিত ওষুধ · তালিকা দেখতে ট্যাপ করুন' : 'Room 205 · Tap to expand medicine list')}
                </Text>
              </View>
              <Icon
                name={dispensaryOpen ? 'chevU' : 'chevD'}
                size={18}
                color={C.textMuted}
              />
            </TouchableOpacity>

            {dispensaryOpen && (
              <View style={styles.dispensaryContent}>
                {/* 58dp Universal Medicine Search Bar */}
                <View
                  style={[
                    styles.searchBox,
                    { backgroundColor: C.surface, borderColor: C.border, marginBottom: 10 },
                  ]}
                >
                  <Icon name="search" size={18} color={C.textMuted} />
                  <TextInput
                    style={[
                      styles.searchInput,
                      { color: C.text, fontFamily: FontFamily.jakartaMedium },
                    ]}
                    placeholder={
                      isBn
                        ? 'ওষুধ বা লক্ষণ খুঁজুন (যেমন প্যারাসিটামল, গ্যাস্ট্রিক)...'
                        : 'Search medicine or symptom (e.g. Napa, Antacid)...'
                    }
                    placeholderTextColor={C.textMuted}
                    value={medSearchQuery}
                    onChangeText={setMedSearchQuery}
                    autoCorrect={false}
                  />
                  {medSearchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setMedSearchQuery('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="close" size={14} color={C.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 72dp Medicine List Rows */}
                <View style={styles.medsList72}>
                  {filteredMeds.length === 0 ? (
                    <View style={styles.empty}>
                      <Icon name="medical" size={26} color={C.textMuted} />
                      <Text
                        style={[
                          styles.emptyTitle,
                          { color: C.text, fontFamily: FontFamily.jakartaBold },
                        ]}
                      >
                        {isBn
                          ? 'আপনার অনুসন্ধানের সাথে কোনো ওষুধ মেলেনি'
                          : 'No medicines matched your search'}
                      </Text>
                    </View>
                  ) : (
                    filteredMeds.map((med, idx) => (
                      <View
                        key={med.id}
                        style={[
                          styles.medRow72,
                          { backgroundColor: C.surface, borderColor: C.border },
                        ]}
                      >
                        <View style={[styles.medIndexBadge44, { backgroundColor: C.surface2 }]}>
                          <Text
                            style={[
                              styles.medIndexTxt,
                              { color: C.text2, fontFamily: FontFamily.jakartaBold },
                            ]}
                          >
                            {idx + 1}
                          </Text>
                        </View>
                        <View style={styles.medBody72}>
                          <Text
                            style={[
                              styles.medName72,
                              { color: C.text, fontFamily: FontFamily.jakartaBold },
                            ]}
                            numberOfLines={1}
                          >
                            {isBn ? med.nameBn : med.name}
                          </Text>
                          <Text
                            style={[
                              styles.medSub72,
                              { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                            ]}
                            numberOfLines={1}
                          >
                            {isBn ? med.categoryBn : med.category} · {isBn ? med.useForBn : med.useFor}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.freeBadge,
                            { backgroundColor: C.successBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.freeBadgeTxt,
                              { color: C.success, fontFamily: FontFamily.jakartaBold },
                            ]}
                          >
                            {isBn ? 'ফ্রি' : 'Free'}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* TAB 3: EMERGENCY & NEARBY HOSPITALS */}
        {activeTab === 'emergency' && (
          <View style={styles.tabContent}>
            {/* Emergency Hotline Header Card */}
            <View
              style={[
                styles.emergencyBanner,
                { backgroundColor: C.dangerBg, borderColor: C.danger },
              ]}
            >
              <View style={styles.emergencyBannerTop}>
                <View style={[styles.emIconRound, { backgroundColor: C.danger }]}>
                  <Icon name="alert-triangle" size={20} color={C.white} animation="pulse" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.emergencyBannerTitle,
                      { color: C.danger, fontFamily: FontFamily.jakartaExtraBold },
                    ]}
                  >
                    {t.medical2.emergencyHeader}
                  </Text>
                  <Text
                    style={[
                      styles.emergencyBannerSub,
                      { color: C.text2, fontFamily: FontFamily.jakartaMedium },
                    ]}
                  >
                    {t.medical2.emergencyNotice}
                  </Text>
                </View>
              </View>
            </View>

            {/* Immediate Contacts (72dp Standard) */}
            <View style={styles.hotlineList}>
              {EMERGENCY_CONTACTS.map((cnt) => (
                <TouchableOpacity
                  key={cnt.id}
                  style={[
                    styles.hotlineCard,
                    {
                      backgroundColor: cnt.isNational ? C.dangerBg : C.surface,
                      borderColor: cnt.isNational ? C.danger : C.border,
                    },
                  ]}
                  onPress={() => handleDialPhone(cnt.phone)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.hotlineIconBox,
                      {
                        backgroundColor: cnt.isNational
                          ? C.danger
                          : `${C.info}1e`,
                      },
                    ]}
                  >
                    <Icon
                      name={cnt.icon}
                      size={20}
                      color={cnt.isNational ? C.white : C.info}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        styles.hotlineTitle,
                        {
                          color: cnt.isNational ? C.danger : C.text,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {isBn ? cnt.titleBn : cnt.title}
                    </Text>
                    <Text
                      style={[
                        styles.hotlineSub,
                        { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                      ]}
                      numberOfLines={1}
                    >
                      {isBn ? cnt.subBn : cnt.sub}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.callBadge,
                      {
                        backgroundColor: cnt.isNational
                          ? C.danger
                          : MED_COLOR,
                      },
                    ]}
                  >
                    <Icon name="phone" size={13} color={C.white} />
                    <Text
                      style={[
                        styles.callBadgeTxt,
                        { color: C.white, fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      {cnt.phone}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Emergency Blood Request Bridge (72dp Standard) */}
            <TouchableOpacity
              style={[
                styles.bloodBridgeCard,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
              onPress={() => navigation.navigate('Blood')}
              activeOpacity={0.75}
            >
              <View style={[styles.bloodBridgeIconTile, { backgroundColor: `${SectorColors.blood}18` }]}>
                <Icon name="blood" size={20} color={SectorColors.blood} />
              </View>
              <View style={styles.bloodBridgeBody}>
                <Text
                  style={[
                    styles.bloodBridgeTitle,
                    { color: C.text, fontFamily: FontFamily.jakartaBold },
                  ]}
                  numberOfLines={1}
                >
                  {isBn ? 'রোগীর জন্য জরুরি রক্ত প্রয়োজন?' : 'Need Emergency Blood for Patient?'}
                </Text>
                <Text
                  style={[
                    styles.bloodBridgeSub,
                    { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                  ]}
                  numberOfLines={1}
                >
                  {isBn ? 'রক্তদাতা খুঁজুন অথবা জরুরি রক্তের অনুরোধ পোস্ট করুন' : 'Find active donors or post urgent blood request'}
                </Text>
              </View>
              <Icon name="chevR" size={17} color={C.textMuted} />
            </TouchableOpacity>

            {/* Nearby Emergency Hospitals in Mirpur */}
            <Text
              style={[
                styles.sectionHeader,
                { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 22 },
              ]}
            >
              {t.medical2.nearbyHospitalsTitle}
            </Text>
            <Text
              style={[
                styles.sectionSub,
                { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
              ]}
            >
              {t.medical2.nearbyHospitalsSub}
            </Text>

            <View style={styles.hospitalList72}>
              {NEARBY_HOSPITALS.map((hosp) => (
                <View
                  key={hosp.id}
                  style={[
                    styles.hospCard72,
                    { backgroundColor: C.surface, borderColor: C.border },
                  ]}
                >
                  <View style={[styles.hospIconBox44, { backgroundColor: MED_BG }]}>
                    <Icon name="activity" size={20} color={MED_COLOR} />
                  </View>

                  <View style={styles.hospBody72}>
                    <Text
                      style={[
                        styles.hospName72,
                        { color: C.text, fontFamily: FontFamily.jakartaBold },
                      ]}
                      numberOfLines={1}
                    >
                      {isBn ? hosp.nameBn : hosp.name}
                    </Text>
                    <Text
                      style={[
                        styles.hospSub72,
                        { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                      ]}
                      numberOfLines={1}
                    >
                      {isBn ? hosp.distanceBn : hosp.distance} · {isBn ? hosp.typeBn : hosp.type}
                    </Text>
                  </View>

                  <View style={styles.hospBtnsRow}>
                    <TouchableOpacity
                      style={[
                        styles.hospCallMiniBtn,
                        { backgroundColor: MED_BG },
                      ]}
                      onPress={() => handleDialPhone(hosp.hotline)}
                      activeOpacity={0.75}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Icon name="phone" size={15} color={MED_COLOR} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.hospMapMiniBtn,
                        { backgroundColor: C.surface2, borderColor: C.border },
                      ]}
                      onPress={() => handleOpenHospitalMap(hosp)}
                      activeOpacity={0.75}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Icon name="navigation" size={15} color={C.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* ROSTER FILTER BOTTOM SHEET MODAL */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
          />
          <View
            style={[
              styles.sheetCard,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                paddingBottom: Math.max(insets.bottom + 16, 34),
              },
            ]}
          >
            <View style={styles.sheetHandle}>
              <View style={[styles.sheetHandleBar, { backgroundColor: C.border }]} />
            </View>

            <Text
              style={[
                styles.sheetTitle,
                { color: C.text, fontFamily: FontFamily.jakartaBold },
              ]}
            >
              {isBn ? 'মেডিকেল স্টাফ ফিল্টার করুন' : 'Filter Medical Staff'}
            </Text>

            <View style={{ gap: 8, marginTop: 10 }}>
              {filterOptions.map((opt) => {
                const isSelected = selectedFilter === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.pickerBar,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? `${MED_COLOR}22`
                            : `${MED_COLOR}12`
                          : C.surface2,
                        borderColor: isSelected ? MED_COLOR : C.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedFilter(opt.id);
                      setFilterModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.pickerIconTile,
                        {
                          backgroundColor: isSelected
                            ? MED_COLOR
                            : isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.05)',
                        },
                      ]}
                    >
                      <Icon
                        name={opt.icon}
                        size={18}
                        color={isSelected ? C.white : MED_COLOR}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          styles.pickerBarText,
                          {
                            color: isSelected ? MED_COLOR : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={[
                          styles.pickerBarSub,
                          { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                        ]}
                        numberOfLines={1}
                      >
                        {opt.sub}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View style={[styles.checkCircle, { backgroundColor: MED_COLOR }]}>
                        <Icon name="check" size={13} color={C.white} />
                      </View>
                    ) : (
                      <View style={[styles.emptyCircle, { borderColor: C.border }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* ADMIN DOCTOR / STAFF MANAGE MODAL */}
      <Modal
        visible={!!editModalDoc}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalDoc(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setEditModalDoc(null)}
          />
          <View
            style={[
              styles.sheetCard,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                paddingBottom: Math.max(insets.bottom + 16, 34),
              },
            ]}
          >
            <View style={styles.sheetHandle}>
              <View style={[styles.sheetHandleBar, { backgroundColor: C.border }]} />
            </View>

            <Text
              style={[
                styles.sheetTitle,
                { color: C.text, fontFamily: FontFamily.jakartaExtraBold },
              ]}
            >
              {t.medical2.adminEditTitle}
            </Text>

            {editModalDoc && (
              <View style={styles.modalContent}>
                <Text
                  style={[
                    styles.modalDocName,
                    { color: C.text, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  {editModalDoc.name}
                </Text>
                <Text
                  style={[
                    styles.modalDocSpec,
                    { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                  ]}
                >
                  {editModalDoc.specialty}
                </Text>

                {/* Leave toggle (72dp full-row interactive standard) */}
                <TouchableOpacity
                  style={[
                    styles.toggleRow,
                    { backgroundColor: C.surface2, borderColor: C.border },
                  ]}
                  onPress={() => setEditIsOnLeave((v) => !v)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.toggleLabel,
                        { color: C.text, fontFamily: FontFamily.jakartaBold },
                      ]}
                      numberOfLines={1}
                    >
                      {t.medical2.markOnLeave}
                    </Text>
                    <Text
                      style={[
                        styles.toggleSub,
                        { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                      ]}
                      numberOfLines={1}
                    >
                      {isBn ? 'শিক্ষার্থীদের কাছে ছুটির সতর্কবার্তা দেখাবে' : 'Displays an on-leave warning to students'}
                    </Text>
                  </View>
                  <TactileSwitch
                    value={editIsOnLeave}
                    onValueChange={setEditIsOnLeave}
                    variant="danger"
                  />
                </TouchableOpacity>

                {/* Leave reason input */}
                {editIsOnLeave && (
                  <View style={{ marginTop: 12 }}>
                    <Text
                      style={[
                        styles.inputLabel,
                        { color: C.text2, fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      {t.medical2.leaveReason}
                    </Text>
                    <TextInput
                      style={[
                        styles.modalInput,
                        {
                          backgroundColor: C.surface2,
                          color: C.text,
                          borderColor: C.border,
                          fontFamily: FontFamily.jakartaMedium,
                        },
                      ]}
                      placeholder="e.g. In faculty seminar until 1:00 PM"
                      placeholderTextColor={C.textMuted}
                      value={editLeaveNote}
                      onChangeText={setEditLeaveNote}
                    />
                  </View>
                )}

                {/* Room input */}
                <View style={{ marginTop: 12 }}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: C.text2, fontFamily: FontFamily.jakartaBold },
                    ]}
                  >
                    {t.medical2.location}
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: C.surface2,
                        color: C.text,
                        borderColor: C.border,
                        fontFamily: FontFamily.jakartaMedium,
                      },
                    ]}
                    placeholder="Room 205, Building 3"
                    placeholderTextColor={C.textMuted}
                    value={editRoom}
                    onChangeText={setEditRoom}
                  />
                </View>

                {/* Save Button (58dp) */}
                <TouchableOpacity
                  style={[
                    styles.modalSaveBtn,
                    { backgroundColor: MED_COLOR },
                  ]}
                  onPress={handleSaveDoctorEdit}
                  disabled={savingEdit}
                  activeOpacity={0.75}
                >
                  {savingEdit ? (
                    <ActivityIndicator color={C.white} size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.modalSaveTxt,
                        { color: C.white, fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      {t.medical2.saveChanges}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Interactive Hospital Route & Directions Modal */}
      {mapHospital && (
        <DirectionMapModal
          visible={!!mapHospital}
          onClose={() => setMapHospital(null)}
          destination={mapHospital.name}
          destinationSub={mapHospital.address}
          destinationCoords={mapHospital.coords}
          title={isBn ? mapHospital.nameBn : mapHospital.name}
          sectorColor={MED_COLOR}
          iconName="activity"
          badgeText={isBn ? mapHospital.distanceBn : mapHospital.distance}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 6, paddingBottom: 20 } as ViewStyle,

  // Hero Card
  heroCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  } as ViewStyle,
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  heroIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  } as ViewStyle,
  heroTitle: { fontSize: 16 } as any,
  heroSub: { fontSize: 12, marginTop: 2 } as any,
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  } as ViewStyle,
  openDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  openTxt: { fontSize: 11 } as any,
  heroDivider: { height: StyleSheet.hairlineWidth, marginVertical: 12 } as ViewStyle,
  heroBottomStack: { gap: 8 } as ViewStyle,
  heroHoursRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  heroMiniIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  heroHoursTxt: { fontSize: 12 } as any,
  heroCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    alignSelf: 'flex-start',
  } as ViewStyle,
  heroCallBtnTxt: { fontSize: 12 } as any,

  // Tabs
  tabContainer: { marginBottom: 12 } as ViewStyle,
  tabContent: {} as ViewStyle,

  // Search & Filters
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  searchInput: { flex: 1, fontSize: 14.5, paddingVertical: 0 } as any,
  dropdownBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 72,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  dropdownIconTile: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  dropdownBody: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  dropdownLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as any,
  dropdownValue: {
    fontSize: 14.5,
    marginTop: 2,
  } as any,

  // Doctor List (72dp Fixed Height Card Standard)
  doctorList: { gap: 10 } as ViewStyle,
  doctorCard72: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  docThumb44: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  docBody72: { flex: 1, minWidth: 0, justifyContent: 'center' } as ViewStyle,
  docName72: { fontSize: 14.5, letterSpacing: -0.2 } as any,
  docSub72: { fontSize: 11.5, marginTop: 2 } as any,
  docRight72: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 } as ViewStyle,
  dutyBadge72: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  } as ViewStyle,
  dutyLiveDot: { width: 5.5, height: 5.5, borderRadius: 3 } as ViewStyle,
  dutyBadgeTxt72: { fontSize: 10.5 } as any,
  adminQuickBtn36: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // Tab 2: Policy & Services (72dp Fixed Height Standard)
  policyCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  } as ViewStyle,
  policyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 } as ViewStyle,
  policyIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  policyTitle: { fontSize: 13 } as any,
  policySub: { fontSize: 11.5, marginTop: 2 } as any,
  sectionHeader: { fontSize: 11, letterSpacing: 0.8, marginBottom: 8 } as any,
  sectionSub: { fontSize: 12, marginBottom: 10 } as any,
  serviceList72: { gap: 10 } as ViewStyle,
  serviceCard72: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  srvIconBox44: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  srvBody72: { flex: 1, minWidth: 0, justifyContent: 'center' } as ViewStyle,
  srvTitle72: { fontSize: 14.5 } as any,
  srvDesc72: { fontSize: 11.5, marginTop: 2 } as any,
  srvBadge72: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 } as ViewStyle,
  srvBadgeTxt72: { fontSize: 10.5 } as any,

  // Dispensary Meds Dropdown & 72dp Rows
  dispensaryHeaderBar72: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 72,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginTop: 14,
  } as ViewStyle,
  dispensaryContent: { marginTop: 10 } as ViewStyle,
  medsList72: { gap: 8 } as ViewStyle,
  medRow72: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  medIndexBadge44: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  medIndexTxt: { fontSize: 12 } as any,
  medBody72: { flex: 1, minWidth: 0, justifyContent: 'center' } as ViewStyle,
  medName72: { fontSize: 14.5 } as any,
  medSub72: { fontSize: 11.5, marginTop: 2 } as any,
  freeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 } as ViewStyle,
  freeBadgeTxt: { fontSize: 11 } as any,

  // Tab 3: Emergency & Hotlines
  emergencyBanner: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  } as ViewStyle,
  emergencyBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 11 } as ViewStyle,
  emIconRound: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  } as ViewStyle,
  emergencyBannerTitle: { fontSize: 14 } as any,
  emergencyBannerSub: { fontSize: 12, marginTop: 3 } as any,
  hotlineList: { gap: 10 } as ViewStyle,
  hotlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  hotlineIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  hotlineTitle: { fontSize: 14 } as any,
  hotlineSub: { fontSize: 11.5, marginTop: 2 } as any,
  callBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  } as ViewStyle,
  callBadgeTxt: { fontSize: 11.5 } as any,

  // Nearby Hospitals (72dp Fixed Height Card Standard)
  hospitalList72: { gap: 10 } as ViewStyle,
  hospCard72: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  hospIconBox44: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  hospBody72: { flex: 1, minWidth: 0, justifyContent: 'center' } as ViewStyle,
  hospName72: { fontSize: 14.5 } as any,
  hospSub72: { fontSize: 11.5, marginTop: 2 } as any,
  hospBtnsRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0 } as ViewStyle,
  hospCallMiniBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  hospMapMiniBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  } as ViewStyle,

  // Emergency Blood Bridge Card (72dp 2-Line Standard)
  bloodBridgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 72,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginTop: 12,
  } as ViewStyle,
  bloodBridgeIconTile: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  bloodBridgeBody: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  bloodBridgeTitle: {
    fontSize: 14,
  } as any,
  bloodBridgeSub: {
    fontSize: 11.5,
    marginTop: 2,
  } as any,

  // Sheet Card & Picker Bars (72dp 2-Line Option Bar Standard)
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  } as ViewStyle,
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  } as ViewStyle,
  sheetCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 34,
    borderWidth: 1,
  } as ViewStyle,
  sheetHandle: {
    alignItems: 'center',
    marginBottom: 14,
  } as ViewStyle,
  sheetHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  } as ViewStyle,
  sheetTitle: {
    fontSize: 17,
    marginBottom: 6,
  } as any,

  pickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 72,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
  } as ViewStyle,
  pickerIconTile: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  pickerBarText: {
    fontSize: 14,
  } as any,
  pickerBarSub: {
    fontSize: 11.5,
    marginTop: 2,
  } as any,
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  emptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  } as ViewStyle,

  // Admin Modal Controls
  modalContent: {} as ViewStyle,
  modalDocName: { fontSize: 15 } as any,
  modalDocSpec: { fontSize: 12.5, marginTop: 2, marginBottom: 14 } as any,
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  toggleLabel: { fontSize: 13.5 } as any,
  toggleSub: { fontSize: 11, marginTop: 2 } as any,
  inputLabel: { fontSize: 12, marginBottom: 6 } as any,
  modalInput: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14.5,
  } as any,
  modalSaveBtn: {
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  } as ViewStyle,
  modalSaveTxt: { fontSize: 15 } as any,

  empty: { alignItems: 'center', paddingTop: 40, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 15 } as any,
});
