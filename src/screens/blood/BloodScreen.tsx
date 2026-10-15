import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Alert, TextInput, Keyboard, Animated, type ViewStyle, type TextStyle,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { SkeletonList, LoadError } from '../../components/ui/LoadState';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout, SectorColors, Accent } from '../../theme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import {
  donorEligibility,
  isBloodCompatible,
  parseBloodRequestMeta,
} from '../../utils/blood';
import { scheduleRechargedReminder } from '../../utils/bloodReminder';
import { localToday, formatRelativeTime } from '../../utils/format';
import {
  getBloodFeed, pledgeToRequest, markDonatedToday as markDonated,
  getDonorContact, getRequesterContact, openBloodDmThread, openDonorDmThread,
  type DonorWithName,
} from '../../services/bloodService';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { ContactSheet } from '../../components/ui/ContactSheet';
import { AreaPickerModal } from '../../components/blood/AreaPickerModal';
import { HospitalMapModal } from '../../components/blood/HospitalMapModal';
import { DHAKA_AREAS } from '../../constants/dhakaAreas';
import type { BloodRequest, Donor } from '../../types/database';
import type { Coordinates } from '../../services/locationService';
import { resolveHospitalLocation } from '../../constants/dhakaHospitalCoords';

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

function RequestBloodBadge({ group, isPlatelet, isDark }: { group: string; isPlatelet?: boolean; isDark?: boolean }) {
  const tintColor = isPlatelet ? '#eab308' : SectorColors.blood;
  const bg = isPlatelet
    ? (isDark ? 'rgba(234, 179, 8, 0.14)' : 'rgba(234, 179, 8, 0.08)')
    : (isDark ? 'rgba(199, 52, 74, 0.16)' : 'rgba(199, 52, 74, 0.08)');
  const border = isPlatelet
    ? (isDark ? 'rgba(234, 179, 8, 0.35)' : 'rgba(234, 179, 8, 0.22)')
    : (isDark ? 'rgba(199, 52, 74, 0.32)' : 'rgba(199, 52, 74, 0.20)');

  return (
    <View style={[styles.reqBloodBadge, { backgroundColor: bg, borderColor: border }]}>
      <Text
        style={[
          styles.reqBloodGroupTxt,
          {
            color: tintColor,
            fontFamily: FontFamily.jakartaExtraBold,
          },
        ]}
      >
        {group}
      </Text>
      <Text
        numberOfLines={1}
        ellipsizeMode="clip"
        style={[
          styles.reqBloodTypeLabel,
          {
            color: tintColor,
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

  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donors, setDonors]     = useState<DonorWithName[]>([]);

  const BLOOD_TABS: TabItem<Tab>[] = useMemo(() => [
    {
      id: 'requests',
      label: t.blood2.requestsTab,
      count: requests.length > 0 ? requests.length : undefined,
      color: C.danger,
    },
    {
      id: 'donors',
      label: t.blood2.donorsTab,
      count: donors.length > 0 ? donors.length : undefined,
      color: C.success,
    },
  ], [t, requests.length, donors.length, C.danger, C.success]);

  const bloodTypes = useMemo(() => ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], []);

  function handleRequestGroupPress(g: string) {
    setGroupFilter(prev => (prev === g ? 'All' : g));
  }

  function handleDonorGroupPress(g: string) {
    setGroupFilter(prev => (prev === g ? 'All' : g));
  }

  const [groupFilter, setGroupFilter] = useState('All');
  const [areaFilter, setAreaFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [myDonor, setMyDonor]   = useState<Donor | null>(null);
  const [myDonationCount, setMyDonationCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [contactTarget, setContactTarget] = useState<{
    name: string;
    phone?: string | null;
    title?: string;
    message?: string;
    inAppChatAction?: () => void;
  } | null>(null);
  const [hospitalMapTarget, setHospitalMapTarget] = useState<{ hospital: string; area?: string; coords?: Coordinates } | null>(null);
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
      const donorDisplayName = res.data?.name ?? donorName ?? t.blood2.contact;
      const phoneNum = res.data?.whatsapp ?? null;
      if (!phoneNum && donorUserId === user.id) {
        toast({ type: 'info', title: 'Self Profile', message: 'This is your own donor profile.' });
        return;
      }
      const prefill = `Salam, I found your profile on the CampusOne Blood Registry (${donorName || 'Donor'}). Are you currently available to donate?`;

      const handleInAppChat = async () => {
        if (donorUserId === user.id) return;
        try {
          const dmRes = await openDonorDmThread(donorUserId);
          if (!dmRes.success) {
            toast({ type: 'error', title: t.common.error, message: dmRes.error ?? 'Could not start conversation' });
            return;
          }
          navigation.navigate('MessageThread', {
            kind: 'dm',
            id: donorUserId,
            title: donorDisplayName,
            initialText: prefill,
          });
        } catch (e: any) {
          toast({ type: 'error', title: t.common.error, message: e?.message ?? 'Failed to open message thread' });
        }
      };

      setContactTarget({
        name: donorDisplayName,
        phone: phoneNum,
        title: t.blood2.donorsTab,
        message: prefill,
        inAppChatAction: donorUserId !== user.id ? handleInAppChat : undefined,
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
      const requesterDisplayName = res.data?.name ?? r.patient ?? t.blood2.requester;
      const phoneNum = res.data?.whatsapp ?? null;
      const cleanPatient = (r.patient ?? 'patient').replace(/\[Platelets\]/g, '').trim();
      const prefill = `Salam, I saw your CampusOne blood request for ${cleanPatient} at ${r.hospital || 'the hospital'}. I am an ${r.blood_group} donor and ready to help. Where can I meet you?`;

      const handleInAppChat = async () => {
        if (!r.requester_id || r.requester_id === user.id) return;
        try {
          const dmRes = await openBloodDmThread(r.code, r.requester_id);
          if (!dmRes.success) {
            toast({ type: 'error', title: t.common.error, message: dmRes.error ?? 'Could not start conversation' });
            return;
          }
          navigation.navigate('MessageThread', {
            kind: 'dm',
            id: r.requester_id,
            title: requesterDisplayName,
            initialText: prefill,
          });
        } catch (e: any) {
          toast({ type: 'error', title: t.common.error, message: e?.message ?? 'Failed to open message thread' });
        }
      };

      setContactTarget({
        name: requesterDisplayName,
        phone: phoneNum,
        title: `${r.blood_group} · ${r.patient}`,
        message: prefill,
        inAppChatAction: r.requester_id && r.requester_id !== user.id ? handleInAppChat : undefined,
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
          await AsyncStorage.removeItem(CacheKeys.HOME_STATUS(user.id));
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
            // Optimistically mark as responded and bump pledge count
            setRespondedIds(prev => new Set(prev).add(r.id));
            setRequests(prev => prev.map(req => req.id === r.id ? { ...req, pledge_count: ((req as any).pledge_count || 0) + 1 } : req));
            const res = await pledgeToRequest(r.id, user.id);
            if (!res.ok) {
              setRespondedIds(prev => {
                const next = new Set(prev);
                next.delete(r.id);
                return next;
              });
              setRequests(prev => prev.map(req => req.id === r.id ? { ...req, pledge_count: Math.max(0, ((req as any).pledge_count || 1) - 1) } : req));
              toast({ type: 'error', title: t.common.error, message: t.blood2.submitResponseError });
            } else {
              const cacheKey = CacheKeys.BLOOD_FEED(user.id);
              const cached = await getCache<any>(cacheKey);
              if (cached) {
                const setIds = new Set(cached.respondedIds ?? []);
                setIds.add(r.id);
                const updatedRequests = (cached.requests ?? []).map((req: any) =>
                  req.id === r.id ? { ...req, pledge_count: (req.pledge_count || 0) + 1 } : req
                );
                setCache(cacheKey, { ...cached, requests: updatedRequests, respondedIds: Array.from(setIds) });
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



  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.blood2.bloodDonation} onBack={() => navigation.goBack()} />
      <OfflineBanner
        visible={isOffline}
        message="Showing cached blood requests and donor directory. Connect to internet to respond or reveal contacts."
      />

      {/* Prominent Hero Action Bar (Universal 58dp Standard, Parity with Rides & Market) */}
      <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 4, paddingBottom: 6 }}>
        <TouchableOpacity
          style={[styles.heroActBtn, { backgroundColor: SectorColors.blood }]}
          onPress={() => {
            if (tab === 'donors' && !myDonor) {
              navigation.navigate('DonorRegister');
            } else {
              navigation.navigate('BloodRequest');
            }
          }}
          activeOpacity={0.85}
        >
          <Feather name="plus-circle" size={18} color="#fff" />
          <Text style={[styles.heroActBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
            {tab === 'donors' && !myDonor
              ? (t.blood2.registerAsDonorBtn ?? 'Register as Blood Donor')
              : (t.blood2.requestBloodBtn ?? 'Emergency Blood Request')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Unified Segmented Tab Switcher with Native Spring Animation & Colors */}
      <View style={{ paddingHorizontal: Layout.screenPadding, marginBottom: 8 }}>
        <SegmentedTabs<Tab>
          tabs={BLOOD_TABS}
          activeTab={tab}
          onTabChange={setTab}
        />
      </View>

      {/* Unified Search & Dhaka Location Trigger Row */}
      <View style={[styles.searchAreaRow, { paddingHorizontal: Layout.screenPadding }]}>
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <TouchableOpacity
            onPress={() => searchInputRef.current?.focus()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 8 }}
          >
            <Feather name="search" size={18} color={C.textMuted} />
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
            { backgroundColor: C.surface, borderColor: C.border },
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
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2,
                  borderColor: C.border,
                  borderWidth: 1,
                },
              ]}
            >
              <AnimatedIcon
                family={isHospitalFilter ? 'mci' : 'feather'}
                name={isHospitalFilter ? 'hospital-building' : 'map-pin'}
                size={14}
                color={C.text}
                animation="spring"
              />
            </View>

            <View style={styles.areaTextStack}>
              <Text
                style={[
                  styles.areaMicroLabel,
                  {
                    color: C.textMuted,
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
                    color: C.text,
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
              <View style={[styles.clearPill, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}>
                <Feather name="x" size={11} color={C.text} />
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
            {/* Compact 8-Group Grid (De-bloated: Neutral by default, Red accent only on selected) */}
            <View style={[styles.compactGridCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.compactGridHeader}>
                <Text style={[styles.compactGridTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {t.blood2.requestsByGroup}
                </Text>
                {groupFilter !== 'All' && (
                  <TouchableOpacity
                    onPress={() => setGroupFilter('All')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Text style={{ fontSize: 11, color: SectorColors.blood, fontFamily: FontFamily.jakartaBold }}>
                      {t.blood2.showingGroupRequests(groupFilter)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.compactGridBody}>
                {bloodTypes.map(g => {
                  const on = groupFilter === g;
                  const count = requestGroups[g] ?? 0;
                  return (
                    <View key={g} style={styles.compactCellWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.compactCell,
                          on
                            ? { backgroundColor: isDark ? 'rgba(199, 52, 74, 0.18)' : 'rgba(199, 52, 74, 0.10)', borderColor: SectorColors.blood, borderWidth: 1.5 }
                            : { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 },
                        ]}
                        onPress={() => handleRequestGroupPress(g)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.compactCellGroup,
                            {
                              color: on ? SectorColors.blood : C.text,
                              fontFamily: FontFamily.jakartaBold,
                            },
                          ]}
                        >
                          {g}
                        </Text>
                        <Text
                          style={[
                            styles.compactCellCount,
                            {
                              color: on ? SectorColors.blood : count > 0 ? C.text2 : C.textMuted,
                              fontFamily: FontFamily.jakartaBold,
                            },
                          ]}
                        >
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
                <AnimatedIcon family="feather" name="droplet" size={32} color={SectorColors.blood} animation="entrance" />
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

                    {/* Top Row: Blood Group Badge + Patient Name / Affiliation / Time + Urgency */}
                    <View style={styles.cardHeaderRow}>
                      <RequestBloodBadge group={r.blood_group} isPlatelet={meta.isPlatelet} isDark={isDark} />

                      <View style={styles.cardHeaderCenter}>
                        <View style={styles.patientTitleRow}>
                          <Text
                            style={[
                              styles.patientNameTxt,
                              { color: C.text, fontFamily: FontFamily.jakartaBold },
                            ]}
                            numberOfLines={1}
                          >
                            {meta.patientName}
                          </Text>
                          <StatusBadge
                            variant="urgency"
                            value={r.urgency}
                            size="sm"
                            pulse={r.urgency === 'Urgent'}
                          />
                        </View>

                        <View style={styles.metaSubRow}>
                          {meta.affiliation ? (
                            <Text style={[styles.metaSubTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                              {meta.affiliation}
                              {relativeTime ? ` · ${relativeTime}` : ''}
                            </Text>
                          ) : relativeTime ? (
                            <Text style={[styles.metaSubTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                              {relativeTime}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    {/* Interactive Hospital & Area Line (Opens In-App Map + Google Maps) */}
                    <TouchableOpacity
                      style={[styles.hospitalTouchRow, { backgroundColor: C.surface2, borderColor: C.border }]}
                      onPress={() => {
                        const resolved = resolveHospitalLocation(r.hospital, r.area);
                        setHospitalMapTarget({ hospital: r.hospital, area: r.area, coords: resolved.coords });
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.hospitalRowLeft}>
                        <AnimatedIcon family="feather" name="map-pin" size={13} color={C.textMuted} animation="float" loop={true} />
                        <Text style={styles.hospitalTxt} numberOfLines={1}>
                          <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>{r.hospital}</Text>
                          {r.area ? (
                            <Text style={{ fontFamily: FontFamily.jakartaMedium, color: C.textMuted }}>{` · ${r.area}`}</Text>
                          ) : null}
                        </Text>
                      </View>
                      <View style={[styles.mapHintBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface, borderColor: C.border }]}>
                        <Text style={[styles.mapHintTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                          Map
                        </Text>
                        <AnimatedIcon family="feather" name="arrow-up-right" size={11} color={C.textMuted} animation="spring" />
                      </View>
                    </TouchableOpacity>

                    {/* Clinical Details Row: Bags Needed Badge + Medical Case Reason Badge */}
                    <View style={styles.clinicalBadgesRow}>
                      <StatusBadge
                        variant="bags"
                        count={meta.unitCount}
                        size="sm"
                      />

                      {meta.medicalReason ? (
                        <StatusBadge
                          variant="medical"
                          value={meta.medicalReason}
                          size="sm"
                        />
                      ) : null}
                    </View>

                    {/* Pledge Progress / Status Strip (De-bloated: Neutral by default, soft emerald when all covered) */}
                    <View
                      style={[
                        styles.pledgeStrip,
                        {
                          backgroundColor: pledgeCount > 0 && unitsLeft === 0
                            ? (isDark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.08)')
                            : C.surface2,
                          borderColor: pledgeCount > 0 && unitsLeft === 0
                            ? (isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.20)')
                            : C.border,
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
                          styles.pledgeStripTxt,
                          {
                            color: pledgeCount > 0
                              ? (unitsLeft === 0 ? C.success : C.text)
                              : C.textMuted,
                            fontFamily: pledgeCount > 0 ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          },
                        ]}
                      >
                        {pledgeCount > 0
                          ? unitsLeft === 0
                            ? `${pledgeCount} ${pledgeCount === 1 ? 'donor offered help' : 'donors offered help'} · All ${meta.unitCount} bags covered!`
                            : `${pledgeCount} ${pledgeCount === 1 ? 'donor offered help' : 'donors offered help'} (${pledgeCount}/${meta.unitCount} bags · ${unitsLeft} needed)`
                          : meta.unitCount > 1
                            ? `${meta.unitCount} donors needed`
                            : '1 donor needed · Be the first to help'}
                      </Text>
                    </View>

                    {/* High-Visibility Action Button (Universal 58dp Standard) */}
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
                        <AnimatedIcon family="feather" name="users" size={16} color={C.text} animation="entrance" />
                        <Text style={[styles.cardActionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          {t.blood2.manageResponses} {pledgeCount > 0 ? `(${pledgeCount})` : ''}
                        </Text>
                      </TouchableOpacity>
                    ) : hasPledged ? (
                      <TouchableOpacity
                        style={[styles.cardActionBtn, { backgroundColor: C.success }]}
                        onPress={() => revealRequester(r)}
                        activeOpacity={0.85}
                        disabled={busyId === r.id}
                      >
                        <AnimatedIcon family="feather" name="phone-call" size={16} color="#fff" animation="entrance" />
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
                        <AnimatedIcon family="feather" name="droplet" size={16} color="#fff" animation="entrance" />
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
          <View style={styles.list}>
            {/* Donor Status / Registration Banner (Universal 72dp Content Standard) */}
            {myDonor ? (
              <View style={[styles.myStatusCard, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 2 }]}>
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
                        const { eligible, daysLeft } = donorEligibility(myDonor.last_donated, (profile as any)?.gender);
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
                    const { eligible } = donorEligibility(myDonor.last_donated, (profile as any)?.gender);
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
                  { backgroundColor: C.surface, borderColor: C.border, marginBottom: 2 },
                ]}
                onPress={() => navigation.navigate('DonorRegister')}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={[styles.miniBloodBadge, { backgroundColor: BLOOD_BG }]}>
                    <AnimatedIcon family="feather" name="droplet" size={20} color={BLOOD_COLOR} animation="entrance" />
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
                <Feather name="chevron-right" size={17} color={C.textMuted} />
              </TouchableOpacity>
            )}

            {/* Compact 8-Group Grid */}
            <View style={[styles.compactGridCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.compactGridHeader}>
                <Text style={[styles.compactGridTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {t.blood2.availableDonors}
                </Text>
                {groupFilter !== 'All' && (
                  <TouchableOpacity
                    onPress={() => setGroupFilter('All')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Text style={{ fontSize: 11, color: SectorColors.blood, fontFamily: FontFamily.jakartaBold }}>
                      {t.blood2.showingGroupFilter(groupFilter)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.compactGridBody}>
                {bloodTypes.map(g => {
                  const on = groupFilter === g;
                  const count = donorGroups[g] ?? 0;
                  return (
                    <View key={g} style={styles.compactCellWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.compactCell,
                          on
                            ? { backgroundColor: isDark ? 'rgba(199, 52, 74, 0.18)' : 'rgba(199, 52, 74, 0.10)', borderColor: SectorColors.blood, borderWidth: 1.5 }
                            : { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 },
                        ]}
                        onPress={() => handleDonorGroupPress(g)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.compactCellGroup,
                            {
                              color: on ? SectorColors.blood : C.text,
                              fontFamily: FontFamily.jakartaBold,
                            },
                          ]}
                        >
                          {g}
                        </Text>
                        <Text
                          style={[
                            styles.compactCellCount,
                            {
                              color: on ? SectorColors.blood : count > 0 ? C.text2 : C.textMuted,
                              fontFamily: FontFamily.jakartaBold,
                            },
                          ]}
                        >
                          {count}
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
                <AnimatedIcon family="feather" name="droplet" size={32} color={SectorColors.blood} animation="entrance" />
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
              <View style={styles.list}>
                {filteredDonors.map(d => {
                  const isMe = d.user_id === user?.id;
                  const { eligible, daysLeft } = donorEligibility(d.last_donated, (d as any).profiles?.gender ?? (d as any).gender);
                  return (
                    <View
                      key={d.user_id}
                      style={[
                        styles.donorCard,
                        {
                          backgroundColor: C.surface,
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : C.border,
                        },
                        !eligible && { opacity: 0.65 },
                      ]}
                    >
                      <Avatar name={(d as any).profiles?.full_name} uri={(d as any).profiles?.avatar_url} size="md" />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.donorName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {(d as any).profiles?.full_name ?? t.blood2.anonymous}{isMe ? ` ${t.blood2.youTag}` : ''}
                        </Text>
                        <Text style={[styles.donorMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                          {t.blood2.donorMeta(d.area || 'BUBT', d.last_donated ?? t.blood2.never)}
                        </Text>
                        <View style={[styles.eligPill, { backgroundColor: eligible ? C.successBg : C.warnBg }]}>
                          <Text style={[styles.eligTxt, { color: eligible ? C.success : C.warn, fontFamily: FontFamily.jakartaBold }]}>
                            {eligible ? t.blood2.eligible : t.blood2.eligibleInDays(daysLeft)}
                          </Text>
                        </View>
                      </View>
                      <GroupBadge group={d.blood_group} size={36} />
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
                          <AnimatedIcon
                            family="feather"
                            name="phone"
                            size={12}
                            color={eligible ? BLOOD_COLOR : C.textMuted}
                            animation="entrance"
                          />
                          <Text style={[styles.contactTxt, { color: eligible ? BLOOD_COLOR : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                            {busyId === d.user_id ? '…' : t.blood2.contact}
                          </Text>
                        </TouchableOpacity>
                      )}
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
        inAppChatAction={contactTarget?.inAppChatAction}
      />
      <AreaPickerModal
        visible={areaModalVisible}
        onClose={() => setAreaModalVisible(false)}
        selectedArea={areaFilter}
        onSelectArea={setAreaFilter}
        areaCounts={areaCounts}
      />
      <HospitalMapModal
        visible={!!hospitalMapTarget}
        onClose={() => setHospitalMapTarget(null)}
        hospital={hospitalMapTarget?.hospital ?? ''}
        area={hospitalMapTarget?.area}
        coords={hospitalMapTarget?.coords}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  heroActBtn: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  heroActBtnTxt: {
    fontSize: 15,
  } as TextStyle,
  actBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 58,
    borderRadius: 16,
  } as ViewStyle,
  actBtnTxt: {
    fontSize: 14.5,
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
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,
  areaPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    paddingHorizontal: 12,
    borderRadius: 16,
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
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  miniBloodTxt: {
    fontSize: 15.5,
  } as any,
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
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    paddingHorizontal: 2,
  } as ViewStyle,
  reqBloodGroupTxt: {
    fontSize: 17,
    lineHeight: 20,
  } as TextStyle,
  reqBloodTypeLabel: {
    fontSize: 7.2,
    letterSpacing: 0.2,
    marginTop: 1,
  } as TextStyle,
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  cardHeaderCenter: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  patientTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  } as ViewStyle,
  patientNameTxt: {
    fontSize: 15.5,
    flex: 1,
  } as TextStyle,
  metaSubRow: {
    marginTop: 2,
  } as ViewStyle,
  metaSubTxt: {
    fontSize: 11.5,
  } as TextStyle,
  hospitalTouchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  } as ViewStyle,
  hospitalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  } as ViewStyle,
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
  } as ViewStyle,
  hospitalTxt: {
    fontSize: 13,
    flex: 1,
  } as TextStyle,
  mapHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  mapHintTxt: {
    fontSize: 11,
  } as TextStyle,
  clinicalBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  } as ViewStyle,
  pledgeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  } as ViewStyle,
  pledgeStripTxt: {
    fontSize: 12,
    flex: 1,
  } as TextStyle,
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 58,
    borderRadius: 16,
    marginTop: 12,
  } as ViewStyle,
  cardActionBtnTxt: {
    fontSize: 14.5,
  } as TextStyle,
  compactGridCard: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  compactGridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  } as ViewStyle,
  compactGridTitle: {
    fontSize: 11,
    letterSpacing: 0.4,
  } as TextStyle,
  compactGridBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  } as ViewStyle,
  compactCellWrapper: {
    width: '23.4%',
  } as ViewStyle,
  compactCell: {
    width: '100%',
    height: 34,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  } as ViewStyle,
  compactCellGroup: {
    fontSize: 12,
  } as TextStyle,
  compactCellCount: {
    fontSize: 12.5,
  } as TextStyle,
  donorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    minHeight: 72,
  } as ViewStyle,
  donorName: { fontSize: 14.5 } as any,
  donorMeta: { fontSize: 11.5, marginTop: 2 } as any,
  contactBtn: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
  } as ViewStyle,
  contactTxt: { fontSize: 11.5 } as any,
  myStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 6,
    gap: 12,
  } as ViewStyle,
  myStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 } as ViewStyle,
  myStatusTitle: { fontSize: 14.5 } as any,
  myStatusMeta: { fontSize: 11.5, marginTop: 2 } as any,
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
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 6,
    gap: 12,
  } as ViewStyle,
  registerPromptTitle: { fontSize: 14.5 } as any,
  registerPromptSub: { fontSize: 11.5, marginTop: 2 } as any,
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
