import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';
import {
  nowDhakaMinutes,
  dhakaWeekday,
  toMinutes,
  formatTime12,
  fmtCountdown,
} from '../../utils/transitPrayer';
import { openUrl } from '../../utils/link';
import { getCache, CacheKeys } from '../../services/cacheService';
import { BUBT_CLINIC_INFO } from '../../constants/medicalServices';
import type { Doctor } from '../../types/database';

const MED_COLOR = SectorColors.medical;
const MED_BG = `${SectorColors.medical}1e`;

interface DutyState {
  badge: 'on_duty' | 'starting_soon' | 'off_duty' | 'on_leave';
  title: string;
  sub: string;
  color: string;
  bg: string;
}

function getDoctorDuty(doc: Doctor, C: any): DutyState {
  if (doc.is_on_leave) {
    return {
      badge: 'on_leave',
      title: 'Currently On Leave',
      sub: doc.leave_note || 'Temporary absence · Please consult the on-duty medical officer.',
      color: C.danger,
      bg: C.dangerBg,
    };
  }
  if (!doc.active) {
    return {
      badge: 'off_duty',
      title: 'Inactive',
      sub: 'Not currently on active roster.',
      color: C.textMuted,
      bg: C.surface2,
    };
  }

  const currentDay = dhakaWeekday();
  const days = Array.isArray(doc.days) ? doc.days : [];
  const worksToday = days.includes(currentDay);

  const startMins = toMinutes(doc.start_time);
  const endMins = toMinutes(doc.end_time);
  const nowMins = nowDhakaMinutes();

  if (worksToday) {
    if (nowMins >= startMins && nowMins <= endMins) {
      const remaining = endMins - nowMins;
      return {
        badge: 'on_duty',
        title: 'Available Now (On Duty)',
        sub: `Walk in to ${doc.room ?? BUBT_CLINIC_INFO.room} · Shift ends in ${fmtCountdown(remaining)}`,
        color: C.success,
        bg: C.successBg,
      };
    }
    if (nowMins < startMins && startMins - nowMins <= 60) {
      const until = startMins - nowMins;
      return {
        badge: 'starting_soon',
        title: `Starts in ${fmtCountdown(until)}`,
        sub: `Today's consultation hours: ${formatTime12(doc.start_time)} - ${formatTime12(doc.end_time)}`,
        color: C.warn,
        bg: C.warnBg,
      };
    }
    if (nowMins < startMins) {
      return {
        badge: 'off_duty',
        title: 'On Duty Later Today',
        sub: `Hours: ${formatTime12(doc.start_time)} - ${formatTime12(doc.end_time)}`,
        color: C.textMuted,
        bg: C.surface2,
      };
    }
    return {
      badge: 'off_duty',
      title: "Today's Shift Ended",
      sub: `Consultation hours were ${formatTime12(doc.start_time)} - ${formatTime12(doc.end_time)}`,
      color: C.textMuted,
      bg: C.surface2,
    };
  }

  return {
    badge: 'off_duty',
    title: 'Not Scheduled Today',
    sub: `Consultation days: ${days.length > 0 ? days.join(', ') : 'Weekly schedule'}`,
    color: C.textMuted,
    bg: C.surface2,
  };
}

