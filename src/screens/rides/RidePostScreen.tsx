// Matches design screens-e.jsx — RidePost (offer a ride)
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform,
  StyleSheet, type ViewStyle,
} from 'react-native';
import { useToast } from '../../components/ui/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { Ride } from '../../types/database';

const VEHICLES: { id: Ride['vehicle']; label: string }[] = [
  { id: 'Car',  label: 'Car' },
  { id: 'CNG',  label: 'CNG' },
  { id: 'Bike', label: 'Bike' },
];

const DIRECTIONS: { id: Ride['direction']; label: string }[] = [
  { id: 'To Campus',   label: 'To Campus' },
  { id: 'From Campus', label: 'From Campus' },
];

function SegControl<T extends string>({
  options, value, onChange, C,
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; C: any }) {
  return (
    <View style={[segStyles.row, { backgroundColor: C.surface2, borderColor: C.border }]}>
      {options.map(o => {
        const on = o.id === value;
        return (
          <TouchableOpacity
            key={o.id}
            style={[segStyles.btn, on && { backgroundColor: C.brand }]}
            onPress={() => onChange(o.id)}
            activeOpacity={0.75}
          >
            <Text style={[segStyles.txt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  row: {
    flexDirection: 'row' as const,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  btn: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 9,
    borderRadius: 9,
  },
  txt: { fontSize: 13.5 } as any,
});

export function RidePostScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const { user } = useAuth();

  const toast = useToast();
  const [vehicle, setVehicle] = useState<Ride['vehicle']>('Car');
  const [direction, setDirection] = useState<Ride['direction']>('To Campus');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState('3');
  const [fare, setFare] = useState('');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const DOW = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  function toggleDay(d: string) {
    setRecurring(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));
  }

  const canSubmit = from.trim() && to.trim() && date.trim() && fare.trim();

  async function handleSubmit() {
    if (!canSubmit || !user || loading) return;
    const parsedFare = parseInt(fare, 10);
    if (isNaN(parsedFare) || parsedFare < 0) {
      toast({ type: 'error', title: t.rides2.invalidFareTitle, message: t.rides2.invalidFareBody });
      return;
    }
    const timePart = time.trim() || '08:00';
    if (!date.trim().match(/^\d{4}-\d{2}-\d{2}$/)) {
      toast({ type: 'error', title: t.rides2.invalidDateTitle, message: t.rides2.invalidDateBody });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('rides').insert({
        driver_id:   user.id,
        direction:   direction,
        vehicle:     vehicle,
        origin:      from.trim(),
        destination: to.trim(),
        date:        date.trim(),
        time:        timePart,
        seats_total: parseInt(seats, 10) || 1,
        fare:        parsedFare,
        notes:       notes.trim() || null,
        recurring:   recurring,
      });
      if (error) throw error;
      navigation.goBack();
    } catch {
      toast({ type: 'error', title: t.common.error, message: t.rides2.postFailed });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.rides2.offerRideTitle} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Vehicle */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.rides2.vehicle}</Text>
        <SegControl options={VEHICLES} value={vehicle} onChange={setVehicle} C={C} />

        {/* Direction */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.rides2.direction}</Text>
        <SegControl options={DIRECTIONS} value={direction} onChange={setDirection} C={C} />

        {/* From */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.rides2.from}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={from}
          onChangeText={setFrom}
          placeholder={t.rides2.fromPlaceholder}
          placeholderTextColor={C.textMuted}
        />

        {/* To */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.rides2.to}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={to}
          onChangeText={setTo}
          placeholder={t.rides2.toPlaceholder}
          placeholderTextColor={C.textMuted}
        />

        {/* Date + Time */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>{t.rides2.date}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={date}
              onChangeText={setDate}
              placeholder={t.rides2.datePlaceholder}
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>{t.rides2.time}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={time}
              onChangeText={setTime}
              placeholder={t.rides2.timePlaceholder}
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>

        {/* Seats + Fare */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>{t.rides2.seats}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={seats}
              onChangeText={t => setSeats(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>{t.rides2.fareTk}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={fare}
              onChangeText={t => setFare(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>

        {/* Repeats on (optional) */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.rides2.repeatsOnOptional}</Text>
        <View style={styles.dayRow}>
          {DOW.map(d => {
            const on = recurring.includes(d);
            return (
              <TouchableOpacity
                key={d}
                style={[styles.dayChip, on
                  ? { backgroundColor: C.brand, borderColor: C.brand }
                  : { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => toggleDay(d)}
                activeOpacity={0.75}
              >
                <Text style={[styles.dayTxt, { color: on ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notes (optional) */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.rides2.notesOptional}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium, height: 70, paddingTop: 12 }]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t.rides2.notesPlaceholder}
          placeholderTextColor={C.textMuted}
          multiline
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <Icon name="check" size={18} color={canSubmit ? C.white : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            Offer Ride
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

  label: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 18,
    marginLeft: 2,
  } as any,

  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14.5,
  } as any,

  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  } as ViewStyle,

  halfField: { flex: 1 } as ViewStyle,
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 } as ViewStyle,
  dayChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  dayTxt: { fontSize: 12 } as any,

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginTop: 22,
  } as ViewStyle,

  submitText: { fontSize: 15 } as any,
});
