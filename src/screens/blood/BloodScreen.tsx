import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Alert, TextInput, Keyboard, Animated, type ViewStyle, type TextStyle,
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
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { FontFamily, Layout, SectorColors, Accent } from '../../theme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import {
  donorEligibility,
  isBloodCompatible,
  parseBloodRequestMeta,
  getMedicalReasonIcon,
  getAffiliationIcon,
} from '../../utils/blood';
import { scheduleRechargedReminder } from '../../utils/bloodReminder';
import { localToday, formatRelativeTime } from '../../utils/format';
import {
  getBloodFeed, pledgeToRequest, markDonatedToday as markDonated,
  getDonorContact, getRequesterContact, type DonorWithName,
} from '../../services/bloodService';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { ContactSheet } from '../../components/ui/ContactSheet';
import { AreaPickerModal } from '../../components/blood/AreaPickerModal';
import { DHAKA_AREAS } from '../../constants/dhakaAreas';
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

function RequestBloodBadge({ group, isPlatelet }: { group: string; isPlatelet?: boolean }) {
  return (
    <View
      style={[
        styles.reqBloodBadge,
        {
          backgroundColor: isPlatelet
            ? 'rgba(234, 179, 8, 0.12)'
            : 'rgba(214, 61, 53, 0.12)',
          borderColor: isPlatelet
            ? 'rgba(234, 179, 8, 0.35)'
            : 'rgba(214, 61, 53, 0.28)',
        },
      ]}
    >
      <Text
        style={[
          styles.reqBloodGroupTxt,
          {
            color: isPlatelet ? '#eab308' : SectorColors.blood,
            fontFamily: FontFamily.jakartaExtraBold,
          },
        ]}
      >
        {group}
      </Text>
      <Text
        style={[
          styles.reqBloodTypeLabel,
          {
            color: isPlatelet ? '#ca8a04' : SectorColors.blood,
            fontFamily: FontFamily.jakartaBold,
          },
        ]}
      >
        {isPlatelet ? 'PLATELETS' : 'BLOOD'}
      </Text>
    </View>
  );
}

