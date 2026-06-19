// Availability only, no booking.
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';

const MED_COLOR = SectorColors.medical;
const MED_BG    = `${SectorColors.medical}1e`;

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  days: string[];
  start_time: string;
  end_time: string;
  room: string | null;
  active: boolean;
}

function toMins(s: string | null | undefined, fallback: number): number {
  const [h, m] = (s ?? '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return fallback;
  return h * 60 + m;
}

function isOnDuty(doc: Doctor): boolean {
  if (!doc.active) return false;
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  if (!doc.days?.includes(DAY_NAMES[now.getDay()])) return false;
  const start = toMins(doc.start_time, 0);
  const end = toMins(doc.end_time, 24 * 60 - 1);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  // Handle overnight shifts (end before start wraps past midnight).
  return start <= end ? (nowMins >= start && nowMins <= end) : (nowMins >= start || nowMins <= end);
}

function ScheduleRow({ icon, label, value, C }: any) {
  return (
    <View style={[styles.schedRow, { borderColor: C.border }]}>
      <View style={[styles.schedIcon, { backgroundColor: MED_BG }]}>
        <Icon name={icon} size={16} color={MED_COLOR} />
      </View>
      <View style={styles.schedBody}>
        <Text style={[styles.schedLabel, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>{label}</Text>
      </View>
      <Text style={[styles.schedValue, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{value}</Text>
    </View>
  );
}

export function DoctorDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const { doctorId } = route.params ?? {};
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [failed, setFailed] = useState(false);
  const onDuty = doctor ? isOnDuty(doctor) : false;

  useEffect(() => {
    if (!doctorId) { setFailed(true); return; }
    (async () => {
      const { data, error } = await supabase.from('doctors').select('*').eq('id', doctorId).maybeSingle();
      if (error || !data) { setFailed(true); return; }
      setDoctor(data as Doctor);
    })();
  }, [doctorId]);

  if (!doctor) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.medical2.doctor} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {failed
            ? <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>{t.common.notFound}</Text>
            : <ActivityIndicator color={C.brand} />}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={doctor.name} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor header card */}
        <View style={[styles.headerCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.thumb, { backgroundColor: MED_BG }]}>
            <Icon name="medical" size={26} color={MED_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.docName, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{doctor.name}</Text>
            <Text style={[styles.docSpec, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{doctor.specialty}</Text>
          </View>
        </View>

        {/* Availability banner */}
        <View style={[
          styles.availBanner,
          { backgroundColor: onDuty ? C.successBg : C.surface2 },
        ]}>
          <View style={[
            styles.availIcon,
            { backgroundColor: onDuty ? C.success : C.border },
          ]}>
            <Icon
              name={onDuty ? 'check' : 'clock'}
              size={22}
              color={onDuty ? C.white : C.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.availTitle,
              { color: onDuty ? C.success : C.text, fontFamily: FontFamily.jakartaExtraBold },
            ]}>
              {onDuty ? t.medical2.availableNow : t.medical2.notAvailableNow}
            </Text>
            <Text style={[styles.availSub, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              {onDuty
                ? "Walk in during today's hours"
                : `Hours: ${doctor.start_time} – ${doctor.end_time}`}
            </Text>
          </View>
        </View>

        {/* Schedule card */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.medical2.schedule}</Text>
        <View style={[styles.schedCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <ScheduleRow icon="events" label={t.medical2.dutyDays} value={Array.isArray(doctor.days) ? doctor.days.join(', ') : ''} C={C} />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <ScheduleRow icon="clock" label={t.medical2.hours} value={`${doctor.start_time} – ${doctor.end_time}`} C={C} />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <ScheduleRow icon="pin" label={t.medical2.location} value={doctor.room ?? t.medical2.medicalCenter} C={C} />
        </View>

        <View style={{ height: 26 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  content: { paddingTop: 16, paddingBottom: 20 } as ViewStyle,

  headerCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  thumb: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  docName: { fontSize: 17 } as any,
  docSpec: { fontSize: 12.5, marginTop: 1 } as any,

  availBanner: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 16, marginTop: 12 } as ViewStyle,
  availIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  availTitle: { fontSize: 15.5 } as any,
  availSub: { fontSize: 12.5, marginTop: 2 } as any,

  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 20, marginBottom: 9 } as any,
  schedCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 } as ViewStyle,
  schedIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  schedBody: { flex: 1 } as ViewStyle,
  schedLabel: { fontSize: 14 } as any,
  schedValue: { fontSize: 13, flexShrink: 0 } as any,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
});
