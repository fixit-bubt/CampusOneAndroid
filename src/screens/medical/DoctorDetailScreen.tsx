// Matches design screens-c.jsx — DoctorDetail
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';

const MED_COLOR = '#e2483d';
const MED_BG    = '#e2483d1e';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  duty_days: string;
  duty_hours: string;
  on_duty: boolean;
  next_duty: string;
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
  const { id } = route.params;
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('doctors').select('*').eq('id', id).single();
      if (data) setDoctor(data as Doctor);
    })();
  }, [id]);

  if (!doctor) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Doctor" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
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
            <Text style={[styles.docSpec, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{doctor.specialization}</Text>
          </View>
        </View>

        {/* Availability banner */}
        <View style={[
          styles.availBanner,
          { backgroundColor: doctor.on_duty ? '#e4f5f4' : C.surface2 },
        ]}>
          <View style={[
            styles.availIcon,
            { backgroundColor: doctor.on_duty ? '#0e9c8a' : C.border },
          ]}>
            <Icon
              name={doctor.on_duty ? 'check' : 'clock'}
              size={22}
              color={doctor.on_duty ? '#fff' : C.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.availTitle,
              { color: doctor.on_duty ? '#0e9c8a' : C.text, fontFamily: FontFamily.jakartaExtraBold },
            ]}>
              {doctor.on_duty ? 'Available now' : 'Not available now'}
            </Text>
            <Text style={[styles.availSub, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              {doctor.on_duty
                ? "Walk in during today's hours"
                : `Next: ${doctor.next_duty}`}
            </Text>
          </View>
        </View>

        {/* Schedule card */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>SCHEDULE</Text>
        <View style={[styles.schedCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <ScheduleRow icon="events" label="Duty days" value={doctor.duty_days} C={C} />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <ScheduleRow icon="clock" label="Hours" value={doctor.duty_hours} C={C} />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <ScheduleRow icon="pin" label="Location" value="Medical Center, Ground floor" C={C} />
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