export function BloodScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const [tab, setTab] = useState<Tab>('requests');
  const [highlightCode, setHighlightCode] = useState<string | null>(route?.params?.requestCode ?? null);

  useEffect(() => {
    if (route?.params?.requestCode) {
      setTab('requests');
      setHighlightCode(route.params.requestCode);
    }
  }, [route?.params?.requestCode]);

  // Segmented track animated indicator & theme colors
  const animIndex = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  const tabIndexMap: Record<Tab, number> = useMemo(
    () => ({ requests: 0, donors: 1 }),
    []
  );

  useEffect(() => {
    const idx = tabIndexMap[tab] ?? 0;
    Animated.spring(animIndex, {
      toValue: idx,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [tab, animIndex, tabIndexMap]);

  const bloodTypes = useMemo(() => ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], []);

  function handleRequestGroupPress(g: string) {
    setGroupFilter(prev => (prev === g ? 'All' : g));
  }

  function handleDonorGroupPress(g: string) {
    setGroupFilter(prev => (prev === g ? 'All' : g));
  }

  const TAB_COLORS: Record<Tab, { fg: string; bg: string }> = useMemo(
    () => ({
      requests: {
        fg: C.danger,
        bg: C.dangerBg,
      },
      donors: {
        fg: C.success,
        bg: C.successBg,
      },
    }),
    [C.danger, C.dangerBg, C.success, C.successBg]
  );

  const [groupFilter, setGroupFilter] = useState('All');
  const [areaFilter, setAreaFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donors, setDonors]     = useState<DonorWithName[]>([]);
  const [myDonor, setMyDonor]   = useState<Donor | null>(null);
  const [myDonationCount, setMyDonationCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [contactTarget, setContactTarget] = useState<{ name: string; phone: string; title?: string; message?: string } | null>(null);
  const [isOffline, setIsOffline] = useState(false);

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
    // 1. Optimistic cache load
    const cacheKey = CacheKeys.BLOOD_FEED(user?.id ?? 'anon');
    const cached = await getCache<{
      requests: BloodRequest[];
      donors: DonorWithName[];
      respondedIds: string[];
      myDonor: Donor | null;
      myDonationCount: number;
    }>(cacheKey);
    if (cached) {
      setRequests(cached.requests);
      setDonors(cached.donors);
      setRespondedIds(new Set(cached.respondedIds));
      setMyDonor(cached.myDonor);
      setMyDonationCount(cached.myDonationCount);
      setLoadState('ready');
    }

    // 2. Network sync
    try {
      const res = await getBloodFeed(user?.id);
      if (!res.ok) {
        if (!cached) setLoadState('error');
        setIsOffline(true);
        return;
      }
      setIsOffline(false);
      setRequests(res.data.requests);
      setDonors(res.data.donors);
      setRespondedIds(res.data.respondedIds);
      setMyDonor(res.data.myDonor ?? null);
      setMyDonationCount(res.data.myDonationCount ?? 0);
      setLoadState('ready');

      setCache(cacheKey, {
        requests: res.data.requests,
        donors: res.data.donors,
        respondedIds: Array.from(res.data.respondedIds),
        myDonor: res.data.myDonor ?? null,
        myDonationCount: res.data.myDonationCount ?? 0,
      });

      if (res.data.myDonor?.last_donated) {
        scheduleRechargedReminder(
          res.data.myDonor.last_donated,
          (profile as any)?.gender ?? 'male',
          t.blood2.rechargedNotificationTitle,
          t.blood2.rechargedNotificationBody,
        );
      }
    } catch {
      if (!cached) setLoadState('error');
      setIsOffline(true);
    }
  }, [user?.id, t.blood2.rechargedNotificationTitle, t.blood2.rechargedNotificationBody]);

  useFocusEffect(useCallback(() => { load(); }, [load]));


  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function revealContact(donorUserId: string, donorName?: string | null) {
    if (!user) {
      toast({ type: 'info', title: t.blood2.signInRequired, message: t.blood2.signInToRespond });
      return;
    }
    if (busyId) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to view donor contacts.' });
      return;
    }
    setBusyId(donorUserId);
    try {
      const res = await getDonorContact(donorUserId);
      if (!res.ok) {
        toast({ type: 'error', title: t.common.error, message: t.blood2.revealContactError });
        return;
      }
      if (!res.data?.whatsapp) {
        toast({ type: 'info', title: t.blood2.notAvailable, message: t.blood2.notShared });
        return;
      }
      const prefill = `Salam, I found your profile on the CampusOne Blood Registry (${donorName || 'Donor'}). Are you currently available to donate?`;
      setContactTarget({
        name: res.data.name ?? donorName ?? t.blood2.contact,
        phone: res.data.whatsapp,
        title: t.blood2.donorsTab,
        message: prefill,
      });
    } finally {
      setBusyId(null);
    }
  }

  // Pledged donors may see the requester's contact (consent-by-posting)
  async function revealRequester(r: BloodRequest) {
    if (!user) {
      toast({ type: 'info', title: t.blood2.signInRequired, message: t.blood2.signInToRespond });
      return;
    }
    if (busyId) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to view requester contacts.' });
      return;
    }
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
      const cleanPatient = (r.patient ?? 'patient').replace(/\[Platelets\]/g, '').trim();
      const prefill = `Salam, I saw your CampusOne blood request for ${cleanPatient} at ${r.hospital || 'the hospital'}. I am an ${r.blood_group} donor and ready to help. Where can I meet you?`;
      setContactTarget({
        name: res.data.name ?? r.patient ?? t.blood2.requester,
        phone: res.data.whatsapp,
        title: `${r.blood_group} · ${r.patient}`,
        message: prefill,
      });
    } finally {
      setBusyId(null);
    }
  }

  // Donor stamps their own last-donation date; resets the recovery clock.
  function markDonatedToday() {
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to update donation date.' });
      return;
    }
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
            (profile as any)?.gender ?? 'male',
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
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to pledge blood donation.' });
      return;
    }
    if (!myDonor) {
      Alert.alert(
        t.blood2.registerAsDonorTitle,
        'Please register as a campus blood donor first before offering help.',
        [
          { text: t.common.cancel, style: 'cancel' },
          { text: t.blood2.registerAsDonorBtn, onPress: () => navigation.navigate('DonorRegister') },
        ]
      );
      return;
    }
    if (!isBloodCompatible(myDonor.blood_group, r.blood_group)) {
      toast({
        type: 'info',
        title: 'Group Incompatible',
        message: `Your registered group (${myDonor.blood_group}) cannot donate to ${r.blood_group}.`,
      });
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
              const cacheKey = CacheKeys.BLOOD_FEED(user.id);
              const cached = await getCache<any>(cacheKey);
              if (cached) {
                const setIds = new Set(cached.respondedIds ?? []);
                setIds.add(r.id);
                setCache(cacheKey, { ...cached, respondedIds: Array.from(setIds) });
              }
              toast({ type: 'success', title: t.blood2.thankYou, message: t.blood2.pledgedToHelp(r.blood_group) });
            }
          },
        },
      ],
    );
  }

  // Check if active filter is a hospital
  const isHospitalFilter = useMemo(() => {
    return DHAKA_AREAS.some(a => a.type === 'hospital' && a.name.toLowerCase() === areaFilter.toLowerCase());
  }, [areaFilter]);

  const displayAreaText = useMemo(() => {
    if (areaFilter === 'All') return t.blood2.filterLocationAll;
    const short = areaFilter.split('(')[0].trim();
    return short || areaFilter;
  }, [areaFilter, t.blood2.filterLocationAll]);

  // Memoize filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesGroup = groupFilter === 'All' || r.blood_group === groupFilter;
      const baseFilter = areaFilter === 'All' ? '' : areaFilter.split('(')[0].trim().toLowerCase();
      const matchesArea = areaFilter === 'All' ||
        (r.area && (
          r.area.toLowerCase().includes(areaFilter.toLowerCase()) ||
          areaFilter.toLowerCase().includes(r.area.toLowerCase()) ||
          (baseFilter.length > 2 && r.area.toLowerCase().includes(baseFilter))
        )) ||
        (r.hospital && (
          r.hospital.toLowerCase().includes(areaFilter.toLowerCase()) ||
          areaFilter.toLowerCase().includes(r.hospital.toLowerCase()) ||
          (baseFilter.length > 2 && r.hospital.toLowerCase().includes(baseFilter))
        ));
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery = !q ||
        (r.patient && r.patient.toLowerCase().includes(q)) ||
        (r.hospital && r.hospital.toLowerCase().includes(q)) ||
        (r.area && r.area.toLowerCase().includes(q)) ||
        r.blood_group.toLowerCase().includes(q);
      return matchesGroup && matchesArea && matchesQuery;
    });
  }, [requests, groupFilter, areaFilter, searchQuery]);

  // Memoize filtered donors
  const filteredDonors = useMemo(() => {
    return donors.filter(d => {
      const matchesGroup = groupFilter === 'All' || d.blood_group === groupFilter;
      const baseFilter = areaFilter === 'All' ? '' : areaFilter.split('(')[0].trim().toLowerCase();
      const matchesArea = areaFilter === 'All' ||
        (d.area && (
          d.area.toLowerCase().includes(areaFilter.toLowerCase()) ||
          areaFilter.toLowerCase().includes(d.area.toLowerCase()) ||
          (baseFilter.length > 2 && d.area.toLowerCase().includes(baseFilter))
        ));
      const q = searchQuery.trim().toLowerCase();
      const name = (d as any).profiles?.full_name?.toLowerCase() || '';
      const matchesQuery = !q ||
        name.includes(q) ||
        (d.area && d.area.toLowerCase().includes(q)) ||
        d.blood_group.toLowerCase().includes(q);
      return matchesGroup && matchesArea && matchesQuery;
    });
  }, [donors, groupFilter, areaFilter, searchQuery]);

  // Memoize request groups
  const requestGroups = useMemo(() => {
    const map: Record<string, number> = {};
    requests.forEach(r => { map[r.blood_group] = (map[r.blood_group] ?? 0) + 1; });
    return map;
  }, [requests]);

  // Memoize donor groups
  const donorGroups = useMemo(() => {
    const map: Record<string, number> = {};
    donors.forEach(d => { map[d.blood_group] = (map[d.blood_group] ?? 0) + 1; });
    return map;
  }, [donors]);

  const TRACK_PADDING = 3;
  const innerTrackWidth = Math.max(0, trackWidth - TRACK_PADDING * 2);
  const tabWidth = innerTrackWidth > 0 ? innerTrackWidth / 2 : 0;
  const translateX = animIndex.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.blood2.bloodDonation} onBack={() => navigation.goBack()} />
      <OfflineBanner
        visible={isOffline}
        message="Showing cached blood requests and donor directory. Connect to internet to respond or reveal contacts."
      />

      {/* Prominent Emergency Request Blood Bar */}
      <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 6, paddingBottom: 2 }}>
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
      </View>

      {/* Donor Status / Registration Banner */}
      {myDonor ? (
        <View style={[styles.myStatusCard, { backgroundColor: C.surface, borderColor: C.border, marginHorizontal: Layout.screenPadding }]}>
          <View style={styles.myStatusLeft}>
            <View style={[styles.miniBloodBadge, { backgroundColor: BLOOD_BG }]}>
              <Text style={[styles.miniBloodTxt, { color: BLOOD_COLOR, fontFamily: FontFamily.jakartaExtraBold }]}>
                {myDonor.blood_group}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.myStatusTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {myDonor.area ? myDonor.area : t.blood2.myDonorStatusTitle}
                </Text>
                {(() => {
                  const { eligible, daysLeft } = donorEligibility(myDonor.last_donated);
                  return (
                    <View style={[styles.eligPill, { backgroundColor: eligible ? C.successBg : C.warnBg, marginTop: 0 }]}>
                      <Text style={[styles.eligTxt, { color: eligible ? C.success : C.warn, fontFamily: FontFamily.jakartaBold }]}>
                        {eligible ? t.blood2.eligible : t.blood2.eligibleInDays(daysLeft)}
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <Text style={[styles.myStatusMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                {myDonor.last_donated ? `Last: ${myDonor.last_donated}` : t.blood2.never}
                {myDonationCount > 0 ? ` · ${t.blood2.donationsCount(myDonationCount)}` : ''}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {(() => {
              const { eligible } = donorEligibility(myDonor.last_donated);
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
            <TouchableOpacity
              style={[styles.myStatusEditBtn, { backgroundColor: C.surface2 }]}
              onPress={() => navigation.navigate('DonorRegister')}
              activeOpacity={0.75}
              accessibilityLabel={t.blood2.updateLocationPhone}
            >
              <Feather name="settings" size={13} color={C.text2} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.registerPromptCard,
            { backgroundColor: C.surface, borderColor: C.border, marginHorizontal: Layout.screenPadding },
          ]}
          onPress={() => navigation.navigate('DonorRegister')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={[styles.miniBloodBadge, { backgroundColor: BLOOD_BG }]}>
              <Icon name="blood" size={14} color={BLOOD_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.registerPromptTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.blood2.registerAsDonorBtn}
              </Text>
              <Text style={[styles.registerPromptSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                Join the BUBT campus blood donor network
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={C.textMuted} />
        </TouchableOpacity>
      )}

      {/* Unified Segmented Tab Switcher with Native Spring Animation & Colors */}
      <View
        style={[styles.tabContainer, { backgroundColor: C.surface2 }]}
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
      >
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.activeIndicator,
              {
                width: tabWidth,
                transform: [{ translateX }],
                backgroundColor: C.surface,
                borderColor: isDark ? `${TAB_COLORS[tab].fg}55` : `${TAB_COLORS[tab].fg}35`,
              },
            ]}
          />
        )}
        {(['requests', 'donors'] as Tab[]).map(tb => {
          const active = tab === tb;
          const cfg = TAB_COLORS[tb];
          const count = tb === 'requests' ? requests.length : donors.length;
          return (
            <TouchableOpacity
              key={tb}
              style={styles.tabBtn}
              onPress={() => setTab(tb)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.tabBtnTxt,
                  {
                    color: active ? cfg.fg : C.textMuted,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
                numberOfLines={1}
              >
                {tb === 'requests' ? t.blood2.requestsTab : t.blood2.donorsTab}
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor: active
                      ? cfg.bg
                      : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.border),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeTxt,
                    {
                      color: active ? cfg.fg : C.textMuted,
                      fontFamily: FontFamily.jakartaBold,
                    },
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Unified Search & Dhaka Location Trigger Row (Option 2: Micro-Label Stacked) */}
      <View style={[styles.searchAreaRow, { paddingHorizontal: Layout.screenPadding }]}>
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <TouchableOpacity
            onPress={() => searchInputRef.current?.focus()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 8 }}
          >
            <Feather name="search" size={16} color={C.textMuted} />
          </TouchableOpacity>
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            placeholder={
              tab === 'requests'
                ? 'Search hospital, patient, or area...'
                : 'Search donor name or living area...'
            }
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 10 }}
            >
              <Feather name="x" size={15} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View
          style={[
            styles.areaPickerTrigger,
            areaFilter !== 'All'
              ? {
                  backgroundColor: isDark ? 'rgba(199, 52, 74, 0.22)' : 'rgba(199, 52, 74, 0.12)',
                  borderColor: SectorColors.blood,
                  borderWidth: 1.5,
                }
              : { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <TouchableOpacity
            style={styles.areaPickerBtn}
            onPress={() => setAreaModalVisible(true)}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.areaIconBox,
                {
                  backgroundColor: areaFilter !== 'All'
                    ? (isDark ? 'rgba(255, 255, 255, 0.12)' : `${SectorColors.blood}18`)
                    : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2),
                },
              ]}
            >
              {isHospitalFilter ? (
                <Feather name="activity" size={13} color={areaFilter !== 'All' ? SectorColors.blood : C.text2} />
              ) : (
                <Icon name="pin" size={13} color={areaFilter !== 'All' ? SectorColors.blood : C.text2} />
              )}
            </View>

            <View style={styles.areaTextStack}>
              <Text
                style={[
                  styles.areaMicroLabel,
                  {
                    color: areaFilter !== 'All' ? SectorColors.blood : C.textMuted,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
              >
                {isHospitalFilter ? 'HOSPITAL' : 'LOCATION'}
              </Text>
              <Text
                style={[
                  styles.areaPickerTriggerTxt,
                  {
                    color: areaFilter !== 'All' ? (isDark ? '#fff' : SectorColors.blood) : C.text,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
                numberOfLines={1}
              >
                {displayAreaText}
              </Text>
            </View>
          </TouchableOpacity>

          {areaFilter !== 'All' ? (
            <TouchableOpacity
              onPress={() => setAreaFilter('All')}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
              style={styles.areaClearBtn}
            >
              <View style={[styles.clearPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : `${SectorColors.blood}20` }]}>
                <Feather name="x" size={11} color={isDark ? '#fff' : SectorColors.blood} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setAreaModalVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
              style={styles.areaClearBtn}
            >
              <Feather name="chevron-down" size={13} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {loadState === 'loading' && requests.length === 0 && donors.length === 0 ? (
          <SkeletonList />
        ) : loadState === 'error' && requests.length === 0 && donors.length === 0 ? (
          <LoadError onRetry={load} />
        ) : tab === 'requests' ? (
          <View style={styles.list}>
            {/* Blood type requests summary & interactive filter */}
            <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={[styles.summaryTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginBottom: 0 }]}>
                  {t.blood2.requestsByGroup}
                </Text>
                {groupFilter !== 'All' && (
                  <TouchableOpacity
                    onPress={() => setGroupFilter('All')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Text style={{ fontSize: 11.5, color: SectorColors.blood, fontFamily: FontFamily.jakartaBold }}>
                      {t.blood2.showingGroupRequests(groupFilter)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.summaryGrid}>
                {bloodTypes.map(g => {
                  const on = groupFilter === g;
                  const count = requestGroups[g] ?? 0;
                  return (
                    <View key={g} style={styles.summaryCellWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.summaryCell,
                          { backgroundColor: on ? `${SectorColors.blood}20` : count > 0 ? `${SectorColors.blood}10` : C.surface2 },
                          on && { borderColor: SectorColors.blood, borderWidth: 1.5 },
                        ]}
                        onPress={() => handleRequestGroupPress(g)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.summaryCellGroup, { color: SectorColors.blood }]}>{g}</Text>
                        <Text style={[styles.summaryCellNum, { color: on || count > 0 ? SectorColors.blood : C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                          {count}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Request list */}
            {filteredRequests.length === 0 ? (
              <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Icon name="blood" size={30} color={C.textMuted} />
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.common.noResults}
                </Text>
                {(groupFilter !== 'All' || areaFilter !== 'All' || searchQuery.length > 0) && (
                  <TouchableOpacity
                    style={[styles.resetFilterBtn, { backgroundColor: C.surface2 }]}
                    onPress={() => {
                      setGroupFilter('All');
                      setAreaFilter('All');
                      setSearchQuery('');
                    }}
                    activeOpacity={0.75}
                  >
                    <Feather name="rotate-ccw" size={12} color={C.text} />
                    <Text style={[styles.resetFilterTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {t.blood2.clearAreaFilter ?? 'Clear filters'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredRequests.map(r => {
                const meta = parseBloodRequestMeta(r.patient, r.hospital, r.units);
                const pledgeCount = (r as any).pledge_count || 0;
                const unitsLeft = Math.max(0, meta.unitCount - pledgeCount);
                const isOwn = r.requester_id === user?.id;
                const hasPledged = respondedIds.has(r.id);
                const { fg: urgencyFg, bg: urgencyBg } = urgencyTone(C, r.urgency);
                const relativeTime = r.created_at ? formatRelativeTime(r.created_at) : '';
                const isTarget = highlightCode !== null && r.code === highlightCode;

                return (
                  <View
                    key={r.id}
                    style={[
                      styles.reqCard,
                      {
                        backgroundColor: C.surface,
                        borderColor: isTarget ? SectorColors.blood : isDark ? 'rgba(255, 255, 255, 0.08)' : C.border,
                        borderWidth: isTarget ? 2 : 1,
                      },
                    ]}
                  >
                    {isTarget && (
                      <View style={[styles.targetBanner, { backgroundColor: `${SectorColors.blood}16`, borderColor: `${SectorColors.blood}33` }]}>
                        <Feather name="bell" size={13} color={SectorColors.blood} />
                        <Text style={[styles.targetBannerTxt, { color: SectorColors.blood, fontFamily: FontFamily.jakartaBold }]}>
                          Requested Blood Need ({r.code})
                        </Text>
                      </View>
                    )}
                    {/* Top Row: Blood Group Badge + Patient / Affiliation / Time + Urgency */}
                    <View style={styles.cardHeaderRow}>
                      <RequestBloodBadge group={r.blood_group} isPlatelet={meta.isPlatelet} />

                      <View style={styles.cardHeaderCenter}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text
                            style={[
                              styles.patientNameTxt,
                              { color: C.text, fontFamily: FontFamily.jakartaBold },
                            ]}
                            numberOfLines={1}
                          >
                            {meta.patientName}
                          </Text>
                          {meta.affiliation && (
                            <View
                              style={[
                                styles.affBadge,
                                {
                                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(14, 165, 233, 0.09)',
                                  borderColor: isDark ? 'rgba(56, 189, 248, 0.28)' : 'rgba(14, 165, 233, 0.22)',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.affBadgeTxt,
                                  {
                                    color: isDark ? '#38bdf8' : '#0284c7',
                                    fontFamily: FontFamily.jakartaBold,
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {getAffiliationIcon(meta.affiliation)} {meta.affiliation}
                              </Text>
                            </View>
                          )}
                        </View>

                        {relativeTime ? (
                          <View style={styles.timeRow}>
                            <Feather name="clock" size={11} color={C.textMuted} />
                            <Text
                              style={[
                                styles.timeTxt,
                                { color: C.textMuted, fontFamily: FontFamily.jakartaRegular },
                              ]}
                            >
                              Posted {relativeTime}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Urgency Pill */}
                      <View style={[styles.urgencyPill, { backgroundColor: urgencyBg }]}>
                        <View style={[styles.urgencyDot, { backgroundColor: urgencyFg }]} />
                        <Text
                          style={[
                            styles.urgencyTxt,
                            { color: urgencyFg, fontFamily: FontFamily.jakartaBold },
                          ]}
                        >
                          {r.urgency === 'Urgent' ? '🚨 Urgent' : r.urgency === 'Today' ? '⏰ Today' : r.urgency}
                        </Text>
                      </View>
                    </View>

                    {/* Clinical Details Row: Bags Needed Badge + Medical Case Reason Badge + Platelets */}
                    <View style={styles.clinicalBadgesRow}>
                      <View
                        style={[
                          styles.unitBadge,
                          {
                            backgroundColor: isDark ? 'rgba(214, 61, 53, 0.16)' : 'rgba(214, 61, 53, 0.10)',
                            borderColor: isDark ? 'rgba(214, 61, 53, 0.35)' : 'rgba(214, 61, 53, 0.24)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.unitBadgeTxt,
                            { color: SectorColors.blood, fontFamily: FontFamily.jakartaBold },
                          ]}
                        >
                          🩸 {meta.unitCount} {meta.unitCount === 1 ? 'Bag Needed' : 'Bags Needed'}
                        </Text>
                      </View>

                      {meta.medicalReason && (
                        <View
                          style={[
                            styles.caseBadge,
                            {
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : C.surface2,
                              borderColor: C.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.caseBadgeTxt,
                              { color: C.text2, fontFamily: FontFamily.jakartaMedium },
                            ]}
                            numberOfLines={1}
                          >
                            {getMedicalReasonIcon(meta.medicalReason)} {meta.medicalReason}
                          </Text>
                        </View>
                      )}

                      {meta.isPlatelet && (
                        <View
                          style={[
                            styles.caseBadge,
                            {
                              backgroundColor: isDark ? 'rgba(234, 179, 8, 0.14)' : 'rgba(234, 179, 8, 0.10)',
                              borderColor: isDark ? 'rgba(234, 179, 8, 0.35)' : 'rgba(234, 179, 8, 0.25)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.caseBadgeTxt,
                              { color: isDark ? '#facc15' : '#b45309', fontFamily: FontFamily.jakartaBold },
                            ]}
                          >
                            ⚡ Platelets (প্লাটিলেট)
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Hospital & Area Box */}
                    <View
                      style={[
                        styles.locationBox,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : C.surface2,
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.border,
                        },
                      ]}
                    >
                      <View style={styles.locationLine}>
                        <View style={[styles.locIconSquare, { backgroundColor: isDark ? 'rgba(214, 61, 53, 0.15)' : 'rgba(214, 61, 53, 0.10)' }]}>
                          <Feather name="activity" size={12} color={SectorColors.blood} />
                        </View>
                        <Text
                          style={[
                            styles.hospitalTxt,
                            { color: C.text, fontFamily: FontFamily.jakartaBold },
                          ]}
                          numberOfLines={2}
                        >
                          {r.hospital}
                        </Text>
                      </View>

                      <View style={[styles.locationLine, { marginTop: 6 }]}>
                        <View style={[styles.locIconSquare, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : C.surface }]}>
                          <Icon name="pin" size={11} color={C.textMuted} />
                        </View>
                        <Text
                          style={[
                            styles.areaTxt,
                            { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                          ]}
                          numberOfLines={1}
                        >
                          {r.area ? `${r.area}, Dhaka` : 'Dhaka, Bangladesh'}
                        </Text>
                      </View>
                    </View>

                    {/* Pledge Progress / Status Row (Answers multi-bag scenario!) */}
                    <View
                      style={[
                        styles.pledgeStatusBox,
                        pledgeCount > 0
                          ? {
                              backgroundColor: unitsLeft === 0
                                ? (isDark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.08)')
                                : (isDark ? 'rgba(214, 61, 53, 0.12)' : 'rgba(214, 61, 53, 0.07)'),
                              borderColor: unitsLeft === 0
                                ? (isDark ? 'rgba(34, 197, 94, 0.30)' : 'rgba(34, 197, 94, 0.20)')
                                : (isDark ? 'rgba(214, 61, 53, 0.25)' : 'rgba(214, 61, 53, 0.18)'),
                            }
                          : {
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : C.surface2,
                              borderColor: 'transparent',
                            },
                      ]}
                    >
                      <Feather
                        name={pledgeCount > 0 ? (unitsLeft === 0 ? 'check-circle' : 'heart') : 'users'}
                        size={13}
                        color={
                          pledgeCount > 0
                            ? (unitsLeft === 0 ? C.success : SectorColors.blood)
                            : C.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.pledgeStatusTxt,
                          {
                            color: pledgeCount > 0
                              ? (unitsLeft === 0 ? C.success : (isDark ? '#fff' : SectorColors.blood))
                              : C.textMuted,
                            fontFamily: pledgeCount > 0 ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {pledgeCount > 0
                          ? unitsLeft === 0
                            ? `${pledgeCount} ${pledgeCount === 1 ? 'donor offered help' : 'donors offered help'} · All ${meta.unitCount} bags covered!`
                            : `${pledgeCount} ${pledgeCount === 1 ? 'donor offered help' : 'donors offered help'} (${pledgeCount}/${meta.unitCount} bags covered · ${unitsLeft} more needed)`
                          : meta.unitCount > 1
                            ? `${meta.unitCount} donors needed · No donors pledged yet`
                            : '1 donor needed · Be the first to help'}
                      </Text>
                    </View>

                    {/* High-Visibility Action Button */}
                    {isOwn ? (
                      <TouchableOpacity
                        style={[
                          styles.cardActionBtn,
                          {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : C.surface2,
                            borderColor: C.border,
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() => navigation.navigate('BloodRequestDetail', { requestId: r.id })}
                        activeOpacity={0.8}
                      >
                        <Icon name="directory" size={15} color={C.text} />
                        <Text style={[styles.cardActionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          {t.blood2.manageResponses} {pledgeCount > 0 ? `(${pledgeCount})` : ''}
                        </Text>
                      </TouchableOpacity>
                    ) : hasPledged ? (
                      <TouchableOpacity
                        style={[styles.cardActionBtn, { backgroundColor: '#16a34a' }]}
                        onPress={() => revealRequester(r)}
                        activeOpacity={0.85}
                        disabled={busyId === r.id}
                      >
                        <Icon name="phone" size={15} color="#fff" />
                        <Text style={[styles.cardActionBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                          {busyId === r.id ? 'Connecting…' : 'Call / WhatsApp Requester'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.cardActionBtn, { backgroundColor: SectorColors.blood }]}
                        onPress={() => handleHelpPress(r)}
                        activeOpacity={0.85}
                      >
                        <Icon name="blood" size={16} color="#fff" />
                        <Text style={[styles.cardActionBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                          {unitsLeft > 0 && meta.unitCount > 1 && pledgeCount > 0
                            ? `I Can Help (${unitsLeft} More Needed)`
                            : t.blood2.iCanHelp}
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
                    <View key={g} style={styles.summaryCellWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.summaryCell,
                          { backgroundColor: on ? `${SectorColors.blood}20` : C.surface2 },
                          on && { borderColor: SectorColors.blood, borderWidth: 1.5 },
                        ]}
                        onPress={() => handleDonorGroupPress(g)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.summaryCellGroup, { color: SectorColors.blood }]}>{g}</Text>
                        <Text style={[styles.summaryCellNum, { color: on ? SectorColors.blood : C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                          {donorGroups[g] ?? 0}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Donor list */}
            {filteredDonors.length === 0 ? (
              <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Icon name="blood" size={30} color={C.textMuted} />
                <Text style={[styles.emptyTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.common.noResults}
                </Text>
                {(groupFilter !== 'All' || areaFilter !== 'All' || searchQuery.length > 0) && (
                  <TouchableOpacity
                    style={[styles.resetFilterBtn, { backgroundColor: C.surface2 }]}
                    onPress={() => {
                      setGroupFilter('All');
                      setAreaFilter('All');
                      setSearchQuery('');
                    }}
                    activeOpacity={0.75}
                  >
                    <Feather name="rotate-ccw" size={12} color={C.text} />
                    <Text style={[styles.resetFilterTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {t.blood2.clearAreaFilter ?? 'Clear filters'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={[styles.donorList, { backgroundColor: C.surface, borderColor: C.border }]}>
                {filteredDonors.map((d, i) => {
                  const isMe = d.user_id === user?.id;
                  const { eligible, daysLeft } = donorEligibility(d.last_donated);
                  return (
                    <View key={d.user_id}>
                      {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                      <View style={[styles.donorRow, !eligible && { opacity: 0.6 }]}>
                        <Avatar name={(d as any).profiles?.full_name} uri={(d as any).profiles?.avatar_url} size="sm" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.donorName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                            {(d as any).profiles?.full_name ?? t.blood2.anonymous}{isMe ? ` ${t.blood2.youTag}` : ''}
                          </Text>
                          <Text style={[styles.donorMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                            {t.blood2.donorMeta(d.area || 'BUBT', d.last_donated ?? t.blood2.never)}
                          </Text>
                          <View style={[styles.eligPill, { backgroundColor: eligible ? C.successBg : C.warnBg }]}>
                            <Text style={[styles.eligTxt, { color: eligible ? C.success : C.warn, fontFamily: FontFamily.jakartaBold }]}>
                              {eligible ? t.blood2.eligible : t.blood2.eligibleInDays(daysLeft)}
                            </Text>
                          </View>
                        </View>
                        <GroupBadge group={d.blood_group} size={34} />
                        {isMe ? (
                          eligible && d.last_donated !== localToday() ? (
                            <TouchableOpacity
                              style={[styles.contactBtn, { backgroundColor: C.successBg }]}
                              onPress={markDonatedToday}
                              activeOpacity={0.75}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Text style={[styles.contactTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                                {t.blood2.iDonated}
                              </Text>
                            </TouchableOpacity>
                          ) : null
                        ) : (
                          <TouchableOpacity
                            style={[styles.contactBtn, {
                              backgroundColor: eligible ? BLOOD_BG : C.surface2,
                              opacity: busyId === d.user_id ? 0.5 : 1,
                            }]}
                            onPress={() => revealContact(d.user_id, (d as any).profiles?.full_name)}
                            activeOpacity={0.75}
                            disabled={busyId === d.user_id || !eligible}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
        whatsAppMessage={contactTarget?.message}
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
  actBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    borderRadius: 12,
  } as ViewStyle,
  actBtnTxt: {
    fontSize: 13.5,
  } as any,
  searchAreaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  } as ViewStyle,
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    paddingVertical: 0,
  } as TextStyle,
  areaPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingLeft: 8,
    paddingRight: 6,
    borderRadius: 13,
    borderWidth: 1,
    maxWidth: 165,
    minWidth: 125,
  } as ViewStyle,
  areaPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    height: '100%',
  } as ViewStyle,
  areaIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  areaTextStack: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,
  areaMicroLabel: {
    fontSize: 9,
    letterSpacing: 0.6,
  } as TextStyle,
  areaPickerTriggerTxt: {
    fontSize: 12,
    flexShrink: 1,
  } as TextStyle,
  areaClearBtn: {
    paddingLeft: 4,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  clearPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  miniBloodBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  miniBloodTxt: {
    fontSize: 13,
  } as any,
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginHorizontal: Layout.screenPadding,
    marginTop: 6,
    marginBottom: 8,
    position: 'relative',
  } as ViewStyle,
  activeIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 11,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  } as ViewStyle,
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
    zIndex: 1,
  } as ViewStyle,
  tabBtnTxt: { fontSize: 13 } as any,
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
  } as ViewStyle,
  tabBadgeTxt: { fontSize: 11 } as any,
  eligPill: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999, marginTop: 4 } as ViewStyle,
  eligTxt: { fontSize: 10 } as any,
  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,
  list: { gap: 11 } as ViewStyle,
  groupBadge: { backgroundColor: BLOOD_BG, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  groupText: {} as any,
  reqCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  targetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  targetBannerTxt: {
    fontSize: 12,
  } as TextStyle,
  reqBloodBadge: {
    width: 48,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  reqBloodGroupTxt: {
    fontSize: 16.5,
    lineHeight: 19,
  } as TextStyle,
  reqBloodTypeLabel: {
    fontSize: 7.5,
    letterSpacing: 0.6,
    marginTop: 1,
  } as TextStyle,
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  cardHeaderCenter: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  } as ViewStyle,
  patientNameTxt: {
    fontSize: 15,
  } as TextStyle,
  affBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  } as ViewStyle,
  affBadgeTxt: {
    fontSize: 10.5,
  } as TextStyle,
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  } as ViewStyle,
  timeTxt: {
    fontSize: 11,
  } as TextStyle,
  clinicalBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  } as ViewStyle,
  unitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  unitBadgeTxt: {
    fontSize: 11.5,
  } as TextStyle,
  caseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  caseBadgeTxt: {
    fontSize: 11,
  } as TextStyle,
  locationBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  } as ViewStyle,
  locationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  } as ViewStyle,
  locIconSquare: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  hospitalTxt: {
    fontSize: 13,
    flex: 1,
  } as TextStyle,
  areaTxt: {
    fontSize: 11.5,
    flex: 1,
  } as TextStyle,
  pledgeStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  } as ViewStyle,
  pledgeStatusTxt: {
    fontSize: 12,
    flex: 1,
  } as TextStyle,
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    marginTop: 11,
  } as ViewStyle,
  cardActionBtnTxt: {
    fontSize: 13.5,
  } as TextStyle,
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
  pledgeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, marginTop: 12 } as ViewStyle,
  pledgeTxt: { fontSize: 13 } as any,
  summaryCard: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 } as ViewStyle,
  summaryTitle: { fontSize: 11, letterSpacing: 0.5, marginBottom: 10 } as any,
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as ViewStyle,
  summaryCellWrapper: { width: '22%' } as ViewStyle,
  summaryCell: { width: '100%', alignItems: 'center', paddingVertical: 8, borderRadius: 10 } as ViewStyle,
  summaryCellGroup: { fontSize: 13, fontFamily: FontFamily.jakartaExtraBold } as any,
  summaryCellNum: { fontSize: 15, marginTop: 2 } as any,
  casePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 } as ViewStyle,
  caseTxt: { fontSize: 10.5 } as any,
  donorList: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  donorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 } as ViewStyle,
  donorName: { fontSize: 14 } as any,
  donorMeta: { fontSize: 12, marginTop: 2 } as any,
  contactBtn: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 } as ViewStyle,
  contactTxt: { fontSize: 11 } as any,
  myStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 6,
    gap: 10,
  } as ViewStyle,
  myStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 } as ViewStyle,
  myStatusTitle: { fontSize: 13 } as any,
  myStatusMeta: { fontSize: 11, marginTop: 1 } as any,
  myStatusEditBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  } as ViewStyle,
  statusDonatedBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  } as ViewStyle,
  statusDonatedTxt: { fontSize: 11 } as any,
  registerPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 6,
    gap: 10,
  } as ViewStyle,
  registerPromptTitle: { fontSize: 13 } as any,
  registerPromptSub: { fontSize: 11, marginTop: 1 } as any,
  plateletPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 } as ViewStyle,
  plateletTxt: { fontSize: 10 } as any,
  emptyWrap: { padding: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 } as ViewStyle,
  emptyTxt: { fontSize: 13 } as any,
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  } as ViewStyle,
  resetFilterTxt: { fontSize: 12 } as any,
});
