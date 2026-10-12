import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { LoadError } from '../../components/ui/LoadState';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { useAuth } from '../../store/authStore';
import { getCache, removeCache, CacheKeys } from '../../services/cacheService';
import {
  donorEligibility,
  parseBloodRequestMeta,
} from '../../utils/blood';
import { formatRelativeTime } from '../../utils/format';
import {
  getRequest, getResponders, confirmDonation, markRequestFulfilled,
  getDonorContact, openBloodDmThread, type Pledge,
} from '../../services/bloodService';
import { ContactSheet } from '../../components/ui/ContactSheet';

const BLOOD = SectorColors.blood;

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

export function BloodRequestDetailScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const { requestId } = route.params ?? {};

  const [req, setReq] = useState<any>(null);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyContactId, setBusyContactId] = useState<string | null>(null);
  const [contactTarget, setContactTarget] = useState<{
    name: string;
    phone?: string | null;
    title?: string;
    message?: string;
    inAppChatAction?: () => void;
  } | null>(null);
  const [fulfilling, setFulfilling] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    if (!requestId) { setLoadFailed(true); setLoading(false); return; }

    const cacheKey = CacheKeys.BLOOD_FEED(user?.id ?? 'anon');
    const cachedFeed = await getCache<{ requests: any[] }>(cacheKey);
    const cached = cachedFeed?.requests?.find(r => r.id === requestId);
    if (cached) {
      setReq(cached);
      setLoading(false);
    }

    try {
      const [reqRes, plRes] = await Promise.all([
        getRequest(requestId),
        getResponders(requestId),
      ]);
      if (!reqRes.ok || !reqRes.data) {
        if (cached) {
          setIsOffline(true);
          setLoading(false);
          return;
        }
        setLoadFailed(true);
        setLoading(false);
        return;
      }
      setIsOffline(false);
      setLoadFailed(false);
      setReq(reqRes.data);
      if (plRes.ok) setPledges(plRes.data);
      setLoading(false);
    } catch {
      if (cached) {
        setIsOffline(true);
      } else {
        setLoadFailed(true);
      }
      setLoading(false);
    }
  }, [requestId, user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function revealDonorContact(p: Pledge) {
    if (busyContactId) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to view donor contact.' });
      return;
    }
    setBusyContactId(p.donor_id);
    try {
      const res = await getDonorContact(p.donor_id);
      if (!res.ok) {
        toast({ type: 'error', title: t.common.error, message: t.blood2.revealContactError });
        return;
      }
      const donorDisplayName = res.data?.name ?? p.full_name ?? t.blood2.anonymous;
      const phoneNum = res.data?.whatsapp ?? null;
      const cleanPatient = (req?.patient ?? 'our patient').replace(/\[Platelets\]/g, '').trim();
      const prefill = `Salam ${res.data?.name || p.full_name || 'Brother/Sister'}, thank you for offering to donate ${p.blood_group || 'blood'} for ${cleanPatient} at ${req?.hospital || 'the hospital'}. Where can we coordinate to meet?`;

      const handleInAppChat = async () => {
        if (!req || !user || p.donor_id === user.id) return;
        try {
          const dmRes = await openBloodDmThread(req.code, p.donor_id);
          if (!dmRes.success) {
            toast({ type: 'error', title: t.common.error, message: dmRes.error ?? 'Could not start conversation' });
            return;
          }
          navigation.navigate('MessageThread', {
            kind: 'dm',
            id: p.donor_id,
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
        title: p.blood_group ? `${p.blood_group} Donor` : 'Blood Donor',
        message: prefill,
        inAppChatAction: p.donor_id !== user?.id ? handleInAppChat : undefined,
      });
    } finally {
      setBusyContactId(null);
    }
  }

  function confirmDonated(p: Pledge) {
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to confirm donation.' });
      return;
    }
    Alert.alert(
      t.blood2.confirmDonatedTitle,
      t.blood2.confirmDonatedBody(p.full_name ?? t.blood2.anonymous),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.blood2.confirmDonatedConfirm,
          onPress: async () => {
            setBusyId(p.donor_id);
            const res = await confirmDonation(requestId, p.donor_id);
            setBusyId(null);
            if (!res.ok) {
              toast({ type: 'error', title: t.common.error, message: res.error });
              return;
            }
            toast({ type: 'success', title: t.blood2.confirmedTitle, message: t.blood2.confirmedBody });
            load();
          },
        },
      ],
    );
  }

  function markFulfilled() {
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to mark request fulfilled.' });
      return;
    }
    Alert.alert(t.blood2.markFulfilledTitle, t.blood2.markFulfilledBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.blood2.markFulfilledConfirm,
        onPress: async () => {
          setFulfilling(true);
          try {
            // RLS blood_req_update lets the requester update their own row.
            const res = await markRequestFulfilled(requestId);
            if (!res.ok) { toast({ type: 'error', title: t.common.error, message: res.error }); return; }
            if (user?.id) {
              await Promise.all([
                removeCache(CacheKeys.BLOOD_FEED(user.id)),
                removeCache(CacheKeys.HOME_STATUS(user.id)),
              ]);
            }
            toast({ type: 'success', title: t.blood2.fulfilledTitle, message: t.blood2.fulfilledBody });
            navigation.goBack();
          } finally {
            setFulfilling(false);
          }
        },
      },
    ]);
  }

  if (loading && !req) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.blood2.responders} onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

  if (loadFailed && !req) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.blood2.responders} onBack={() => navigation.goBack()} />
        <LoadError onRetry={load} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.blood2.responders} onBack={() => navigation.goBack()} />
      <OfflineBanner
        visible={isOffline}
        message="Showing cached blood request details. Connect to internet to confirm donation or mark fulfilled."
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {req && (() => {
          const meta = parseBloodRequestMeta(req.patient, req.hospital, req.units);
          const relativeTime = req.created_at ? formatRelativeTime(req.created_at) : '';
          const unitsLeft = Math.max(0, meta.unitCount - pledges.length);
          return (
            <View
              style={[
                styles.reqCard,
                {
                  backgroundColor: C.surface,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : C.border,
                },
              ]}
            >
              {/* Top Row: Blood Group Badge + Patient / Affiliation / Time */}
              <View style={styles.cardHeaderRow}>
                <RequestBloodBadge group={req.blood_group} isPlatelet={meta.isPlatelet} />

                <View style={styles.cardHeaderCenter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text
                      style={[styles.patientNameTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                      numberOfLines={1}
                    >
                      {meta.patientName}
                    </Text>
                    {meta.affiliation && (
                      <StatusBadge
                        variant="affiliation"
                        value={meta.affiliation}
                        size="sm"
                      />
                    )}
                  </View>

                  {relativeTime ? (
                    <View style={styles.timeRow}>
                      <Feather name="clock" size={11} color={C.textMuted} />
                      <Text style={[styles.timeTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                        Posted {relativeTime}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Urgency */}
                <StatusBadge
                  variant="urgency"
                  value={req.urgency}
                  size="sm"
                  pulse={req.urgency === 'Urgent'}
                />
              </View>

              {/* Clinical Details: Bags Needed + Case Reason + Platelets */}
              <View style={styles.clinicalBadgesRow}>
                <StatusBadge
                  variant="bags"
                  count={meta.unitCount}
                  size="sm"
                />

                {meta.medicalReason && (
                  <StatusBadge
                    variant="medical"
                    value={meta.medicalReason}
                    size="sm"
                  />
                )}

                {meta.isPlatelet && (
                  <StatusBadge
                    variant="platelet"
                    size="sm"
                  />
                )}
              </View>

              {/* Location & Hospital Box */}
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
                  <Text style={[styles.hospitalTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>
                    {req.hospital}
                  </Text>
                </View>

                <View style={[styles.locationLine, { marginTop: 6 }]}>
                  <View style={[styles.locIconSquare, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : C.surface }]}>
                    <Icon name="pin" size={11} color={C.textMuted} />
                  </View>
                  <Text style={[styles.areaTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    {req.area ? `${req.area}, Dhaka` : 'Dhaka, Bangladesh'}
                  </Text>
                </View>
              </View>

              {/* Pledge Progress / Status Row */}
              <View
                style={[
                  styles.pledgeStatusBox,
                  pledges.length > 0
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
                  name={pledges.length > 0 ? (unitsLeft === 0 ? 'check-circle' : 'heart') : 'users'}
                  size={13}
                  color={pledges.length > 0 ? (unitsLeft === 0 ? C.success : SectorColors.blood) : C.textMuted}
                />
                <Text
                  style={[
                    styles.pledgeStatusTxt,
                    {
                      color: pledges.length > 0 ? (unitsLeft === 0 ? C.success : (isDark ? '#fff' : SectorColors.blood)) : C.textMuted,
                      fontFamily: pledges.length > 0 ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                >
                  {pledges.length > 0
                    ? unitsLeft === 0
                      ? `${pledges.length} ${pledges.length === 1 ? 'donor offered help' : 'donors offered help'} · All ${meta.unitCount} bags covered!`
                      : `${pledges.length} ${pledges.length === 1 ? 'donor offered help' : 'donors offered help'} (${pledges.length}/${meta.unitCount} bags covered · ${unitsLeft} more needed)`
                    : `${meta.unitCount} donors needed · Waiting for responses`}
                </Text>
              </View>
            </View>
          );
        })()}

        {req && !req.fulfilled_at && (
          <TouchableOpacity
            style={[styles.fulfillBtn, { borderColor: C.success, opacity: fulfilling ? 0.6 : 1 }]}
            onPress={markFulfilled}
            disabled={fulfilling}
            activeOpacity={0.85}
          >
            <Icon name="checkAll" size={16} color={C.success} />
            <Text style={[styles.fulfillTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
              {fulfilling ? '…' : t.blood2.markFulfilled}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionTitle, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
          {t.blood2.respondersCount(pledges.length)}
        </Text>

        {pledges.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: C.surface2 }]}>
              <Icon name="directory" size={26} color={C.textMuted} />
            </View>
            <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.blood2.noResponders}
            </Text>
          </View>
        ) : (
          <View style={[styles.list, { backgroundColor: C.surface, borderColor: C.border }]}>
            {pledges.map((p, i) => {
              const { eligible, daysLeft } = donorEligibility(p.last_donated);
              const done = !!p.fulfilled_at;
              return (
                <View key={p.donor_id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                  <View style={styles.row}>
                    <Avatar name={p.full_name ?? undefined} size="sm" />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {p.full_name ?? t.blood2.anonymous}{p.blood_group ? ` · ${p.blood_group}` : ''}
                      </Text>
                      <View style={[styles.pill, { backgroundColor: done ? C.successBg : eligible ? C.successBg : C.warnBg }]}>
                        <Text style={[styles.pillTxt, { color: done ? C.success : eligible ? C.success : C.warn, fontFamily: FontFamily.jakartaBold }]}>
                          {done ? t.blood2.donatedBadge : eligible ? t.blood2.eligible : t.blood2.eligibleInDays(daysLeft)}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        style={[
                          styles.contactDonorBtn,
                          {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : C.surface2,
                            borderColor: C.border,
                          },
                        ]}
                        onPress={() => revealDonorContact(p)}
                        disabled={busyContactId === p.donor_id}
                        activeOpacity={0.75}
                        accessibilityLabel="Contact donor"
                      >
                        <Feather name="phone" size={13} color={C.text} />
                      </TouchableOpacity>
                      {done ? (
                        <View style={styles.doneIconWrap}>
                          <Icon name="check" size={18} color={C.success} />
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.confirmBtn, { backgroundColor: BLOOD, opacity: busyId === p.donor_id ? 0.5 : 1 }]}
                          onPress={() => confirmDonated(p)}
                          disabled={busyId === p.donor_id}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.confirmTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                            {busyId === p.donor_id ? '…' : t.blood2.confirmDonated}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <ContactSheet
        visible={contactTarget !== null}
        onClose={() => setContactTarget(null)}
        phone={contactTarget?.phone}
        name={contactTarget?.name ?? ''}
        title={contactTarget?.title}
        whatsAppMessage={contactTarget?.message}
        inAppChatAction={contactTarget?.inAppChatAction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 14, paddingBottom: 30 } as ViewStyle,
  reqCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  } as ViewStyle,
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
  urgencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  } as ViewStyle,
  urgencyTxt: {
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
  fulfillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 13,
    borderWidth: 1.5,
    marginBottom: 20,
  } as ViewStyle,
  fulfillTxt: { fontSize: 14 } as TextStyle,
  sectionTitle: { fontSize: 12, letterSpacing: 0.5, marginBottom: 10, marginLeft: 2 } as TextStyle,
  list: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14 } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 } as ViewStyle,
  name: { fontSize: 14 } as TextStyle,
  pill: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 } as ViewStyle,
  pillTxt: { fontSize: 11 } as TextStyle,
  contactDonorBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  doneIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  confirmBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  confirmTxt: { fontSize: 12.5 } as TextStyle,
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 } as ViewStyle,
  emptyIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  emptySub: { fontSize: 13.5 } as TextStyle,
});
