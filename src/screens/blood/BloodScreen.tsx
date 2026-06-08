// Matches design screens-a.jsx — Blood (requests + donors tabs)
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { BloodRequest, Donor } from '../../types/database';

type Tab = 'requests' | 'donors';

const URGENCY_COLOR = { Urgent: '#e2483d', Today: '#b9760a', 'This week': '#5b6b86' };
const URGENCY_BG    = { Urgent: '#fbe7e5', Today: '#fbefdb', 'This week': '#f0f2f6' };
const BLOOD_COLOR   = '#c7344a';
const BLOOD_BG      = '#c7344a1e';

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
  const [tab, setTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donors, setDonors]     = useState<Donor[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [rRes, dRes] = await Promise.all([
      supabase.from('blood_requests').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('blood_donors').select('*, profiles:user_id(full_name)').limit(50),
    ]);
    if (rRes.data) setRequests(rRes.data as BloodRequest[]);
    if (dRes.data) setDonors(dRes.data as any);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Group donors by blood type
  const donorGroups: Record<string, number> = {};
  donors.forEach(d => { donorGroups[d.blood_group] = (donorGroups[d.blood_group] ?? 0) + 1; });
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Blood Donation" onBack={() => navigation.goBack()} />

      {/* Action buttons + tabs */}
      <View style={[styles.actRow, { paddingHorizontal: Layout.screenPadding }]}>
        <TouchableOpacity
          style={[styles.actBtn, { backgroundColor: C.brand }]}
          onPress={() => navigation.navigate('BloodRequest')}
          activeOpacity={0.85}
        >
          <Icon name="blood" size={15} color="#fff" />
          <Text style={[styles.actBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>Request blood</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}
          onPress={() => navigation.navigate('DonorRegister')}
          activeOpacity={0.85}
        >
          <Icon name="plus" size={15} color={C.text} />
          <Text style={[styles.actBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Register as donor</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.chips, { paddingHorizontal: Layout.screenPadding }]}>
        {(['requests', 'donors'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, tab === t ? { backgroundColor: C.brand, borderColor: C.brand } : { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setTab(t)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipTxt, { color: tab === t ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {t === 'requests' ? `Requests` : 'Donors'}
            </Text>
            <Text style={[styles.chipCount, { color: tab === t ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t === 'requests' ? requests.length : donors.length}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {tab === 'requests' ? (
          <View style={styles.list}>
            {requests.map(r => {
              const fg = (URGENCY_COLOR as Record<string,string>)[r.urgency] ?? '#5b6b86';
              const bg = (URGENCY_BG as Record<string,string>)[r.urgency] ?? '#f0f2f6';
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
                      {r.area} · {r.units} unit{r.units !== 1 ? 's' : ''} needed
                    </Text>
                  </View>
                  <TouchableOpacity style={[styles.pledgeBtn, { backgroundColor: BLOOD_BG }]} onPress={() => Alert.alert('Thank you!', 'Your pledge has been recorded.')} activeOpacity={0.75}>
                    <Icon name="blood" size={16} color={BLOOD_COLOR} />
                    <Text style={[styles.pledgeTxt, { color: BLOOD_COLOR, fontFamily: FontFamily.jakartaBold }]}>Pledge to donate</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : (
          <View>
            {/* Blood type summary */}
            <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.summaryTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                Available Donors
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
              {donors.map((d, i) => (
                <View key={d.user_id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                  <View style={styles.donorRow}>
                    <Avatar name={(d as any).profiles?.full_name} size="sm" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.donorName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {(d as any).profiles?.full_name ?? 'Anonymous'}
                      </Text>
                      <Text style={[styles.donorMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                        {d.area} · Last: {d.last_donated ?? 'Never'}
                      </Text>
                    </View>
                    <GroupBadge group={d.blood_group} size={34} />
                  </View>
                </View>
              ))}
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
});
