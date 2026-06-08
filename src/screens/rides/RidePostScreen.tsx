// Matches design screens-e.jsx — RidePost (offer a ride)
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
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
  const { user } = useAuth();

  const [vehicle, setVehicle] = useState<Ride['vehicle']>('Car');
  const [direction, setDirection] = useState<Ride['direction']>('To Campus');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState('3');
  const [fare, setFare] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = from.trim() && to.trim() && date.trim() && fare.trim();

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    const parsedFare = parseInt(fare, 10);
    if (isNaN(parsedFare) || parsedFare < 0) {
      Alert.alert('Invalid fare', 'Please enter a valid fare amount.');
      return;
    }
    const timePart = time.trim() || '08:00';
    if (!date.trim().match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid date', 'Please enter a valid date (YYYY-MM-DD).');
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
      });
      if (error) throw error;
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not post ride. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Offer a Ride" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Vehicle */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>VEHICLE</Text>
        <SegControl options={VEHICLES} value={vehicle} onChange={setVehicle} C={C} />

        {/* Direction */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>DIRECTION</Text>
        <SegControl options={DIRECTIONS} value={direction} onChange={setDirection} C={C} />

        {/* From */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>FROM</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={from}
          onChangeText={setFrom}
          placeholder="e.g. Shyamoli"
          placeholderTextColor={C.textMuted}
        />

        {/* To */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>TO</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={to}
          onChangeText={setTo}
          placeholder="e.g. Campus"
          placeholderTextColor={C.textMuted}
        />

        {/* Date + Time */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>DATE</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={date}
              onChangeText={setDate}
              placeholder="Today"
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>TIME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={time}
              onChangeText={setTime}
              placeholder="8:00 AM"
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>

        {/* Seats + Fare */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>SEATS</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={seats}
              onChangeText={t => setSeats(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>FARE (৳)</Text>
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

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <Icon name="check" size={18} color={canSubmit ? '#fff' : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            Offer Ride
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
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
