import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Alert, TextInput, type ViewStyle, type TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { SkeletonList, LoadError } from '../../components/ui/LoadState';
import { FontFamily, Layout, SectorColors, Accent } from '../../theme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { donorEligibility } from '../../utils/blood';
import { scheduleRechargedReminder } from '../../utils/bloodReminder';
import { localToday } from '../../utils/format';
import {
  getBloodFeed, pledgeToRequest, markDonatedToday as markDonated,
  getDonorContact, getRequesterContact, type DonorWithName,
} from '../../services/bloodService';
import { ContactSheet } from '../../components/ui/ContactSheet';
import { AreaPickerModal } from '../../components/blood/AreaPickerModal';
import { QUICK_CAMPUS_AREAS } from '../../constants/dhakaAreas';
import type { BloodRequest, Donor } from '../../types/database';

type Tab = 'requests' | 'donors';

const BLOOD_COLOR = SectorColors.blood;
const BLOOD_BG    = `${SectorColors.blood}1e`;

// Urgency tones from theme tokens (dark-mode aware via C)
function urgencyTone(C: any, urgency: string): { fg: string; bg: string } {
  switch (urgency) {
    case 'Urgent': return { fg: C.danger, bg: C.dangerBg };
    case 'Today':  return { fg: C.warn,   bg: C.warnBg };
    default:       return { fg: C.textMuted, bg: C.surface2 };
  }
}

