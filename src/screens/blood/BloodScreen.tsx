import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Alert, type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { localToday } from '../../utils/format';
import { donorEligibility } from '../../utils/blood';
import type { BloodRequest, Donor } from '../../types/database';

type Tab = 'requests' | 'donors';

const BLOOD_COLOR = SectorColors.blood;
const BLOOD_BG    = `${SectorColors.blood}1e`;

// Urgency tones from theme tokens (dark-mode aware via C)
function urgencyTone(C: any, urgency: string): { fg: string; bg: string } {
  switch (urgency) {
    case 'Urgent': return { fg: C.danger, bg: C.dangerBg };
    case 'Today':  return { fg: C.warn,   bg: C.warnBg };
    default:       return { fg: Accent.slate, bg: Accent.grayBg };
  }
}

function GroupBadge({ group, size = 46 }: { group: string; size?: number }) {
  return (
    <View style={[styles.groupBadge, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <Text style={[styles.groupText, { fontSize: size * 0.34, color: BLOOD_COLOR, fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
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
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donors, setDonors]     = useState<Donor[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Hide fulfilled requests and age out stale ones (nothing auto-expires them
    // server-side, so an abandoned request shouldn't linger in the feed forever).
    const staleCutoff = new Date(Date.now() - 21 * 86400000).toISOString();
    const [rRes, dRes, pRes] = await Promise.all([
      supabase.from('blood_requests').select('*')
        .is('fulfilled_at', null)
        .gte('created_at', staleCutoff)
        .order('created_at', { ascending: false }).limit(30),
      supabase.from('donors').select('*, profiles:profiles!user_id(full_name)').limit(50),
      supabase.from('blood_pledges').select('request_id').eq('donor_id', user?.id ?? ''),
    ]);
    if (rRes.data) setRequests(rRes.data as BloodRequest[]);
    if (dRes.data) setDonors(dRes.data as any);
    if (pRes.data) setRespondedIds(new Set(pRes.data.map((p: any) => p.request_id)));
  }, [user?.id]);

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
      const { data, error } = await supabase.rpc('donor_contact', { p_user_id: donorUserId });
      if (error) {
        toast({ type: 'error', title: t.common.error, message: t.blood2.revealContactError });
        return;
      }
      // donor_contact returns json: { whatsapp }; use the name we already have.
      const row = (Array.isArray(data) ? data[0] : data) as { whatsapp?: string | null } | null;
      const contact = row?.whatsapp ?? t.blood2.notShared;
      Alert.alert(donorName ?? t.blood2.contact, String(contact));
    } finally {
      setBusyId(null);
    }
  }

  // Pledged donors may see the requester's contact (consent-by-posting)
  async function revealRequester(r: BloodRequest) {
    if (!user || busyId) return;
    setBusyId(r.id);
    try {
      const { data, error } = await supabase.rpc('blood_requester_contact', { p_code: r.code });
      if (error) {
        toast({ type: 'error', title: t.common.error, message: t.blood2.revealContactError });
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { toast({ type: 'info', title: t.blood2.notAvailable, message: t.blood2.contactDonorsOnly }); return; }
      Alert.alert(row.name ?? t.blood2.requester, row.whatsapp ?? t.blood2.noWhatsapp);
    } finally {
      setBusyId(null);
    }
  }

  // Donor stamps their own last-donation date (RLS lets a donor update their
  // own row). Resets their 90-day eligibility clock.
  function markDonatedToday() {
    Alert.alert(t.blood2.markDonatedTitle, t.blood2.markDonatedBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.blood2.markDonatedConfirm,
        onPress: async () => {
          if (!user) return;
          const { error } = await supabase
            .from('donors')
            .update({ last_donated: localToday() })
            .eq('user_id', user.id);
          if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
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
            const { error } = await supabase.from('blood_pledges').insert({
              request_id: r.id,
              donor_id:   user.id,
            });
            if (error) {
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

  // Group donors by blood type
  const donorGroups: Record<string, number> = {};
  donors.forEach(d => { donorGroups[d.blood_group] = (donorGroups[d.blood_group] ?? 0) + 1; });
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];


  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.blood2.bloodDonation} onBack={() => navigation.goBack()} />

      {/* Action buttons + tabs */}
      <View style={[styles.actRow, { paddingHorizontal: Layout.screenPadding }]}>
        <TouchableOpacity
          style={[styles.actBtn, { backgroundColor: C.brand }]}
          onPress={() => navigation.navigate('BloodRequest')}
          activeOpacity={0.85}
        >
          <Icon name="blood" size={15} color="#fff" />
          <Text style={[styles.actBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{t.blood2.requestBloodBtn}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}
          onPress={() => navigation.navigate('DonorRegister')}
          activeOpacity={0.85}
        >
          <Icon name="plus" size={15} color={C.text} />
          <Text style={[styles.actBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.blood2.registerAsDonorBtn}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.chips, { paddingHorizontal: Layout.screenPadding }]}>
        {(['requests', 'donors'] as Tab[]).map(tb => (
          <TouchableOpacity
            key={tb}
            style={[styles.chip, tab === tb ? { backgroundColor: C.brand, borderColor: C.brand } : { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setTab(tb)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipTxt, { color: tab === tb ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {tb === 'requests' ? t.blood2.requestsTab : t.blood2.donorsTab}
            </Text>
            <Text style={[styles.chipCount, { color: tab === tb ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {tb === 'requests' ? requests.length : donors.length}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Blood group filter */}
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
                ? { backgroundColor: C.danger, borderColor: C.danger }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setGroupFilter(g)}
              activeOpacity={0.75}
            >
              <Text style={[styles.groupChipTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {g}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {tab === 'requests' ? (
          <View style={styles.list}>
            {requests.filter(r => groupFilter === 'All' || r.blood_group === groupFilter).map(r => {
              const { fg, bg } = urgencyTone(C, r.urgency);
              return (
                <View key={r.id} style={[styles.reqCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.reqTop}>
                    <GroupBadge group={r.blood_group} />
                    <View style={styles.reqBody}>
                      <Text style={[styles.reqTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {r.patient}
                      </Text>
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
            })}
          </View>
        ) : (
          <View>
            {/* Blood type summary */}
            <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.summaryTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {t.blood2.availableDonors}
              </Text>
              <View style={styles.summaryGrid}>
                {bloodTypes.map(g => (
                  <View key={g} style={[styles.summaryCell, { backgroundColor: C.surface2 }]}>
                    <Text style={[styles.summaryCellGroup, { color: BLOOD_COLOR }]}>{g}</Text>
                    <Text style={[styles.summaryCellNum, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                      {donorGroups[g] ?? 0}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Donor list */}
            <View style={[styles.donorList, { backgroundColor: C.surface, borderColor: C.border }]}>
              {donors.filter(d => groupFilter === 'All' || d.blood_group === groupFilter).map((d, i) => {
                const { eligible, daysLeft } = donorEligibility(d.last_donated);
                const isMe = d.user_id === user?.id;
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
              );})}
            </View>
          </View>
        )}
        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  actRow: { flexDirection: 'row', gap: 8, paddingTop: 8, paddingBottom: 4 } as ViewStyle,
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 12 } as ViewStyle,
  actBtnTxt: { fontSize: 13 } as any,
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 8 } as ViewStyle,
  groupChips: { flexDirection: 'row', gap: 6, paddingBottom: 8 } as ViewStyle,
  groupChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  groupChipTxt: { fontSize: 11.5 } as any,
  eligPill: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999, marginTop: 4 } as ViewStyle,
  eligTxt: { fontSize: 10 } as any,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  chipTxt: { fontSize: 12.5 } as any,
  chipCount: { fontSize: 12 } as any,
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
  summaryCellGroup: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold' } as any,
  summaryCellNum: { fontSize: 15, marginTop: 2 } as any,
  donorList: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  donorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 } as ViewStyle,
  donorName: { fontSize: 14 } as any,
  donorMeta: { fontSize: 12, marginTop: 2 } as any,
  contactBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 } as ViewStyle,
  contactTxt: { fontSize: 11 } as any,
});
