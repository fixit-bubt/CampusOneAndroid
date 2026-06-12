// Matches design screens-c.jsx — DoctorDetail
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';

const MED_COLOR = '#e2483d';
const MED_BG    = '#e2483d1e';

const SLOTS = ['Morning', 'Afternoon', 'Evening'] as const;
type Slot = typeof SLOTS[number];

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

function isOnDuty(doc: Doctor): boolean {
  if (!doc.active) return false;
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  if (!doc.days?.includes(DAY_NAMES[now.getDay()])) return false;
  const [sh = 0, sm = 0] = (doc.start_time ?? '').split(':').map(Number);
  const [eh = 23, em = 59] = (doc.end_time ?? '').split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em;
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

const SLOT_TIME: Record<Slot, string> = {
  Morning: '09:00',
  Afternoon: '13:00',
  Evening: '17:00',
};

export function DoctorDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const { doctorId } = route.params;
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot>('Morning');
  const [booking, setBooking] = useState(false);
  const [takenSlots, setTakenSlots] = useState<Set<string>>(new Set());
  const onDuty = doctor ? isOnDuty(doctor) : false;

  const today = new Date().toISOString().split('T')[0];

  async function loadTakenSlots() {
    // Web parity: booked_slots returns the taken HH:MM slots for doctor+date
    const { data } = await supabase.rpc('booked_slots', { p_doctor_id: doctorId, p_date: today });
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    setTakenSlots(new Set(rows.map((r: any) => (typeof r === 'string' ? r : r.slot ?? r.booked_slots))));
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('doctors').select('*').eq('id', doctorId).single();
      if (data) setDoctor(data as Doctor);
      loadTakenSlots();
    })();
  }, [doctorId]);

  async function bookAppointment() {
    if (!doctor || !user) return;
    if (takenSlots.has(SLOT_TIME[selectedSlot])) {
      Alert.alert('Slot taken', 'That slot is already booked. Pick another.');
      return;
    }
    setBooking(true);
    try {
      const { data, error } = await supabase.from('appointments').insert({
        doctor_id:  doctor.id,
        student_id: user.id,
        slot:       SLOT_TIME[selectedSlot],
        date:       today,
        status:     'Booked',
      }).select('token').single();
      if (error) {
        const msg = error.code === '23505'
          ? 'That slot was just taken by someone else. Pick another.'
          : error.message;
        Alert.alert('Could not book', msg);
        loadTakenSlots();
        return;
      }
      Alert.alert(
        'Booked',
        `Your ${selectedSlot} appointment with ${doctor.name} is booked for today.` +
        (data?.token ? `\n\nYour token: ${data.token}` : ''),
      );
      loadTakenSlots();
    } finally {
      setBooking(false);
    }
  }

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
            <Text style={[styles.docSpec, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{doctor.specialty}</Text>
          </View>
        </View>

        {/* Availability banner */}
        <View style={[
          styles.availBanner,
          { backgroundColor: onDuty ? '#e4f5f4' : C.surface2 },
        ]}>
          <View style={[
            styles.availIcon,
            { backgroundColor: onDuty ? '#0e9c8a' : C.border },
          ]}>
            <Icon
              name={onDuty ? 'check' : 'clock'}
              size={22}
              color={onDuty ? '#fff' : C.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.availTitle,
              { color: onDuty ? '#0e9c8a' : C.text, fontFamily: FontFamily.jakartaExtraBold },
            ]}>
              {onDuty ? 'Available now' : 'Not available now'}
            </Text>
            <Text style={[styles.availSub, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              {onDuty
                ? "Walk in during today's hours"
                : `Hours: ${doctor.start_time} – ${doctor.end_time}`}
            </Text>
          </View>
        </View>

        {/* Schedule card */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>SCHEDULE</Text>
        <View style={[styles.schedCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <ScheduleRow icon="events" label="Duty days" value={Array.isArray(doctor.days) ? doctor.days.join(', ') : ''} C={C} />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <ScheduleRow icon="clock" label="Hours" value={`${doctor.start_time} – ${doctor.end_time}`} C={C} />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <ScheduleRow icon="pin" label="Location" value={doctor.room ?? 'Medical Center'} C={C} />
        </View>

        {/* Book Appointment */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>BOOK APPOINTMENT</Text>
        <View style={[styles.bookCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.slotLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>Select a slot</Text>
          <View style={styles.slotRow}>
            {SLOTS.map(slot => {
              const active = selectedSlot === slot;
              const taken = takenSlots.has(SLOT_TIME[slot]);
              return (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.slotBtn,
                    taken
                      ? { backgroundColor: C.surface2, borderColor: C.border, opacity: 0.45 }
                      : { backgroundColor: active ? MED_COLOR : C.surface2, borderColor: active ? MED_COLOR : C.border },
                  ]}
                  onPress={() => setSelectedSlot(slot)}
                  disabled={taken}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.slotTxt, { color: taken ? C.textMuted : active ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {taken ? `${slot} · Taken` : slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.bookBtn, { backgroundColor: MED_COLOR, opacity: booking ? 0.6 : 1 }]}
            onPress={bookAppointment}
            disabled={booking}
            activeOpacity={0.8}
          >
            <Icon name="calendar" size={18} color="#fff" />
            <Text style={[styles.bookBtnTxt, { fontFamily: FontFamily.jakartaBold }]}>Book Appointment</Text>
          </TouchableOpacity>
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

  bookCard: { borderRadius: 16, borderWidth: 1, padding: 14 } as ViewStyle,
  slotLabel: { fontSize: 11, letterSpacing: 0.5, marginBottom: 10 } as any,
  slotRow: { flexDirection: 'row', gap: 8, marginBottom: 14 } as ViewStyle,
  slotBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1 } as ViewStyle,
  slotTxt: { fontSize: 13 } as any,
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 13 } as ViewStyle,
  bookBtnTxt: { fontSize: 14.5, color: '#fff' } as any,
});
