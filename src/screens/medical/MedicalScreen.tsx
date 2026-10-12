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
  Switch,
  type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { useT } from '../../i18n';
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
  return mins >= 9 * 60 && mins <= 17 * 60;
}

function getDoctorDuty(doc: Doctor, C: any): DutyState {
  if (doc.is_on_leave) {
    return {
      badge: 'on_leave',
      label: 'On Leave',
      sub: doc.leave_note || 'Absent today',
      color: C.danger,
      bg: C.dangerBg,
    };
  }
  if (!doc.active) {
    return {
      badge: 'off_duty',
      label: 'Inactive',
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
    if (nowMins >= startMins && nowMins <= endMins) {
      const remaining = endMins - nowMins;
      return {
        badge: 'on_duty',
        label: 'On Duty',
        sub: remaining > 0 ? `Ends in ${fmtCountdown(remaining)}` : undefined,
        color: C.success,
        bg: C.successBg,
      };
    }
    if (nowMins < startMins && startMins - nowMins <= 60) {
      const until = startMins - nowMins;
      return {
        badge: 'starting_soon',
        label: `Starts in ${fmtCountdown(until)}`,
        sub: `Today ${formatTime12(doc.start_time)}`,
        color: C.warn,
        bg: C.warnBg,
      };
    }
    if (nowMins < startMins) {
      return {
        badge: 'off_duty',
        label: `Today ${formatTime12(doc.start_time)}`,
        color: C.textMuted,
        bg: C.surface2,
      };
    }
    return {
      badge: 'off_duty',
      label: 'Shift Ended',
      sub: `${formatTime12(doc.start_time)} - ${formatTime12(doc.end_time)}`,
      color: C.textMuted,
      bg: C.surface2,
    };
  }

  return {
    badge: 'off_duty',
    label: `${formatTime12(doc.start_time)} - ${formatTime12(doc.end_time)}`,
    sub: days.length > 0 ? days.join(', ') : undefined,
    color: C.textMuted,
    bg: C.surface2,
  };
}

export function MedicalScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [activeTab, setActiveTab] = useState<MedicalTab>('staff');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

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
      { id: 'staff', label: t.medical2.tabStaff, icon: 'users' },
      { id: 'services', label: t.medical2.tabServices, icon: 'activity' },
      { id: 'emergency', label: t.medical2.tabEmergency, icon: 'alert-triangle' },
    ],
    [t]
  );

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
    if (!error) {
      setDoctors((prev) =>
        prev.map((d) => (d.id === editModalDoc.id ? { ...d, ...updates } : d))
      );
      setEditModalDoc(null);
    }
  }

  function handleDialPhone(phone: string) {
    openUrl(`tel:${phone.replace(/\s+/g, '')}`);
  }

  function handleOpenHospitalMap(hospital: EmergencyHospital) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      hospital.mapQuery
    )}`;
    openUrl(url);
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
              <Icon name="medical" size={24} color={MED_COLOR} />
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

          <View style={styles.heroBottomRow}>
            <View style={styles.heroHoursCol}>
              <Icon name="clock" size={13} color={C.textMuted} />
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
              >
                {t.medical2.callDesk}
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
              <Icon name="search" size={16} color={C.textMuted} />
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

            {/* Quick Filter Chips */}
            <View style={styles.filterRow}>
              {(
                [
                  { id: 'all', label: t.medical2.filterAll },
                  { id: 'doctors', label: t.medical2.filterDoctors },
                  { id: 'psychologist', label: t.medical2.filterCounseling },
                  { id: 'today', label: t.medical2.filterOnDuty },
                ] as const
              ).map((chip) => {
                const isSelected = selectedFilter === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? MED_COLOR : C.surface,
                        borderColor: isSelected ? MED_COLOR : C.border,
                      },
                    ]}
                    onPress={() => setSelectedFilter(chip.id)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.filterChipTxt,
                        {
                          color: isSelected ? C.white : C.text2,
                          fontFamily: isSelected
                            ? FontFamily.jakartaBold
                            : FontFamily.jakartaMedium,
                        },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

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
                  const duty = getDoctorDuty(doc, C);
                  const isPsych =
                    doc.role_type === 'psychologist' ||
                    (doc.specialty &&
                      doc.specialty.toLowerCase().includes('psycholog'));

                  return (
                    <TouchableOpacity
                      key={doc.id}
                      style={[
                        styles.doctorCard,
                        { backgroundColor: C.surface, borderColor: C.border },
                      ]}
                      onPress={() =>
                        navigation.navigate('DoctorDetail', { doctorId: doc.id })
                      }
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.docThumb,
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
                          size={22}
                          color={isPsych ? '#a855f7' : MED_COLOR}
                        />
                      </View>

                      <View style={styles.docCardBody}>
                        <View style={styles.docNameRow}>
                          <Text
                            style={[
                              styles.docName,
                              { color: C.text, fontFamily: FontFamily.jakartaBold },
                            ]}
                            numberOfLines={1}
                          >
                            {doc.name}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.docSpec,
                            {
                              color: isPsych ? '#a855f7' : C.text2,
                              fontFamily: FontFamily.jakartaMedium,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {doc.specialty}
                          {doc.qualifications ? ` · ${doc.qualifications}` : ''}
                        </Text>

                        <Text
                          style={[
                            styles.docRoom,
                            { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                          ]}
                          numberOfLines={1}
                        >
                          {doc.room ?? BUBT_CLINIC_INFO.room}
                        </Text>

                        <View style={styles.docDutyRow}>
                          <View
                            style={[
                              styles.dutyBadge,
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
                                styles.dutyBadgeTxt,
                                {
                                  color: duty.color,
                                  fontFamily: FontFamily.jakartaBold,
                                },
                              ]}
                            >
                              {duty.label}
                            </Text>
                          </View>

                          {duty.sub ? (
                            <Text
                              style={[
                                styles.dutySubTxt,
                                {
                                  color: C.textMuted,
                                  fontFamily: FontFamily.jakartaMedium,
                                },
                              ]}
                            >
                              {duty.sub}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.cardRightCol}>
                        {isAdmin && (
                          <TouchableOpacity
                            style={[
                              styles.adminQuickBtn,
                              { backgroundColor: C.surface2 },
                            ]}
                            onPress={() => openEditModal(doc)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Icon name="sliders" size={14} color={C.textMuted} />
                          </TouchableOpacity>
                        )}
                        <Icon name="chevR" size={17} color={C.textMuted} />
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

            <View style={styles.serviceGrid}>
              {CLINIC_SERVICES.map((srv) => (
                <View
                  key={srv.id}
                  style={[
                    styles.serviceCard,
                    { backgroundColor: C.surface, borderColor: C.border },
                  ]}
                >
                  <View style={styles.serviceTop}>
                    <View style={[styles.srvIconBox, { backgroundColor: MED_BG }]}>
                      <Icon name={srv.icon} size={18} color={MED_COLOR} />
                    </View>
                    <View
                      style={[
                        styles.srvBadge,
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
                          styles.srvBadgeTxt,
                          {
                            color: srv.id === 'mental_health' ? '#a855f7' : C.text2,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                      >
                        {srv.badge}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.srvTitle,
                      { color: C.text, fontFamily: FontFamily.jakartaBold },
                    ]}
                  >
                    {srv.title}
                  </Text>
                  <Text
                    style={[
                      styles.srvDesc,
                      { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                    ]}
                  >
                    {srv.desc}
                  </Text>
                </View>
              ))}
            </View>

            {/* Free Dispensary Medicines */}
            <Text
              style={[
                styles.sectionHeader,
                { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginTop: 22 },
              ]}
            >
              {t.medical2.dispensaryTitle}
            </Text>
            <Text
              style={[
                styles.sectionSub,
                { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
              ]}
            >
              {t.medical2.dispensarySub}
            </Text>

            <View style={styles.medsList}>
              {DISPENSARY_MEDICINES.map((med, idx) => (
                <View
                  key={med.id}
                  style={[
                    styles.medRow,
                    { backgroundColor: C.surface, borderColor: C.border },
                  ]}
                >
                  <View style={[styles.medIndexBadge, { backgroundColor: C.surface2 }]}>
                    <Text
                      style={[
                        styles.medIndexTxt,
                        { color: C.text2, fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      {idx + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.medName,
                        { color: C.text, fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      {med.name}
                    </Text>
                    <Text
                      style={[
                        styles.medCategory,
                        { color: MED_COLOR, fontFamily: FontFamily.jakartaMedium },
                      ]}
                    >
                      {med.category}
                    </Text>
                    <Text
                      style={[
                        styles.medUse,
                        { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                      ]}
                    >
                      Indications: {med.useFor}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
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
                  <Icon name="alert-triangle" size={20} color={C.white} />
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

            {/* Immediate Contacts */}
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
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.hotlineTitle,
                        {
                          color: cnt.isNational ? C.danger : C.text,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {cnt.title}
                    </Text>
                    <Text
                      style={[
                        styles.hotlineSub,
                        { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                      ]}
                    >
                      {cnt.sub}
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

            <View style={styles.hospitalList}>
              {NEARBY_HOSPITALS.map((hosp) => (
                <View
                  key={hosp.id}
                  style={[
                    styles.hospCard,
                    { backgroundColor: C.surface, borderColor: C.border },
                  ]}
                >
                  <View style={styles.hospTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.hospName,
                          { color: C.text, fontFamily: FontFamily.jakartaBold },
                        ]}
                      >
                        {hosp.name}
                      </Text>
                      <Text
                        style={[
                          styles.hospType,
                          { color: MED_COLOR, fontFamily: FontFamily.jakartaMedium },
                        ]}
                      >
                        {hosp.type}
                      </Text>
                      <Text
                        style={[
                          styles.hospAddress,
                          { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                        ]}
                      >
                        {hosp.address}
                      </Text>
                    </View>

                    <View style={[styles.distBadge, { backgroundColor: C.surface2 }]}>
                      <Icon name="pin" size={12} color={C.text2} />
                      <Text
                        style={[
                          styles.distBadgeTxt,
                          { color: C.text2, fontFamily: FontFamily.jakartaBold },
                        ]}
                      >
                        {hosp.distance}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.hospDivider, { backgroundColor: C.border }]} />

                  <View style={styles.hospActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.hospActionBtn,
                        { backgroundColor: MED_BG },
                      ]}
                      onPress={() => handleDialPhone(hosp.hotline)}
                      activeOpacity={0.75}
                    >
                      <Icon name="phone" size={14} color={MED_COLOR} />
                      <Text
                        style={[
                          styles.hospActionTxt,
                          { color: MED_COLOR, fontFamily: FontFamily.jakartaBold },
                        ]}
                      >
                        {t.medical2.callHotline} ({hosp.hotline})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.hospMapBtn,
                        { backgroundColor: C.surface2, borderColor: C.border },
                      ]}
                      onPress={() => handleOpenHospitalMap(hosp)}
                      activeOpacity={0.75}
                    >
                      <Icon name="navigation" size={14} color={C.text} />
                      <Text
                        style={[
                          styles.hospMapTxt,
                          { color: C.text, fontFamily: FontFamily.jakartaBold },
                        ]}
                      >
                        {t.medical2.getDirections}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* ADMIN DOCTOR / STAFF MANAGE MODAL */}
      <Modal
        visible={!!editModalDoc}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalDoc(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditModalDoc(null)}
        />
        <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
          <Text
            style={[
              styles.modalTitle,
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

              {/* Leave toggle */}
              <View
                style={[
                  styles.toggleRow,
                  { backgroundColor: C.surface2, borderColor: C.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.toggleLabel,
                      { color: C.text, fontFamily: FontFamily.jakartaBold },
                    ]}
                  >
                    {t.medical2.markOnLeave}
                  </Text>
                  <Text
                    style={[
                      styles.toggleSub,
                      { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                    ]}
                  >
                    Displays an on-leave warning to students
                  </Text>
                </View>
                <Switch
                  value={editIsOnLeave}
                  onValueChange={setEditIsOnLeave}
                  trackColor={{ false: C.border, true: C.danger }}
                />
              </View>

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
                  Room / Location
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

              {/* Save Button */}
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
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 6, paddingBottom: 20 } as ViewStyle,

  // Hero Card
  heroCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
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
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  } as ViewStyle,
  heroHoursCol: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 } as ViewStyle,
  heroHoursTxt: { fontSize: 11.5 } as any,
  heroCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  } as ViewStyle,
  heroCallBtnTxt: { fontSize: 11.5 } as any,

  // Tabs
  tabContainer: { marginBottom: 14 } as ViewStyle,
  tabContent: {} as ViewStyle,

  // Search & Filters
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  searchInput: { flex: 1, fontSize: 13.5 } as any,
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  } as ViewStyle,
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  } as ViewStyle,
  filterChipTxt: { fontSize: 12 } as any,

  // Doctor List
  doctorList: { gap: 10 } as ViewStyle,
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  docThumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  docCardBody: { flex: 1 } as ViewStyle,
  docNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  docName: { fontSize: 14.5 } as any,
  docSpec: { fontSize: 12, marginTop: 2 } as any,
  docRoom: { fontSize: 11.5, marginTop: 2 } as any,
  docDutyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
    flexWrap: 'wrap',
  } as ViewStyle,
  dutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  } as ViewStyle,
  dutyLiveDot: { width: 5.5, height: 5.5, borderRadius: 3 } as ViewStyle,
  dutyBadgeTxt: { fontSize: 11 } as any,
  dutySubTxt: { fontSize: 11 } as any,
  cardRightCol: { alignItems: 'center', gap: 8 } as ViewStyle,
  adminQuickBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // Tab 2: Policy & Services
  policyCard: {
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
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
  serviceGrid: { gap: 10 } as ViewStyle,
  serviceCard: {
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  serviceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  srvIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  srvBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 } as ViewStyle,
  srvBadgeTxt: { fontSize: 10.5 } as any,
  srvTitle: { fontSize: 14 } as any,
  srvDesc: { fontSize: 12, marginTop: 3 } as any,

  // Dispensary Meds
  medsList: { gap: 8 } as ViewStyle,
  medRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  medIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  } as ViewStyle,
  medIndexTxt: { fontSize: 11 } as any,
  medName: { fontSize: 13.5 } as any,
  medCategory: { fontSize: 11.5, marginTop: 2 } as any,
  medUse: { fontSize: 11.5, marginTop: 3 } as any,

  // Tab 3: Emergency
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
  } as ViewStyle,
  emergencyBannerTitle: { fontSize: 14 } as any,
  emergencyBannerSub: { fontSize: 12, marginTop: 3 } as any,
  hotlineList: { gap: 10 } as ViewStyle,
  hotlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  hotlineIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
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

  // Hospitals
  hospitalList: { gap: 11 } as ViewStyle,
  hospCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  hospTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  } as ViewStyle,
  hospName: { fontSize: 14 } as any,
  hospType: { fontSize: 12, marginTop: 2 } as any,
  hospAddress: { fontSize: 11.5, marginTop: 2 } as any,
  distBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
  } as ViewStyle,
  distBadgeTxt: { fontSize: 11 } as any,
  hospDivider: { height: StyleSheet.hairlineWidth, marginVertical: 11 } as ViewStyle,
  hospActionsRow: { flexDirection: 'row', gap: 8 } as ViewStyle,
  hospActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  } as ViewStyle,
  hospActionTxt: { fontSize: 12 } as any,
  hospMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,
  hospMapTxt: { fontSize: 12 } as any,

  // Admin Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  } as ViewStyle,
  modalSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 34,
  } as ViewStyle,
  modalTitle: { fontSize: 17, marginBottom: 12 } as any,
  modalContent: {} as ViewStyle,
  modalDocName: { fontSize: 15 } as any,
  modalDocSpec: { fontSize: 12.5, marginTop: 2, marginBottom: 14 } as any,
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  toggleLabel: { fontSize: 13.5 } as any,
  toggleSub: { fontSize: 11, marginTop: 2 } as any,
  inputLabel: { fontSize: 12, marginBottom: 6 } as any,
  modalInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  } as any,
  modalSaveBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  } as ViewStyle,
  modalSaveTxt: { fontSize: 14 } as any,

  empty: { alignItems: 'center', paddingTop: 40, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 15 } as any,
});
