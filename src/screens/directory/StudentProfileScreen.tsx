// Read-only public profile for another student, opened from the Directory.
// Mirrors the directory's privacy model: contact (email / WhatsApp) is shown
// only when the two students are connected. Connection actions reuse the same
// connections-table logic as DirectoryScreen and are gated by RLS.
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Linking, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';

export type ConnState = 'none' | 'requested' | 'incoming' | 'connected';

export interface DirectoryStudent {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  department?: string | null;
  intake?: string | null;
  section?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  connState: ConnState;
}

// RPC status_label → local connState
const STATUS_MAP: Record<string, ConnState> = {
  accepted: 'connected',
  pending_outgoing: 'requested',
  pending_incoming: 'incoming',
  none: 'none',
};

export function StudentProfileScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const { user } = useAuth();

  const initial: DirectoryStudent = route.params?.student;
  const [student, setStudent] = useState<DirectoryStudent>(initial);

  // Refetch fresh status + contact (email/whatsapp appear only once connected).
  const refresh = useCallback(async () => {
    if (!initial?.id) return;
    const { data } = await supabase.rpc('student_directory');
    const row = (data ?? []).find((p: any) => p.id === initial.id);
    if (row) {
      setStudent({
        ...row,
        connState: STATUS_MAP[row.status as string] ?? 'none',
      });
    }
  }, [initial?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleConn(action: 'connect' | 'accept' | 'decline') {
    if (!user || !student) return;
    if (action === 'connect') {
      const { error } = await supabase.from('connections').insert({ requester_id: user.id, addressee_id: student.id, status: 'pending' });
      if (error) { await refresh(); return; }
      setStudent(s => ({ ...s, connState: 'requested' }));
    } else if (action === 'accept') {
      const { error } = await supabase.from('connections').update({ status: 'accepted' })
        .eq('requester_id', student.id).eq('addressee_id', user.id);
      if (error) { await refresh(); return; }
      setStudent(s => ({ ...s, connState: 'connected' }));
    } else {
      const { error } = await supabase.from('connections').delete()
        .eq('requester_id', student.id).eq('addressee_id', user.id);
      if (error) { await refresh(); return; }
      setStudent(s => ({ ...s, connState: 'none' }));
    }
    // Pull fresh contact details once the connection state settles.
    refresh();
  }

  if (!student) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.sectors.directory} onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const meta = [student.department, student.intake, student.section]
    .map(v => (v ?? '').trim())
    .filter(Boolean)
    .join(' · ');
  const connected = student.connState === 'connected';
  const waDigits = (student.whatsapp ?? '').replace(/[^0-9]/g, '');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={student.full_name} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.headRow}>
            <Avatar uri={student.avatar_url} name={student.full_name} size="xl" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {student.full_name}
              </Text>
              {meta.length > 0 && (
                <Text style={[styles.meta, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={2}>
                  {meta}
                </Text>
              )}
            </View>
          </View>

          {/* Connection state / action */}
          <View style={styles.connArea}>
            {student.connState === 'connected' && (
              <View style={[styles.statePill, { backgroundColor: Accent.tealBg }]}>
                <View style={[styles.stateDot, { backgroundColor: Accent.teal }]} />
                <Text style={[styles.statePillTxt, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>
                  {t.directory2.connected}
                </Text>
              </View>
            )}
            {student.connState === 'requested' && (
              <View style={[styles.statePill, { backgroundColor: C.warnBg }]}>
                <View style={[styles.stateDot, { backgroundColor: C.warn }]} />
                <Text style={[styles.statePillTxt, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>
                  {t.directory2.requested}
                </Text>
              </View>
            )}
            {student.connState === 'none' && (
              <TouchableOpacity
                style={[styles.fullBtn, { backgroundColor: C.brand }]}
                onPress={() => handleConn('connect')}
                activeOpacity={0.85}
              >
                <Icon name="userPlus" size={16} color="#fff" />
                <Text style={[styles.fullBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                  {t.directory2.connect}
                </Text>
              </TouchableOpacity>
            )}
            {student.connState === 'incoming' && (
              <>
                <Text style={[styles.wants, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {t.directory2.wantsToConnect}
                </Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.halfBtn, { backgroundColor: C.brand }]}
                    onPress={() => handleConn('accept')}
                    activeOpacity={0.85}
                  >
                    <Icon name="check" size={15} color="#fff" />
                    <Text style={[styles.halfBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                      {t.directory2.accept}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.halfBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                    onPress={() => handleConn('decline')}
                    activeOpacity={0.85}
                  >
                    <Icon name="x" size={15} color={C.text} />
                    <Text style={[styles.halfBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {t.directory2.decline}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Contact — only when connected */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {t.directory2.contact}
          </Text>

          {!connected ? (
            <Text style={[styles.lockedTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.directory2.connectToSeeContact}
            </Text>
          ) : student.email || waDigits.length > 0 ? (
            <>
              {student.email && (
                <>
                  <TouchableOpacity
                    style={[styles.emailBtn, { backgroundColor: Accent.blue }]}
                    onPress={() => Linking.openURL(`mailto:${student.email}`)}
                    activeOpacity={0.8}
                  >
                    <Icon name="mail" size={15} color="#fff" />
                    <Text style={[styles.emailBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                      {t.directory2.email}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.emailAddr, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {student.email}
                  </Text>
                </>
              )}
              {waDigits.length > 0 && (
                <TouchableOpacity
                  style={[styles.waBtn, { backgroundColor: C.success }]}
                  onPress={() => Linking.openURL(`https://wa.me/${waDigits}`)}
                  activeOpacity={0.8}
                >
                  <Icon name="phone" size={14} color="#fff" />
                  <Text style={[styles.waBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    {t.directory2.whatsapp}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={[styles.lockedTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.directory2.noContactShared}
            </Text>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 20 } as ViewStyle,

  card: { borderRadius: 16, borderWidth: 1, padding: 15 } as ViewStyle,
  cardTitle: { fontSize: 14 } as TextStyle,

  headRow: { flexDirection: 'row', alignItems: 'center', gap: 14 } as ViewStyle,
  name: { fontSize: 18, letterSpacing: -0.01 } as TextStyle,
  meta: { fontSize: 13, marginTop: 3 } as TextStyle,

  connArea: { marginTop: 14 } as ViewStyle,
  statePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20,
  } as ViewStyle,
  stateDot: { width: 7, height: 7, borderRadius: 3.5 } as ViewStyle,
  statePillTxt: { fontSize: 12.5 } as TextStyle,

  wants: { fontSize: 13, marginBottom: 9 } as TextStyle,
  fullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 46, borderRadius: 12,
  } as ViewStyle,
  fullBtnTxt: { fontSize: 14 } as TextStyle,

  actionRow: { flexDirection: 'row', gap: 9 } as ViewStyle,
  halfBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 42, borderRadius: 11,
  } as ViewStyle,
  halfBtnTxt: { fontSize: 13.5 } as TextStyle,

  lockedTxt: { fontSize: 12.5, lineHeight: 18, marginTop: 11 } as TextStyle,

  emailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 44, borderRadius: 12, marginTop: 11,
  } as ViewStyle,
  emailBtnTxt: { fontSize: 13.5 } as TextStyle,
  emailAddr: { fontSize: 11.5, textAlign: 'center', marginTop: 7 } as TextStyle,

  waBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 42, borderRadius: 11, marginTop: 9,
  } as ViewStyle,
  waBtnTxt: { fontSize: 13 } as TextStyle,
});
