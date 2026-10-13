// Read-only public profile for another student, opened from the Directory.
// Contact details (email / WhatsApp) are unlocked only when the two students
// are mutually connected. Uses ContactSheet for dialer, WhatsApp, and email actions.

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator,
  Linking, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { useMessages } from '../../store/messagesStore';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
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

  function handleWhatsApp(phone: string) {
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
    if (cleaned.startsWith('01')) cleaned = '880' + cleaned.slice(1);
    Linking.openURL(`https://wa.me/${cleaned}`).catch(() => {
      toast({ type: 'error', title: 'Cannot Open WhatsApp', message: 'WhatsApp is not installed on this device.' });
    });
  }

  function handlePhoneCall(phone: string) {
    const cleaned = phone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      toast({ type: 'error', title: 'Cannot Call', message: 'Dialer could not be opened.' });
    });
  }

  function handleEmail(email: string) {
    Linking.openURL(`mailto:${email}`).catch(() => {
      toast({ type: 'error', title: 'Cannot Open Mail', message: 'No email application found.' });
    });
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
                {connected ? (
                  <View style={[styles.connBadge, { backgroundColor: pillBg(Accent.teal, isDark), borderColor: isDark ? 'rgba(20, 184, 166, 0.4)' : '#99f6e4' }]}>
                    <View style={[styles.connDot, { backgroundColor: Accent.teal }]} />
                    <Text style={[styles.connBadgeTxt, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>
                      {t.directory2.connected}
                    </Text>
                  </View>
                ) : student.connState === 'requested' ? (
                  <View style={[styles.connBadge, { backgroundColor: pillBg(SectorColors.jobs, isDark), borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a' }]}>
                    <View style={[styles.connDot, { backgroundColor: C.warn }]} />
                    <Text style={[styles.connBadgeTxt, { color: isDark ? '#fbbf24' : '#b45309', fontFamily: FontFamily.jakartaBold }]}>
                      {t.directory2.requested}
                    </Text>
                  </View>
                ) : student.connState === 'incoming' ? (
                  <View style={[styles.connBadge, { backgroundColor: pillBg(SectorColors.directory, isDark), borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : '#bfdbfe' }]}>
                    <View style={[styles.connDot, { backgroundColor: C.brand }]} />
                    <Text style={[styles.connBadgeTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                      {t.directory2.wantsToConnect}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
            {connected ? 'CONTACT & DIRECT ACTIONS' : 'CONTACT PRIVACY'}
          </Text>
        </View>

        {/* When MUTUALLY CONNECTED: Standardized 72dp Action Bars */}
        {connected ? (
          <View style={styles.actionCardsCol}>
            {/* 1. CampusOne Chat Bar (72dp) */}
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => navigation.navigate('MessageThread', { kind: 'dm', id: student.id, title: student.full_name })}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconBox, { backgroundColor: isDark ? 'rgba(91, 133, 247, 0.18)' : '#eff6ff' }]}>
                <AnimatedIcon family="feather" name="message-circle" size={22} color={C.brand} animation="spring" />
              </View>
              <View style={styles.actionCardContent}>
                <Text style={[styles.actionCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  CampusOne Chat
                </Text>
                <Text style={[styles.actionCardDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                  {`Direct in-app messaging with ${student.full_name.split(' ')[0]}`}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={C.textMuted} />
            </TouchableOpacity>

            {/* 2. WhatsApp Bar (72dp) */}
            {student.whatsapp ? (
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => handleWhatsApp(student.whatsapp!)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIconBox, { backgroundColor: isDark ? 'rgba(37, 211, 102, 0.18)' : '#f0fdf4' }]}>
                  <AnimatedIcon family="feather" name="message-square" size={22} color="#25D366" animation="spring" />
                </View>
                <View style={styles.actionCardContent}>
                  <Text style={[styles.actionCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Chat on WhatsApp
                  </Text>
                  <Text style={[styles.actionCardDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    {`${student.whatsapp} · Tap to open WhatsApp`}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={C.textMuted} />
              </TouchableOpacity>
            ) : null}

            {/* 3. Call Phone Bar (72dp) */}
            {student.whatsapp ? (
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => handlePhoneCall(student.whatsapp!)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5' }]}>
                  <AnimatedIcon family="feather" name="phone-call" size={22} color="#10B981" animation="spring" />
                </View>
                <View style={styles.actionCardContent}>
                  <Text style={[styles.actionCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Call Phone
                  </Text>
                  <Text style={[styles.actionCardDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    {`${student.whatsapp} · Direct mobile call`}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={C.textMuted} />
              </TouchableOpacity>
            ) : null}

            {/* 4. Send Email Bar (72dp) */}
            {student.email ? (
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => handleEmail(student.email!)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIconBox, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.18)' : '#f5f3ff' }]}>
                  <AnimatedIcon family="feather" name="mail" size={22} color="#8B5CF6" animation="spring" />
                </View>
                <View style={styles.actionCardContent}>
                  <Text style={[styles.actionCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Send Email
                  </Text>
                  <Text style={[styles.actionCardDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    {`${student.email} · Tap to compose`}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={C.textMuted} />
              </TouchableOpacity>
            ) : null}

            {!student.whatsapp && !student.email && (
              <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={[styles.actionIconBox, { backgroundColor: C.surface2 }]}>
                  <AnimatedIcon family="feather" name="info" size={22} color={C.textMuted} animation="none" />
                </View>
                <View style={styles.actionCardContent}>
                  <Text style={[styles.actionCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    No External Contacts
                  </Text>
                  <Text style={[styles.actionCardDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                    Use CampusOne Chat above to contact this student
                  </Text>
                </View>
              </View>
            )}

            {/* Safety Disconnect Option */}
            <TouchableOpacity
              style={[
                styles.disconnectBtn,
                {
                  borderColor: isDark ? 'rgba(248, 113, 113, 0.35)' : '#fca5a5',
                  backgroundColor: isDark ? 'rgba(248, 113, 113, 0.08)' : '#fef2f2',
                },
              ]}
              onPress={confirmDisconnect}
              activeOpacity={0.75}
            >
              <Icon name="trash" size={15} color={C.danger} />
              <Text style={[styles.disconnectTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                {t.directory2.disconnect}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* When NOT CONNECTED: 72dp Dynamic Status/Privacy Card + 58dp Action Control */
          <View style={styles.actionCardsCol}>
            {student.connState === 'requested' && (
              <>
                <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={[styles.actionIconBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7' }]}>
                    <AnimatedIcon family="feather" name="clock" size={22} color={isDark ? '#fbbf24' : '#d97706'} animation="pulse" />
                  </View>
                  <View style={styles.actionCardContent}>
                    <Text style={[styles.actionCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      Connection Request Pending
                    </Text>
                    <Text style={[styles.actionCardDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {`Waiting for ${student.full_name.split(' ')[0]} to accept request`}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.actionControlBtn,
                    {
                      borderColor: isDark ? 'rgba(248, 113, 113, 0.4)' : '#fca5a5',
                      backgroundColor: isDark ? 'rgba(248, 113, 113, 0.08)' : '#fef2f2',
                    },
                  ]}
                  onPress={handleCancelRequest}
                  disabled={busy}
                  activeOpacity={0.75}
                >
                  <Icon name="x" size={16} color={C.danger} />
                  <Text style={[styles.actionControlBtnTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                    {t.directory2.cancelRequest}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {student.connState === 'none' && (
              <>
                <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={[styles.actionIconBox, { backgroundColor: isDark ? 'rgba(91, 133, 247, 0.18)' : '#eff6ff' }]}>
                    <AnimatedIcon family="feather" name="shield" size={22} color={C.brand} animation="float" />
                  </View>
                  <View style={styles.actionCardContent}>
                    <Text style={[styles.actionCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      Contact Details Protected
                    </Text>
                    <Text style={[styles.actionCardDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {t.directory2.connectToSeeContact}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.actionControlBtn, { backgroundColor: C.brand }]}
                  onPress={handleConnect}
                  disabled={busy}
                  activeOpacity={0.85}
                >
                  <AnimatedIcon family="feather" name="user-plus" size={18} color="#fff" animation="spring" />
                  <Text style={[styles.actionControlBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    {t.directory2.connect}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {student.connState === 'incoming' && (
              <>
                <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={[styles.actionIconBox, { backgroundColor: isDark ? 'rgba(91, 133, 247, 0.18)' : '#eff6ff' }]}>
                    <AnimatedIcon family="feather" name="user-check" size={22} color={C.brand} animation="spring" />
                  </View>
                  <View style={styles.actionCardContent}>
                    <Text style={[styles.actionCardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {t.directory2.wantsToConnect}
                    </Text>
                    <Text style={[styles.actionCardDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      {`Accept request to start direct messaging`}
                    </Text>
                  </View>
                </View>

                <View style={styles.dualActionRow}>
                  <TouchableOpacity
                    style={[styles.dualActionBtn, { backgroundColor: C.brand }]}
                    onPress={() => handleRespond(true)}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    <Icon name="check" size={16} color="#fff" />
                    <Text style={[styles.dualActionBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                      {t.directory2.accept}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dualActionBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                    onPress={() => handleRespond(false)}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    <Icon name="x" size={16} color={C.text} />
                    <Text style={[styles.dualActionBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {t.directory2.decline}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
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

  connBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 6, borderWidth: 1,
  } as ViewStyle,
  connDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  connBadgeTxt: { fontSize: 11 } as TextStyle,

  actionControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  actionControlBtnTxt: {
    fontSize: 14.5,
  } as TextStyle,

  dualActionRow: {
    flexDirection: 'row',
    gap: 10,
  } as ViewStyle,
  dualActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 58,
    borderRadius: 16,
  } as ViewStyle,
  dualActionBtnTxt: {
    fontSize: 14.5,
  } as TextStyle,

  sectionHeaderRow: {
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 2,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
  } as TextStyle,

  actionCardsCol: {
    gap: 11,
  } as ViewStyle,

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    height: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,

  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  actionCardContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  } as ViewStyle,

  actionCardTitle: {
    fontSize: 14.5,
    lineHeight: 20,
  } as TextStyle,

  actionCardDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  } as TextStyle,

  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  } as ViewStyle,
  disconnectTxt: { fontSize: 13.5 } as TextStyle,

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