function ScheduleRow({
  icon,
  label,
  value,
  C,
}: {
  icon: string;
  label: string;
  value: string;
  C: any;
}) {
  return (
    <View style={[styles.schedRow, { borderColor: C.border }]}>
      <View style={[styles.schedIcon, { backgroundColor: MED_BG }]}>
        <Icon name={icon} size={16} color={MED_COLOR} />
      </View>
      <View style={styles.schedBody}>
        <Text
          style={[
            styles.schedLabel,
            { color: C.text, fontFamily: FontFamily.jakartaSemiBold },
          ]}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.schedValue,
          { color: C.text2, fontFamily: FontFamily.jakartaBold },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function DoctorDetailScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { doctorId } = route.params ?? {};
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!doctorId) {
      setFailed(true);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', doctorId)
        .maybeSingle();

      if (!active) return;
      if (error || !data) {
        const cachedList = await getCache<Doctor[]>(CacheKeys.DOCTORS);
        const found = (cachedList || []).find((d) => d.id === doctorId);
        if (found) {
          setDoctor(found);
          return;
        }
        setFailed(true);
        return;
      }
      setDoctor(data as Doctor);
    })();
    return () => {
      active = false;
    };
  }, [doctorId]);

  if (!doctor) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.medical2.doctor} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {failed ? (
            <Text
              style={{
                color: C.textMuted,
                fontFamily: FontFamily.jakartaMedium,
              }}
            >
              {t.common.notFound}
            </Text>
          ) : (
            <ActivityIndicator color={C.brand} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const duty = getDoctorDuty(doctor, C);
  const isPsych =
    doctor.role_type === 'psychologist' ||
    (doctor.specialty && doctor.specialty.toLowerCase().includes('psycholog'));

  const contactPhone = doctor.phone || BUBT_CLINIC_INFO.phoneDirect;
  const contactEmail = doctor.email || BUBT_CLINIC_INFO.email;

  function handleDial() {
    openUrl(`tel:${contactPhone.replace(/\s+/g, '')}`);
  }

  function handleEmail() {
    const subject = isPsych
      ? encodeURIComponent('[BUBT Health] Confidential Counseling Session Request')
      : encodeURIComponent('[BUBT Medical Unit] Student Health Inquiry');
    openUrl(`mailto:${contactEmail}?subject=${subject}`);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={doctor.name} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: Layout.screenPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Header Card */}
        <View
          style={[
            styles.headerCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <View
            style={[
              styles.thumb,
              {
                backgroundColor: isPsych
                  ? isDark
                    ? 'rgba(168, 85, 247, 0.16)'
                    : 'rgba(147, 51, 234, 0.1)'
                  : MED_BG,
              },
            ]}
          >
            <Icon
              name={isPsych ? 'heart' : 'medical'}
              size={26}
              color={isPsych ? '#a855f7' : MED_COLOR}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.docName,
                { color: C.text, fontFamily: FontFamily.jakartaExtraBold },
              ]}
            >
              {doctor.name}
            </Text>
            <Text
              style={[
                styles.docSpec,
                {
                  color: isPsych ? '#a855f7' : MED_COLOR,
                  fontFamily: FontFamily.jakartaBold,
                },
              ]}
            >
              {doctor.specialty}
            </Text>
            {doctor.qualifications && (
              <Text
                style={[
                  styles.docQual,
                  { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                ]}
              >
                {doctor.qualifications}
              </Text>
            )}
          </View>
        </View>

        {/* Live Availability Banner */}
        <View style={[styles.availBanner, { backgroundColor: duty.bg }]}>
          <View
            style={[
              styles.availIcon,
              {
                backgroundColor:
                  duty.badge === 'on_duty'
                    ? C.success
                    : duty.badge === 'on_leave'
                    ? C.danger
                    : C.border,
              },
            ]}
          >
            <Icon
              name={
                duty.badge === 'on_duty'
                  ? 'check'
                  : duty.badge === 'on_leave'
                  ? 'alert-triangle'
                  : 'clock'
              }
              size={20}
              color={C.white}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.availTitle,
                { color: duty.color, fontFamily: FontFamily.jakartaExtraBold },
              ]}
            >
              {duty.title}
            </Text>
            <Text
              style={[
                styles.availSub,
                { color: C.text2, fontFamily: FontFamily.jakartaMedium },
              ]}
            >
              {duty.sub}
            </Text>
          </View>
        </View>

        {/* Psychological Counseling Highlight */}
        {isPsych && (
          <View
            style={[
              styles.counselingCard,
              {
                backgroundColor: isDark
                  ? 'rgba(168, 85, 247, 0.1)'
                  : 'rgba(147, 51, 234, 0.06)',
                borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(147, 51, 234, 0.2)',
              },
            ]}
          >
            <View style={styles.counselingTop}>
              <View
                style={[
                  styles.counselingIconBox,
                  { backgroundColor: isDark ? '#a855f7' : '#9333ea' },
                ]}
              >
                <Icon name="heart" size={18} color={C.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.counselingTitle,
                    { color: C.text, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  Confidential Psychological Support
                </Text>
                <Text
                  style={[
                    styles.counselingSub,
                    { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                  ]}
                >
                  {t.medical2.counselingNotice}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.counselingActionBtn, { backgroundColor: '#a855f7' }]}
              onPress={handleEmail}
              activeOpacity={0.75}
            >
              <Icon name="mail" size={14} color={C.white} />
              <Text
                style={[
                  styles.counselingActionTxt,
                  { color: C.white, fontFamily: FontFamily.jakartaBold },
                ]}
              >
                {t.medical2.requestCounseling}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Contact Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: MED_BG }]}
            onPress={handleDial}
            activeOpacity={0.75}
          >
            <Icon name="phone" size={17} color={MED_COLOR} />
            <Text
              style={[
                styles.actionBtnTxt,
                { color: MED_COLOR, fontFamily: FontFamily.jakartaBold },
              ]}
            >
              {t.medical2.callDesk}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 },
            ]}
            onPress={handleEmail}
            activeOpacity={0.75}
          >
            <Icon name="mail" size={17} color={C.text} />
            <Text
              style={[
                styles.actionBtnTxt,
                { color: C.text, fontFamily: FontFamily.jakartaBold },
              ]}
            >
              {t.medical2.sendEmail}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Schedule & Location Matrix */}
        <Text
          style={[
            styles.sectionLabel,
            { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold },
          ]}
        >
          {t.medical2.schedule}
        </Text>
        <View
          style={[
            styles.schedCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <ScheduleRow
            icon="events"
            label={t.medical2.dutyDays}
            value={Array.isArray(doctor.days) ? doctor.days.join(', ') : ''}
            C={C}
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <ScheduleRow
            icon="clock"
            label={t.medical2.hours}
            value={`${formatTime12(doctor.start_time)} – ${formatTime12(
              doctor.end_time
            )}`}
            C={C}
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <ScheduleRow
            icon="pin"
            label={t.medical2.location}
            value={doctor.room ?? BUBT_CLINIC_INFO.room}
            C={C}
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <ScheduleRow
            icon="phone"
            label="Campus Intercom"
            value={doctor.phone ?? BUBT_CLINIC_INFO.phoneExt}
            C={C}
          />
        </View>

        {/* Guidelines Card */}
        <View
          style={[
            styles.guideCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <Text
            style={[
              styles.guideTitle,
              { color: C.text, fontFamily: FontFamily.jakartaBold },
            ]}
          >
            Walk-in Consultation Notice
          </Text>
          <Text
            style={[
              styles.guideTxt,
              { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
            ]}
          >
            All consultations, vitals monitoring, and primary over-the-counter
            medicines are completely free of charge. Please carry your valid BUBT
            Student or Employee ID Card to Room 205.
          </Text>
        </View>

        <View style={{ height: 26 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  content: { paddingTop: 14, paddingBottom: 20 } as ViewStyle,

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
  } as ViewStyle,
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  docName: { fontSize: 16.5 } as any,
  docSpec: { fontSize: 13, marginTop: 2 } as any,
  docQual: { fontSize: 12, marginTop: 2 } as any,

  availBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    marginTop: 12,
  } as ViewStyle,
  availIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  availTitle: { fontSize: 14.5 } as any,
  availSub: { fontSize: 12, marginTop: 2 } as any,

  counselingCard: {
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
  } as ViewStyle,
  counselingTop: { flexDirection: 'row', alignItems: 'center', gap: 12 } as ViewStyle,
  counselingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  counselingTitle: { fontSize: 14 } as any,
  counselingSub: { fontSize: 12, marginTop: 2 } as any,
  counselingActionBtn: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  } as ViewStyle,
  counselingActionTxt: { fontSize: 14.5 } as any,

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  } as ViewStyle,
  actionBtn: {
    flex: 1,
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  actionBtnTxt: { fontSize: 14.5 } as any,

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 9,
  } as any,
  schedCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 } as ViewStyle,
  schedIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  schedBody: { flex: 1 } as ViewStyle,
  schedLabel: { fontSize: 13.5 } as any,
  schedValue: { fontSize: 13, flexShrink: 0 } as any,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,

  guideCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
  } as ViewStyle,
  guideTitle: { fontSize: 13.5 } as any,
  guideTxt: { fontSize: 12, marginTop: 3, lineHeight: 18 } as any,
});
