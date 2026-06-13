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
import { FontFamily, Layout , SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
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

// 20-minute slot grid between the doctor's start and end times (web parity).
function slotsFor(doc: Doctor): string[] {
  const [sh = 9, sm = 0] = (doc.start_time ?? '09:00').split(':').map(Number);
  const [eh = 17, em = 0] = (doc.end_time ?? '17:00').split(':').map(Number);
  const out: string[] = [];
  for (let m = sh * 60 + sm; m + 20 <= eh * 60 + em; m += 20) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

function fmtSlot(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Next n calendar dates (starting today) on which the doctor is on duty.
function nextDutyDates(doc: Doctor, n: number): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < 21 && out.length < n; i++) {
    if (doc.days?.includes(DAY_NAMES[d.getDay()])) {
      out.push({
        iso: localISO(d),
        label: `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`,
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function DoctorDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const { doctorId } = route.params;
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [takenSlots, setTakenSlots] = useState<Set<string>>(new Set());
  const onDuty = doctor ? isOnDuty(doctor) : false;

  const dutyDates = doctor ? nextDutyDates(doctor, 5) : [];
  const slots = doctor ? slotsFor(doctor) : [];

  const loadTakenSlots = async (date: string) => {
    // Web parity: booked_slots returns the taken HH:MM slots for doctor+date
    const { data } = await supabase.rpc('booked_slots', { p_doctor_id: doctorId, p_date: date });
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    setTakenSlots(new Set(rows.map((r: any) => (typeof r === 'string' ? r : r.slot ?? r.booked_slots))));
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('doctors').select('*').eq('id', doctorId).single();
      if (data) {
        const doc = data as Doctor;
        setDoctor(doc);
        const first = nextDutyDates(doc, 1)[0];
        if (first) {
          setSelectedDate(first.iso);
          loadTakenSlots(first.iso);
        }
      }
    })();
  }, [doctorId]);

  function pickDate(iso: string) {
    setSelectedDate(iso);
    setSelectedSlot(null);
    loadTakenSlots(iso);
  }

  async function bookAppointment() {
    if (!doctor || !user || !selectedDate || !selectedSlot) return;
    if (takenSlots.has(selectedSlot)) {
      Alert.alert(t.common.error, t.medical.slotTaken);
      return;
    }
    setBooking(true);
    try {
      const { data, error } = await supabase.from('appointments').insert({
        doctor_id:  doctor.id,
        student_id: user.id,
        slot:       selectedSlot,
        date:       selectedDate,
        status:     'Booked',
      }).select('token').single();
      if (error) {
        const msg = error.code === '23505' ? t.medical.slotTaken : error.message;
        Alert.alert(t.common.error, msg);
        loadTakenSlots(selectedDate);
        return;
      }
      Alert.alert(t.medical.bookedTitle, data?.token ? t.medical.bookedBody(data.token) : '');
      setSelectedSlot(null);
      loadTakenSlots(selectedDate);
    } finally {
      setBooking(false);
    }
  }

  if (!doctor) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.medical2.doctor} onBack={() => navigation.goBack()} />
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

        {/* Book Appointment — duty-date picker + 20-min slot grid */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.medical2.bookAppointment}</Text>
        <View style={[styles.bookCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.slotLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.medical.pickDate}</Text>
          <View style={styles.dateRow}>
            {dutyDates.map(d => {
              const active = selectedDate === d.iso;
              return (
                <TouchableOpacity
                  key={d.iso}
                  style={[styles.dateBtn, {
                    backgroundColor: active ? MED_COLOR : C.surface2,
                    borderColor: active ? MED_COLOR : C.border,
                  }]}
                  onPress={() => pickDate(d.iso)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.slotTxt, { color: active ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.slotLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>{t.medical.pickSlot}</Text>
          <View style={styles.slotGrid}>
            {slots.map(slot => {
              const active = selectedSlot === slot;
              const taken = takenSlots.has(slot);
              return (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.slotCell,
                    taken
                      ? { backgroundColor: C.surface2, borderColor: C.border, opacity: 0.45 }
                      : { backgroundColor: active ? MED_COLOR : C.surface2, borderColor: active ? MED_COLOR : C.border },
                  ]}
                  onPress={() => setSelectedSlot(slot)}
                  disabled={taken}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.slotTxt, {
                    color: taken ? C.textMuted : active ? C.white : C.text2,
                    fontFamily: FontFamily.jakartaBold,
                    textDecorationLine: taken ? 'line-through' : 'none',
                  }]}>
                    {fmtSlot(slot)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.bookBtn, { backgroundColor: MED_COLOR, opacity: booking || !selectedSlot ? 0.55 : 1 }]}
            onPress={bookAppointment}
            disabled={booking || !selectedSlot}
            activeOpacity={0.8}
          >
            <Icon name="calendar" size={18} color={C.white} />
            <Text style={[styles.bookBtnTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>{t.medical.book}</Text>
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
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as ViewStyle,
  dateBtn: { alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 } as ViewStyle,
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 } as ViewStyle,
  slotCell: { width: '31%', alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1 } as ViewStyle,
  slotTxt: { fontSize: 12.5 } as any,
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 13 } as ViewStyle,
  bookBtnTxt: { fontSize: 14.5 } as any,
});
