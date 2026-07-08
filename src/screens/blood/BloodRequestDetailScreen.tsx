import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { donorEligibility } from '../../utils/blood';
import {
  getRequest, getResponders, confirmDonation, markRequestFulfilled, type Pledge,
} from '../../services/bloodService';

const BLOOD = SectorColors.blood;

export function BloodRequestDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();
  const { requestId } = route.params ?? {};

  const [req, setReq] = useState<any>(null);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!requestId) return;
    const [reqRes, plRes] = await Promise.all([
      getRequest(requestId),
      getResponders(requestId),
    ]);
    if (reqRes.ok && reqRes.data) setReq(reqRes.data);
    if (plRes.ok) setPledges(plRes.data);
    setLoading(false);
  }, [requestId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmDonated(p: Pledge) {
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
    Alert.alert(t.blood2.markFulfilledTitle, t.blood2.markFulfilledBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.blood2.markFulfilledConfirm,
        onPress: async () => {
          // RLS blood_req_update lets the requester update their own row.
          const res = await markRequestFulfilled(requestId);
          if (!res.ok) { toast({ type: 'error', title: t.common.error, message: res.error }); return; }
          toast({ type: 'success', title: t.blood2.fulfilledTitle, message: t.blood2.fulfilledBody });
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.blood2.responders} onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.blood2.responders} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {req && (
          <View style={[styles.reqCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.groupBadge, { backgroundColor: `${BLOOD}1e` }]}>
              <Text style={[styles.groupTxt, { color: BLOOD, fontFamily: FontFamily.jakartaExtraBold }]}>{req.blood_group}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reqPatient, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>{req.patient}</Text>
              <Text style={[styles.reqSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                {req.hospital} · {t.blood2.unitsNeeded(req.area, req.units)}
              </Text>
            </View>
          </View>
        )}

        {req && !req.fulfilled_at && (
          <TouchableOpacity
            style={[styles.fulfillBtn, { borderColor: C.success }]}
            onPress={markFulfilled}
            activeOpacity={0.85}
          >
            <Icon name="checkAll" size={16} color={C.success} />
            <Text style={[styles.fulfillTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
              {t.blood2.markFulfilled}
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
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {p.full_name ?? t.blood2.anonymous}{p.blood_group ? ` · ${p.blood_group}` : ''}
                      </Text>
                      <View style={[styles.pill, { backgroundColor: done ? C.successBg : eligible ? C.successBg : C.warnBg }]}>
                        <Text style={[styles.pillTxt, { color: done ? C.success : eligible ? C.success : C.warn, fontFamily: FontFamily.jakartaBold }]}>
                          {done ? t.blood2.donatedBadge : eligible ? t.blood2.eligible : t.blood2.eligibleInDays(daysLeft)}
                        </Text>
                      </View>
                    </View>
                    {done ? (
                      <Icon name="check" size={20} color={C.success} />
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
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 14, paddingBottom: 30 } as ViewStyle,
  reqCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 20,
  } as ViewStyle,
  groupBadge: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  groupTxt: { fontSize: 15 } as any,
  reqPatient: { fontSize: 15 } as any,
  reqSub: { fontSize: 12.5, marginTop: 2 } as any,
  fulfillBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 46, borderRadius: 13, borderWidth: 1.5, marginBottom: 20 } as ViewStyle,
  fulfillTxt: { fontSize: 14 } as any,
  sectionTitle: { fontSize: 12, letterSpacing: 0.5, marginBottom: 10, marginLeft: 2 } as any,
  list: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14 } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 } as ViewStyle,
  name: { fontSize: 14 } as any,
  pill: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 } as ViewStyle,
  pillTxt: { fontSize: 11 } as any,
  confirmBtn: { borderRadius: 10, paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  confirmTxt: { fontSize: 12.5 } as any,
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 } as ViewStyle,
  emptyIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  emptySub: { fontSize: 13.5 } as any,
});