function GroupBadge({ group, size = 46 }: { group: string; size?: number }) {
  return (
    <View style={[styles.groupBadge, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <Text style={[styles.groupText, { fontSize: size * 0.34, color: BLOOD_COLOR, fontFamily: FontFamily.jakartaExtraBold }]}>
        {group}
      </Text>
    </View>
  );
}

export function BloodScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const [tab, setTab] = useState<Tab>('requests');
  const [groupFilter, setGroupFilter] = useState('All');
  const [areaFilter, setAreaFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donors, setDonors]     = useState<DonorWithName[]>([]);
  const [myDonor, setMyDonor]   = useState<Donor | null>(null);
  const [myDonationCount, setMyDonationCount] = useState(0);
  const [myGender, setMyGender] = useState<'male' | 'female'>('male');
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [contactTarget, setContactTarget] = useState<{ name: string; phone: string; title?: string } | null>(null);

  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (tab === 'requests') {
      requests.forEach(r => {
        if (r.area) counts[r.area] = (counts[r.area] ?? 0) + 1;
        if (r.hospital) counts[r.hospital] = (counts[r.hospital] ?? 0) + 1;
      });
    } else {
      donors.forEach(d => {
        if (d.area) counts[d.area] = (counts[d.area] ?? 0) + 1;
      });
    }
    return counts;
  }, [tab, requests, donors]);

  const load = useCallback(async () => {
    const [res, savedGender] = await Promise.all([
      getBloodFeed(user?.id),
      user?.id ? AsyncStorage.getItem(`@donor_gender_${user.id}`) : Promise.resolve(null),
    ]);
    const gender = (savedGender === 'female' || savedGender === 'male') ? savedGender : 'male';
    if (savedGender === 'female' || savedGender === 'male') {
      setMyGender(savedGender);
    }
    if (!res.ok) { setLoadState('error'); return; }
    setRequests(res.data.requests);
    setDonors(res.data.donors);
    setRespondedIds(res.data.respondedIds);
    setMyDonor(res.data.myDonor ?? null);
    setMyDonationCount(res.data.myDonationCount ?? 0);
    setLoadState('ready');

    if (res.data.myDonor?.last_donated) {
      scheduleRechargedReminder(
        res.data.myDonor.last_donated,
        gender,
        t.blood2.rechargedNotificationTitle,
        t.blood2.rechargedNotificationBody,
      );
    }
  }, [user?.id, t.blood2.rechargedNotificationTitle, t.blood2.rechargedNotificationBody]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function revealContact(donorUserId: string, donorName?: string | null) {
    if (!user || busyId) return;
    setBusyId(donorUserId);
    try {
      const res = await getDonorContact(donorUserId);
      if (!res.ok) {
        toast({ type: 'error', title: t.common.error, message: t.blood2.revealContactError });
        return;
      }
      if (!res.data) {
        toast({ type: 'info', title: t.blood2.notAvailable, message: t.blood2.notShared });
        return;
      }
      setContactTarget({
        name: donorName ?? t.blood2.contact,
        phone: res.data,
        title: t.blood2.donorsTab,
      });
    } finally {
      setBusyId(null);
    }
  }

  // Pledged donors may see the requester's contact (consent-by-posting)
  async function revealRequester(r: BloodRequest) {
    if (!user || busyId) return;
    setBusyId(r.id);
    try {
      const res = await getRequesterContact(r.code);
      if (!res.ok) {
        toast({ type: 'error', title: t.common.error, message: t.blood2.revealContactError });
        return;
      }
      if (!res.data?.whatsapp) {
        toast({ type: 'info', title: t.blood2.notAvailable, message: t.blood2.contactDonorsOnly });
        return;
      }
      setContactTarget({
        name: res.data.name ?? r.patient ?? t.blood2.requester,
        phone: res.data.whatsapp,
        title: `${r.blood_group} - ${r.patient}`,
      });
    } finally {
      setBusyId(null);
    }
  }

  // Donor stamps their own last-donation date; resets the recovery clock.
  function markDonatedToday() {
    Alert.alert(t.blood2.markDonatedTitle, t.blood2.markDonatedBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.blood2.markDonatedConfirm,
        onPress: async () => {
          if (!user) return;
          const res = await markDonated(user.id);
          if (!res.ok) { toast({ type: 'error', title: t.common.error, message: res.error }); return; }
          await scheduleRechargedReminder(
            localToday(),
            myGender,
            t.blood2.rechargedNotificationTitle,
            t.blood2.rechargedNotificationBody,
          );
          toast({ type: 'success', title: t.blood2.markedDonatedTitle, message: t.blood2.markedDonatedBody });
          load();
        },
      },
    ]);
  }

  function handleHelpPress(r: BloodRequest) {
    if (!user) {
      toast({ type: 'info', title: t.blood2.signInRequired, message: t.blood2.signInToRespond });
      return;
    }
    if (respondedIds.has(r.id)) {
      toast({ type: 'info', title: t.blood2.alreadyResponded, message: t.blood2.alreadyOfferedHelp });
      return;
    }
    Alert.alert(
      t.blood2.confirmResponse,
      t.blood2.confirmResponseBody(r.blood_group, r.patient, r.hospital),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.blood2.yesICanHelp,
          onPress: async () => {
            // Optimistically mark as responded so the user cannot double-tap
            setRespondedIds(prev => new Set(prev).add(r.id));
            const res = await pledgeToRequest(r.id, user.id);
            if (!res.ok) {
              setRespondedIds(prev => {
                const next = new Set(prev);
                next.delete(r.id);
                return next;
              });
              toast({ type: 'error', title: t.common.error, message: t.blood2.submitResponseError });
            } else {
              toast({ type: 'success', title: t.blood2.thankYou, message: t.blood2.pledgedToHelp(r.blood_group) });
            }
          },
        },
      ],
    );
  }

  // Filter requests and donors by group, area, and search query
  const filteredRequests = requests.filter(r => {
    const matchesGroup = groupFilter === 'All' || r.blood_group === groupFilter;
    const matchesArea = areaFilter === 'All' ||
      (r.area && r.area.toLowerCase().includes(areaFilter.toLowerCase())) ||
      (r.hospital && r.hospital.toLowerCase().includes(areaFilter.toLowerCase()));
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q ||
      (r.patient && r.patient.toLowerCase().includes(q)) ||
      (r.hospital && r.hospital.toLowerCase().includes(q)) ||
      (r.area && r.area.toLowerCase().includes(q)) ||
      r.blood_group.toLowerCase().includes(q);
    return matchesGroup && matchesArea && matchesQuery;
  });

  const filteredDonors = donors.filter(d => {
    const matchesGroup = groupFilter === 'All' || d.blood_group === groupFilter;
    const matchesArea = areaFilter === 'All' ||
      (d.area && d.area.toLowerCase().includes(areaFilter.toLowerCase()));
    const q = searchQuery.trim().toLowerCase();
    const name = (d as any).profiles?.full_name?.toLowerCase() || '';
    const matchesQuery = !q ||
      name.includes(q) ||
      (d.area && d.area.toLowerCase().includes(q)) ||
      d.blood_group.toLowerCase().includes(q);
    return matchesGroup && matchesArea && matchesQuery;
  });

  // Group donors by blood type
  const donorGroups: Record<string, number> = {};
  donors.forEach(d => { donorGroups[d.blood_group] = (donorGroups[d.blood_group] ?? 0) + 1; });
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  function renderAreaChips(contentContainerStyle?: any) {
    const isCustomActive = areaFilter !== 'All' && !QUICK_CAMPUS_AREAS.includes(areaFilter);
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={contentContainerStyle}
      >
        {isCustomActive && (
          <TouchableOpacity
            style={[styles.areaChip, { backgroundColor: SectorColors.blood, borderColor: SectorColors.blood }]}
            onPress={() => setAreaFilter('All')}
            activeOpacity={0.75}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="pin" size={12} color="#fff" />
              <Text style={[styles.areaChipTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                {areaFilter}
              </Text>
              <Feather name="x" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {QUICK_CAMPUS_AREAS.map(a => {
          const on = areaFilter === a;
          const label = a === 'All' ? t.blood2.filterLocationAll : a;
          return (
            <TouchableOpacity
              key={a}
              style={[styles.areaChip, on
                ? { backgroundColor: C.brand, borderColor: C.brand }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setAreaFilter(a)}
              activeOpacity={0.75}
            >
              <Text style={[styles.areaChipTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.allAreasTrigger, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => setAreaModalVisible(true)}
          activeOpacity={0.75}
        >
          <Icon name="pin" size={12} color={SectorColors.blood} />
          <Text style={[styles.allAreasTriggerTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {t.blood2.allAreasBtn}
          </Text>
          <Feather name="chevron-down" size={13} color={C.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.blood2.bloodDonation} onBack={() => navigation.goBack()} />

      {/* Action buttons */}
      <View style={[styles.actRow, { paddingHorizontal: Layout.screenPadding }]}>
        <TouchableOpacity
          style={[styles.actBtn, { backgroundColor: SectorColors.blood }]}
          onPress={() => navigation.navigate('BloodRequest')}
          activeOpacity={0.85}
        >
          <Icon name="blood" size={15} color="#fff" />
          <Text style={[styles.actBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
            {t.blood2.requestBloodBtn}
          </Text>
        </TouchableOpacity>
        {!myDonor && (
          <TouchableOpacity
            style={[styles.actBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}
            onPress={() => navigation.navigate('DonorRegister')}
            activeOpacity={0.85}
          >
            <Icon name="plus" size={15} color={C.text} />
            <Text style={[styles.actBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.blood2.registerAsDonorBtn}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* If registered, show your donor status banner right below action button */}
      {myDonor && (
        <View style={[styles.myStatusCard, { backgroundColor: C.surface, borderColor: C.border, marginHorizontal: Layout.screenPadding }]}>
          <View style={styles.myStatusLeft}>
            <GroupBadge group={myDonor.blood_group} size={38} />
            <View style={{ flex: 1 }}>
              <View style={styles.myStatusHeader}>
                <Text style={[styles.myStatusTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.blood2.myDonorStatusTitle}
                </Text>
                {(() => {
                  const { eligible, daysLeft } = donorEligibility(myDonor.last_donated, myGender);
                  return (
                    <View style={[styles.eligPill, { backgroundColor: eligible ? C.successBg : C.warnBg }]}>
                      <Text style={[styles.eligTxt, { color: eligible ? C.success : C.warn, fontFamily: FontFamily.jakartaBold }]}>
                        {eligible ? t.blood2.eligible : t.blood2.eligibleInDays(daysLeft)}
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <Text style={[styles.myStatusMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                {t.blood2.donorMeta(myDonor.area, myDonor.last_donated ?? t.blood2.never)}
              </Text>
              {myDonationCount > 0 && (
                <View style={[styles.impactPill, { backgroundColor: BLOOD_BG }]}>
                  <Text style={[styles.impactTxt, { color: BLOOD_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                    🏅 {t.blood2.donationsCount(myDonationCount)} · {t.blood2.livesSavedImpact(myDonationCount)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <TouchableOpacity
              style={[styles.myStatusEditBtn, { backgroundColor: C.surface2 }]}
              onPress={() => navigation.navigate('DonorRegister')}
              activeOpacity={0.75}
            >
              <Icon name="pin" size={12} color={C.text2} />
              <Text style={[styles.myStatusEditTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {t.blood2.updateLocationPhone}
              </Text>
            </TouchableOpacity>
            {(() => {
              const { eligible } = donorEligibility(myDonor.last_donated, myGender);
              if (!eligible || myDonor.last_donated === localToday()) return null;
              return (
                <TouchableOpacity
                  style={[styles.statusDonatedBtn, { backgroundColor: C.successBg }]}
                  onPress={markDonatedToday}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.statusDonatedTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                    {t.blood2.iDonated}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>
      )}

      {/* Segmented Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: C.surface2 }]}>
        {(['requests', 'donors'] as Tab[]).map(tb => {
          const active = tab === tb;
          return (
            <TouchableOpacity
              key={tb}
              style={[
                styles.tabBtn,
                active && { backgroundColor: C.surface, elevation: 1 },
              ]}
              onPress={() => setTab(tb)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnTxt, { color: active ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {tb === 'requests' ? t.blood2.requestsTab : t.blood2.donorsTab}
              </Text>
              <View style={[styles.tabBadge, { backgroundColor: active ? `${SectorColors.blood}20` : C.border }]}>
                <Text style={[styles.tabBadgeTxt, { color: active ? SectorColors.blood : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {tb === 'requests' ? requests.length : donors.length}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Universal In-Screen Search Bar */}
      <View style={{ paddingHorizontal: Layout.screenPadding, marginBottom: 8 }}>
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Feather name="search" size={15} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            placeholder={t.blood2.searchAreaPlaceholder}
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={14} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Bars - on requests tab only */}
      {tab === 'requests' && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={[styles.groupChips, { paddingHorizontal: Layout.screenPadding }]}
          >
            {['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => {
              const on = groupFilter === g;
              return (
                <TouchableOpacity
                  key={g}
                  style={[styles.groupChip, on
                    ? { backgroundColor: SectorColors.blood, borderColor: SectorColors.blood }
                    : { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => setGroupFilter(g)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.groupChipTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {renderAreaChips([styles.areaChips, { paddingHorizontal: Layout.screenPadding }])}
        </>
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {loadState === 'loading' && requests.length === 0 && donors.length === 0 ? (
          <SkeletonList />
        ) : loadState === 'error' && requests.length === 0 && donors.length === 0 ? (
          <LoadError onRetry={load} />
        ) : tab === 'requests' ? (
          <View style={styles.list}>
            {filteredRequests.length === 0 ? (
              <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Icon name="blood" size={30} color={C.textMuted} />
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.common.noResults}
                </Text>
              </View>
            ) : (
              filteredRequests.map(r => {
                const { fg, bg } = urgencyTone(C, r.urgency);
                const isPlatelet = r.patient?.includes('[Platelets]') || r.hospital?.toLowerCase().includes('platelet');
                const displayPatient = r.patient?.replace(/\[Platelets\]/g, '').trim() || r.patient;
                return (
                  <View key={r.id} style={[styles.reqCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <View style={styles.reqTop}>
                      <GroupBadge group={r.blood_group} />
                      <View style={styles.reqBody}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.reqTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                            {displayPatient}
                          </Text>
                          {isPlatelet && (
                            <View style={[styles.plateletPill, { backgroundColor: C.warnBg }]}>
                              <Text style={[styles.plateletTxt, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>
                                ⚡ {t.blood2.denguePlateletUrgent}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.reqLoc}>
                          <Icon name="pin" size={13} color={C.textMuted} />
                          <Text style={[styles.reqLocTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                            {r.hospital}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.urgencyPill, { backgroundColor: bg }]}>
                        <View style={[styles.urgencyDot, { backgroundColor: fg }]} />
                        <Text style={[styles.urgencyTxt, { color: fg, fontFamily: FontFamily.jakartaBold }]}>{r.urgency}</Text>
                      </View>
                    </View>
                    <View style={styles.reqMeta}>
                      <Text style={[styles.reqMetaTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        {t.blood2.unitsNeeded(r.area, r.units)}
                      </Text>
                    </View>
                    {r.requester_id === user?.id ? (
                      <TouchableOpacity
                        style={[styles.pledgeBtn, { backgroundColor: C.surface2 }]}
                        onPress={() => navigation.navigate('BloodRequestDetail', { requestId: r.id })}
                        activeOpacity={0.75}
                      >
                        <Icon name="directory" size={15} color={C.text2} />
                        <Text style={[styles.pledgeTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                          {t.blood2.manageResponses}
                        </Text>
                      </TouchableOpacity>
                    ) : respondedIds.has(r.id) ? (
                      <TouchableOpacity
                        style={[styles.pledgeBtn, { backgroundColor: C.successBg }]}
                        onPress={() => revealRequester(r)}
                        activeOpacity={0.75}
                        disabled={busyId === r.id}
                      >
                        <Icon name="phone" size={15} color={C.success} />
                        <Text style={[styles.pledgeTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                          {busyId === r.id ? '…' : t.blood2.viewRequesterContact}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.pledgeBtn, { backgroundColor: BLOOD_BG }]}
                        onPress={() => handleHelpPress(r)}
                        activeOpacity={0.75}
                      >
                        <Icon name="blood" size={16} color={BLOOD_COLOR} />
                        <Text style={[styles.pledgeTxt, { color: BLOOD_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                          {t.blood2.iCanHelp}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View>
            {/* Blood type summary & interactive filter */}
            <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={[styles.summaryTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginBottom: 0 }]}>
                  {t.blood2.availableDonors}
                </Text>
                {groupFilter !== 'All' && (
                  <TouchableOpacity
                    onPress={() => setGroupFilter('All')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Text style={{ fontSize: 11.5, color: SectorColors.blood, fontFamily: FontFamily.jakartaBold }}>
                      {t.blood2.showingGroupFilter(groupFilter)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.summaryGrid}>
                {bloodTypes.map(g => {
                  const on = groupFilter === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.summaryCell,
                        { backgroundColor: on ? `${SectorColors.blood}20` : C.surface2 },
                        on && { borderColor: SectorColors.blood, borderWidth: 1.5 },
                      ]}
                      onPress={() => setGroupFilter(on ? 'All' : g)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.summaryCellGroup, { color: SectorColors.blood }]}>{g}</Text>
                      <Text style={[styles.summaryCellNum, { color: on ? SectorColors.blood : C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                        {donorGroups[g] ?? 0}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Area proximity filter for donors */}
            <View style={{ marginBottom: 12 }}>
              {renderAreaChips({ gap: 6, paddingVertical: 2 })}
            </View>

            {/* Donor list */}
            {filteredDonors.length === 0 ? (
              <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Icon name="blood" size={30} color={C.textMuted} />
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.common.noResults}
                </Text>
              </View>
            ) : (
              <View style={[styles.donorList, { backgroundColor: C.surface, borderColor: C.border }]}>
                {filteredDonors.map((d, i) => {
                  const isMe = d.user_id === user?.id;
                  const { eligible, daysLeft } = isMe ? donorEligibility(d.last_donated, myGender) : donorEligibility(d.last_donated);
                  return (
                    <View key={d.user_id}>
                      {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                      <View style={[styles.donorRow, !eligible && { opacity: 0.6 }]}>
                        <Avatar name={(d as any).profiles?.full_name} size="sm" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.donorName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                            {(d as any).profiles?.full_name ?? t.blood2.anonymous}{isMe ? ` ${t.blood2.youTag}` : ''}
                          </Text>
                          <Text style={[styles.donorMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                            {t.blood2.donorMeta(d.area, d.last_donated ?? t.blood2.never)}
                          </Text>
                          <View style={[styles.eligPill, { backgroundColor: eligible ? C.successBg : C.warnBg }]}>
                            <Text style={[styles.eligTxt, { color: eligible ? C.success : C.warn, fontFamily: FontFamily.jakartaBold }]}>
                              {eligible ? t.blood2.eligible : t.blood2.eligibleInDays(daysLeft)}
                            </Text>
                          </View>
                        </View>
                        <GroupBadge group={d.blood_group} size={34} />
                        {isMe ? (
                          <TouchableOpacity
                            style={[styles.contactBtn, { backgroundColor: C.successBg }]}
                            onPress={markDonatedToday}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.contactTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                              {t.blood2.iDonated}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.contactBtn, {
                              backgroundColor: eligible ? BLOOD_BG : C.surface2,
                              opacity: busyId === d.user_id ? 0.5 : 1,
                            }]}
                            onPress={() => revealContact(d.user_id, (d as any).profiles?.full_name)}
                            activeOpacity={0.75}
                            disabled={busyId === d.user_id || !eligible}
                          >
                            <Text style={[styles.contactTxt, { color: eligible ? BLOOD_COLOR : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                              {busyId === d.user_id ? '…' : t.blood2.contact}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
        <View style={{ height: 12 }} />
      </ScrollView>
      <ContactSheet
        visible={!!contactTarget}
        onClose={() => setContactTarget(null)}
        title={contactTarget?.title ?? t.blood2.contact}
        name={contactTarget?.name ?? ''}
        phone={contactTarget?.phone}
      />
      <AreaPickerModal
        visible={areaModalVisible}
        onClose={() => setAreaModalVisible(false)}
        selectedArea={areaFilter}
        onSelectArea={setAreaFilter}
        areaCounts={areaCounts}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  } as TextStyle,
  allAreasTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  } as ViewStyle,
  allAreasTriggerTxt: {
    fontSize: 12,
  } as TextStyle,
  actRow: { flexDirection: 'row', gap: 8, paddingTop: 8, paddingBottom: 4 } as ViewStyle,
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 12 } as ViewStyle,
  actBtnTxt: { fontSize: 13 } as any,
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginHorizontal: Layout.screenPadding,
    marginTop: 6,
    marginBottom: 8,
  } as ViewStyle,
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  } as ViewStyle,
  tabBtnTxt: { fontSize: 13 } as any,
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
  } as ViewStyle,
  tabBadgeTxt: { fontSize: 11 } as any,
  groupChips: { flexDirection: 'row', gap: 6, paddingBottom: 6 } as ViewStyle,
  groupChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  groupChipTxt: { fontSize: 12 } as any,
  eligPill: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999, marginTop: 4 } as ViewStyle,
  eligTxt: { fontSize: 10 } as any,
  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,
  list: { gap: 11 } as ViewStyle,
  groupBadge: { backgroundColor: BLOOD_BG, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  groupText: {} as any,
  reqCard: { padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  reqTop: { flexDirection: 'row', alignItems: 'center', gap: 12 } as ViewStyle,
  reqBody: { flex: 1 } as ViewStyle,
  reqTitle: { fontSize: 14 } as any,
  reqLoc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 } as ViewStyle,
  reqLocTxt: { fontSize: 12 } as any,
  urgencyPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 } as ViewStyle,
  urgencyDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  urgencyTxt: { fontSize: 11 } as any,
  reqMeta: { marginTop: 8 } as ViewStyle,
  reqMetaTxt: { fontSize: 12 } as any,
  pledgeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, borderRadius: 12, marginTop: 12 } as ViewStyle,
  pledgeTxt: { fontSize: 13 } as any,
  summaryCard: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 } as ViewStyle,
  summaryTitle: { fontSize: 11, letterSpacing: 0.5, marginBottom: 10 } as any,
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as ViewStyle,
  summaryCell: { width: '22%', alignItems: 'center', paddingVertical: 8, borderRadius: 10 } as ViewStyle,
  summaryCellGroup: { fontSize: 13, fontFamily: FontFamily.jakartaExtraBold } as any,
  summaryCellNum: { fontSize: 15, marginTop: 2 } as any,
  donorList: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  donorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 } as ViewStyle,
  donorName: { fontSize: 14 } as any,
  donorMeta: { fontSize: 12, marginTop: 2 } as any,
  contactBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 } as ViewStyle,
  contactTxt: { fontSize: 11 } as any,
  myStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 4,
    gap: 10,
  } as ViewStyle,
  myStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 } as ViewStyle,
  myStatusHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' } as ViewStyle,
  myStatusTitle: { fontSize: 13 } as any,
  myStatusMeta: { fontSize: 11.5, marginTop: 2 } as any,
  myStatusEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  } as ViewStyle,
  myStatusEditTxt: { fontSize: 11.5 } as any,
  statusDonatedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  } as ViewStyle,
  statusDonatedTxt: { fontSize: 11 } as any,
  areaChips: { flexDirection: 'row', gap: 6, paddingBottom: 8 } as ViewStyle,
  areaChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  areaChipTxt: { fontSize: 12 } as any,
  plateletPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 } as ViewStyle,
  plateletTxt: { fontSize: 10 } as any,
  impactPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 } as ViewStyle,
  impactTxt: { fontSize: 11 } as any,
  emptyWrap: { padding: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 } as ViewStyle,
  emptyTxt: { fontSize: 13 } as any,
});
