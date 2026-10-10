// Read-only public profile for another student, opened from the Directory.
// Contact details (email / WhatsApp) are unlocked only when the two students
// are mutually connected. Uses ContactSheet for dialer, WhatsApp, and email actions.

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { useMessages } from '../../store/messagesStore';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ContactSheet } from '../../components/ui/ContactSheet';
import { useToast } from '../../components/ui/Toast';
import {
  connectErrorKey,
  sendConnectionRequest,
  cancelConnectionRequest,
  respondConnection,
  disconnectStudent,
  fetchStudentProfileDetail,
} from '../../services/connectionsService';
import { FontFamily, Layout, Accent, SectorColors, pillBg } from '../../theme';

export type ConnState = 'none' | 'requested' | 'incoming' | 'connected';

export interface DirectoryStudent {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  department?: string | null;
  program?: string | null;
  intake?: string | null;
  section?: string | null;
  blood_group?: string | null;
  student_id?: string | null;
  is_cr?: boolean;
  email?: string | null;
  whatsapp?: string | null;
  connState: ConnState;
}

const STATUS_MAP: Record<string, ConnState> = {
  accepted: 'connected',
  pending_outgoing: 'requested',
  pending_incoming: 'incoming',
  none: 'none',
};

export function StudentProfileScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();
  const { reload: reloadMessages } = useMessages();

  const initial: DirectoryStudent | undefined = route.params?.student;
  const targetId: string | undefined = initial?.id ?? route.params?.studentId ?? route.params?.id;

  const [student, setStudent] = useState<DirectoryStudent | null>(initial ?? null);
  const [loading, setLoading] = useState<boolean>(!initial && !!targetId);
  const [isOffline, setIsOffline] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Single-profile lookup RPC - fast, lightweight, and bandwidth-efficient
  const refresh = useCallback(async () => {
    if (!targetId) return;
    try {
      const res = await fetchStudentProfileDetail(targetId);
      if (res.ok && res.data) {
        setIsOffline(false);
        setStudent({
          ...res.data,
          connState: STATUS_MAP[res.data.status] ?? 'none',
        });
      } else {
        if (!res.ok) setIsOffline(true);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleConnect() {
    if (!user || !student || busy) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to send connection request.' });
      return;
    }
    setBusy(true);
    const res = await sendConnectionRequest(student.id);
    setBusy(false);
    if (!res.ok) {
      toast({ type: 'error', title: t.common.error, message: t.directory2[connectErrorKey(res.error)] });
      await refresh();
      return;
    }
    setStudent(s => (s ? { ...s, connState: 'requested' } : null));
    toast({ type: 'success', title: t.directory2.requestSent });
  }

  async function handleCancelRequest() {
    if (!user || !student || busy) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to cancel connection request.' });
      return;
    }
    setBusy(true);
    const res = await cancelConnectionRequest(student.id);
    setBusy(false);
    if (!res.ok) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      await refresh();
      return;
    }
    setStudent(s => (s ? { ...s, connState: 'none' } : null));
    toast({ type: 'info', title: t.directory2.requestCancelled });
  }

  async function handleRespond(accept: boolean) {
    if (!user || !student || busy) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to manage connection requests.' });
      return;
    }
    setBusy(true);
    const res = await respondConnection(student.id, accept);
    setBusy(false);
    if (!res.ok) {
      toast({ type: 'error', title: t.common.error, message: res.error });
      await refresh();
      return;
    }
    if (accept) {
      setStudent(s => (s ? { ...s, connState: 'connected' } : null));
      reloadMessages();
      toast({ type: 'success', title: t.directory2.connected });
    } else {
      setStudent(s => (s ? { ...s, connState: 'none' } : null));
      toast({ type: 'info', title: t.directory2.declined });
    }
    refresh();
  }

  function confirmDisconnect() {
    if (!student) return;
    if (isOffline) {
      toast({ type: 'info', title: 'Offline Mode', message: 'Internet connection required to disconnect.' });
      return;
    }
    Alert.alert(
      t.directory2.disconnectTitle,
      t.directory2.disconnectConfirm(student.full_name),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.directory2.disconnect,
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const res = await disconnectStudent(student.id);
            setBusy(false);
            if (!res.ok) {
              toast({ type: 'error', title: t.common.error, message: res.error });
              return;
            }
            setStudent(s => (s ? { ...s, connState: 'none', email: null, whatsapp: null } : null));
            reloadMessages();
            toast({ type: 'info', title: t.directory2.disconnected });
            refresh();
          },
        },
      ]
    );
  }

  if (loading && !student) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.sectors.directory} onBack={() => navigation.goBack()} />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="small" color={C.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.sectors.directory} onBack={() => navigation.goBack()} />
        <View style={styles.centerLoading}>
          <Icon name="directory" size={36} color={C.textMuted} />
          <Text style={[styles.notFoundTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            Student Not Found
          </Text>
          <Text style={[styles.notFoundSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            This student's profile is hidden or no longer available.
          </Text>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: C.brand }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={[styles.backBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const metaParts = [student.department, student.intake ? `Intake ${student.intake}` : null, student.section ? `Sec ${student.section}` : null]
    .filter(Boolean)
    .join(' · ');

  const connected = student.connState === 'connected';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={student.full_name} onBack={() => navigation.goBack()} />
      <OfflineBanner
        visible={isOffline}
        message="You are offline. Showing cached student details."
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Identity Hero Card */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.heroRow}>
            <Avatar uri={student.avatar_url} name={student.full_name} size="xl" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {student.full_name}
              </Text>

              {metaParts.length > 0 && (
                <Text style={[styles.meta, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={2}>
                  {metaParts}
                </Text>
              )}

              {connected && student.student_id ? (
                <Text style={[styles.studentIdTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.directory2.studentId}: {student.student_id}
                </Text>
              ) : null}

              {/* Varsity Badges (CR, Blood Group) */}
              <View style={styles.badgeRow}>
                {student.is_cr ? (
                  <View style={[styles.crBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                    <Icon name="award" size={12} color="#b45309" />
                    <Text style={[styles.crBadgeTxt, { color: '#b45309', fontFamily: FontFamily.jakartaBold }]}>
                      {t.directory2.classRep}
                    </Text>
                  </View>
                ) : null}

                {student.blood_group ? (
                  <View style={[styles.bloodBadge, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                    <Icon name="blood" size={11} color="#b91c1c" />
                    <Text style={[styles.bloodBadgeTxt, { color: '#b91c1c', fontFamily: FontFamily.jakartaBold }]}>
                      {student.blood_group}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Connection Actions Container */}
          <View style={styles.connArea}>
            {student.connState === 'connected' && (
              <View style={styles.connectedRow}>
                <View style={[styles.statePill, { backgroundColor: pillBg(Accent.teal, isDark) }]}>
                  <View style={[styles.stateDot, { backgroundColor: Accent.teal }]} />
                  <Text style={[styles.statePillTxt, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>
                    {t.directory2.connected}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.msgBtn, { backgroundColor: C.brand }]}
                  onPress={() => navigation.navigate('MessageThread', { kind: 'dm', id: student.id, title: student.full_name })}
                  activeOpacity={0.85}
                >
                  <Icon name="chat" size={15} color="#fff" />
                  <Text style={[styles.msgBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    {t.messages.startChat}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {student.connState === 'requested' && (
              <View style={styles.requestedRow}>
                <View style={[styles.statePill, { backgroundColor: C.warnBg }]}>
                  <View style={[styles.stateDot, { backgroundColor: C.warn }]} />
                  <Text style={[styles.statePillTxt, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>
                    {t.directory2.requested}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: C.border, backgroundColor: C.surface2 }]}
                  onPress={handleCancelRequest}
                  disabled={busy}
                  activeOpacity={0.7}
                >
                  <Icon name="x" size={14} color={C.text2} />
                  <Text style={[styles.cancelBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {t.directory2.cancelRequest}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {student.connState === 'none' && (
              <TouchableOpacity
                style={[styles.fullBtn, { backgroundColor: C.brand }]}
                onPress={handleConnect}
                disabled={busy}
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
                    onPress={() => handleRespond(true)}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    <Icon name="check" size={15} color="#fff" />
                    <Text style={[styles.halfBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                      {t.directory2.accept}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.halfBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                    onPress={() => handleRespond(false)}
                    disabled={busy}
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

        {/* Contact Details Card */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {t.directory2.contact}
          </Text>

          {!connected ? (
            <View style={styles.lockedArea}>
              <Icon name="shield" size={17} color={C.textMuted} />
              <Text style={[styles.lockedTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.directory2.connectToSeeContact}
              </Text>
            </View>
          ) : student.email || student.whatsapp ? (
            <View style={styles.contactDetailsArea}>
              <TouchableOpacity
                style={[styles.contactCardBtn, { backgroundColor: SectorColors.directory }]}
                onPress={() => setContactOpen(true)}
                activeOpacity={0.85}
              >
                <Icon name="phone" size={16} color="#fff" />
                <Text style={[styles.contactCardBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                  View Full Contact Options
                </Text>
              </TouchableOpacity>

              {student.email ? (
                <View style={[styles.infoRow, { backgroundColor: C.surface2, borderColor: C.border }]}>
                  <Icon name="mail" size={15} color={C.text2} />
                  <Text style={[styles.infoVal, { color: C.text, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    {student.email}
                  </Text>
                </View>
              ) : null}

              {student.whatsapp ? (
                <View style={[styles.infoRow, { backgroundColor: C.surface2, borderColor: C.border }]}>
                  <Icon name="chat" size={15} color={C.success} />
                  <Text style={[styles.infoVal, { color: C.text, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    {student.whatsapp} (WhatsApp)
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.lockedTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.directory2.noContactShared}
            </Text>
          )}
        </View>

        {/* Safety & Disconnect Option */}
        {connected && (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
            <TouchableOpacity
              style={styles.disconnectBtn}
              onPress={confirmDisconnect}
              activeOpacity={0.7}
            >
              <Icon name="trash" size={15} color={C.danger} />
              <Text style={[styles.disconnectTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                {t.directory2.disconnect}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* Standardized ContactSheet Component (AGENTS.md 13.1) */}
      <ContactSheet
        visible={contactOpen}
        name={student.full_name}
        roleSubtitle={metaParts}
        avatarUri={student.avatar_url}
        phone={student.whatsapp}
        email={student.email}
        inAppChatAction={() => {
          setContactOpen(false);
          navigation.navigate('MessageThread', { kind: 'dm', id: student.id, title: student.full_name });
        }}
        onClose={() => setContactOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 24 } as ViewStyle,

  card: { borderRadius: 16, borderWidth: 1, padding: 15 } as ViewStyle,
  cardTitle: { fontSize: 14 } as TextStyle,

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 } as ViewStyle,
  name: { fontSize: 18, letterSpacing: -0.01 } as TextStyle,
  meta: { fontSize: 13, marginTop: 3 } as TextStyle,
  studentIdTxt: { fontSize: 12, marginTop: 2 } as TextStyle,

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 } as ViewStyle,
  crBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, borderWidth: 1,
  } as ViewStyle,
  crBadgeTxt: { fontSize: 11 } as TextStyle,
  bloodBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, borderWidth: 1,
  } as ViewStyle,
  bloodBadgeTxt: { fontSize: 11 } as TextStyle,

  connArea: { marginTop: 14 } as ViewStyle,
  statePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20,
  } as ViewStyle,
  stateDot: { width: 7, height: 7, borderRadius: 3.5 } as ViewStyle,
  statePillTxt: { fontSize: 12.5 } as TextStyle,

  connectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 } as ViewStyle,
  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12,
  } as ViewStyle,
  msgBtnTxt: { fontSize: 13 } as TextStyle,

  requestedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 } as ViewStyle,
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  } as ViewStyle,
  cancelBtnTxt: { fontSize: 12 } as TextStyle,

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

  lockedArea: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 } as ViewStyle,
  lockedTxt: { fontSize: 12.5, lineHeight: 18 } as TextStyle,

  contactDetailsArea: { marginTop: 11, gap: 8 } as ViewStyle,
  contactCardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 44, borderRadius: 12, marginBottom: 2,
  } as ViewStyle,
  contactCardBtnTxt: { fontSize: 13.5 } as TextStyle,

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  } as ViewStyle,
  infoVal: { fontSize: 13, flex: 1 } as TextStyle,

  disconnectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 4 } as ViewStyle,
  disconnectTxt: { fontSize: 13 } as TextStyle,

  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  } as ViewStyle,
  notFoundTitle: { fontSize: 16, marginTop: 8 } as TextStyle,
  notFoundSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 } as TextStyle,
  backBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  } as ViewStyle,
  backBtnTxt: { fontSize: 13 } as TextStyle,
});
