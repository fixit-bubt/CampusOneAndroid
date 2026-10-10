import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView,
  StyleSheet, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useToast } from '../../components/ui/Toast';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { localToday, formatDate, formatTime } from '../../utils/format';
import type { Ride } from '../../types/database';

const RIDE_COLOR = SectorColors.ride;

const VEHICLES: { id: Ride['vehicle']; label: string; icon: string; maxSeats: number; defaultSeats: number }[] = [
  { id: 'Rickshaw', label: 'Rickshaw', icon: '🚲', maxSeats: 2, defaultSeats: 1 },
  { id: 'Bike',     label: 'Bike',     icon: '🏍️', maxSeats: 1, defaultSeats: 1 },
  { id: 'CNG',      label: 'CNG',      icon: '🛺', maxSeats: 3, defaultSeats: 2 },
  { id: 'Car',      label: 'Car',      icon: '🚗', maxSeats: 4, defaultSeats: 3 },
];

const QUICK_HUBS = ['Mirpur 10', 'Mirpur 2', 'Uttara', 'Shyamoli', 'Dhanmondi', 'Kalyanpur', 'Mohammadpur'];

const TIME_PRESETS = ['07:30', '08:00', '08:30', '09:00', '13:00', '16:30', '18:00', '21:30'];

function localTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().split('T')[0];
}

function getInitialDateTime(): { defaultDate: 'today' | 'tomorrow'; defaultTime: string } {
  const now = new Date();
  const currentHour = now.getHours();
  // If it's evening (after 6 PM / 18:00), default to tomorrow morning 08:00
  if (currentHour >= 18) {
    return { defaultDate: 'tomorrow', defaultTime: '08:00' };
  }
  // Otherwise, default to the next upcoming hour today
  const nextHour = (currentHour + 1) % 24;
  const timeStr = `${String(nextHour).padStart(2, '0')}:00`;
  return { defaultDate: 'today', defaultTime: timeStr };
}

export function RidePostScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();

  const initialSchedule = getInitialDateTime();
  const initialPostType = route?.params?.postType === 'request' ? 'request' : 'offer';

  const [postType, setPostType] = useState<'offer' | 'request'>(initialPostType);
  const [vehicle, setVehicle] = useState<Ride['vehicle']>('Rickshaw');
  const [direction, setDirection] = useState<Ride['direction']>('To Campus');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('BUBT Campus');
  const [dateChoice, setDateChoice] = useState<'today' | 'tomorrow'>(initialSchedule.defaultDate);
  const [time, setTime] = useState(initialSchedule.defaultTime);
  const [seats, setSeats] = useState(1);
  const [fare, setFare] = useState('40');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const currentVehicleConfig = VEHICLES.find(v => v.id === vehicle) ?? VEHICLES[0];

  function handleVehicleSelect(v: Ride['vehicle']) {
    setVehicle(v);
    const cfg = VEHICLES.find(item => item.id === v);
    if (cfg) {
      setSeats(Math.min(seats, cfg.maxSeats) || cfg.defaultSeats);
    }
  }

  function handleDateChoice(choice: 'today' | 'tomorrow') {
    setDateChoice(choice);
    const now = new Date();
    if (choice === 'tomorrow') {
      if (!time || time === `${String((now.getHours() + 1) % 24).padStart(2, '0')}:00`) {
        setTime('08:00');
      }
    } else {
      if (now.getHours() >= 18 && time === '08:00') {
        const nextHour = Math.min(23, now.getHours() + 1);
        setTime(`${String(nextHour).padStart(2, '0')}:00`);
      }
    }
  }

  function handleDirectionSelect(dir: Ride['direction']) {
    setDirection(dir);
    if (dir === 'To Campus') {
      setTo('BUBT Campus');
      if (from === 'BUBT Campus') setFrom('');
    } else {
      setFrom('BUBT Campus');
      if (to === 'BUBT Campus') setTo('');
    }
  }

  const selectedDate = dateChoice === 'today' ? localToday() : localTomorrow();

  const canSubmit = from.trim() && to.trim() && fare.trim();

  async function handleSubmit() {
    if (!canSubmit || !user || loading) return;
    const parsedFare = parseInt(fare, 10);
    if (isNaN(parsedFare) || parsedFare < 0) {
      toast({ type: 'error', title: t.rides2.invalidFareTitle, message: t.rides2.invalidFareBody });
      return;
    }

    // Normalize time to HH:MM with leading zero
    let timePart = time.trim() || '08:00';
    if (/^\d:\d{2}$/.test(timePart)) {
      timePart = '0' + timePart;
    }

    // Validate that a ride scheduled for Today hasn't already departed
    const [h, m] = timePart.split(':').map(Number);
    if (selectedDate === localToday() && Number.isFinite(h) && Number.isFinite(m)) {
      const now = new Date();
      const curMins = now.getHours() * 60 + now.getMinutes();
      const rideMins = h * 60 + m;
      if (rideMins < curMins - 15) {
        toast({
          type: 'info',
          title: 'Departure Time Passed',
          message: 'The departure time has already passed for today. Please pick a future time or select Tomorrow.',
        });
        return;
      }
    }

    const calculatedSeats = postType === 'offer'
      ? Math.max(1, Math.min(seats, currentVehicleConfig.maxSeats))
      : Math.max(1, Math.min(seats, 2));

    setLoading(true);
    try {
      const { error } = await supabase.from('rides').insert({
        driver_id:   user.id,
        direction:   direction,
        vehicle:     vehicle,
        origin:      from.trim(),
        destination: to.trim(),
        date:        selectedDate,
        time:        timePart,
        seats_total: calculatedSeats,
        fare:        parsedFare,
        notes:       notes.trim() || null,
        recurring:   [],
        post_type:   postType,
      });

      if (error) throw error;
      toast({
        type: 'success',
        title: postType === 'offer' ? 'Ride Offered' : 'Ride Requested',
        message: postType === 'offer'
          ? 'Your campus ride is now visible to students.'
          : 'Your ride request is now posted for drivers and carpoolers.',
      });
      navigation.goBack();
    } catch (err: any) {
      toast({ type: 'error', title: t.common.error, message: err?.message || t.rides2.postFailed });
    } finally {
      setLoading(false);
    }
  }

  const isOffer = postType === 'offer';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={isOffer ? (t.rides2.offerRideTitle ?? 'Offer a Ride') : 'Request a Ride'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {/* Post Type Segmented Toggle */}
          <View style={[styles.typeToggle, { backgroundColor: C.surface, borderColor: C.border }]}>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                isOffer && { backgroundColor: RIDE_COLOR },
              ]}
              onPress={() => {
                setPostType('offer');
                if (fare === '40') setFare('50');
              }}
              activeOpacity={0.8}
            >
              <Feather name="navigation" size={15} color={isOffer ? '#fff' : C.textMuted} />
              <Text
                style={[
                  styles.typeBtnTxt,
                  {
                    color: isOffer ? '#fff' : C.textMuted,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
              >
                Offer Ride (Driver)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeBtn,
                !isOffer && { backgroundColor: '#8b5cf6' },
              ]}
              onPress={() => {
                setPostType('request');
                if (fare === '50') setFare('40');
              }}
              activeOpacity={0.8}
            >
              <Feather name="user-check" size={15} color={!isOffer ? '#fff' : C.textMuted} />
              <Text
                style={[
                  styles.typeBtnTxt,
                  {
                    color: !isOffer ? '#fff' : C.textMuted,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
              >
                Need Ride (Passenger)
              </Text>
            </TouchableOpacity>
          </View>

          {/* 1. Vehicle Selection */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isOffer ? (t.rides2.vehicle ?? 'YOUR VEHICLE') : 'PREFERRED VEHICLE'}
          </Text>
          <View style={styles.vehicleRow}>
            {VEHICLES.map(v => {
              const on = vehicle === v.id;
              const accentColor = isOffer ? RIDE_COLOR : '#8b5cf6';
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.vehicleCard,
                    {
                      backgroundColor: on
                        ? (isDark ? 'rgba(110, 139, 31, 0.2)' : (isOffer ? '#f4f8e6' : '#f5f0ff'))
                        : C.surface,
                      borderColor: on ? accentColor : C.border,
                    },
                  ]}
                  onPress={() => handleVehicleSelect(v.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.vehicleIcon}>{v.icon}</Text>
                  <Text style={[styles.vehicleLabel, { color: on ? accentColor : C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {v.label}
                  </Text>
                  <Text style={[styles.vehicleSeatsHint, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {isOffer ? `Max ${v.maxSeats}` : 'Any'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2. Direction Selection */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.rides2.direction ?? 'DIRECTION'}
          </Text>
          <View style={[styles.dirToggle, { backgroundColor: C.surface, borderColor: C.border }]}>
            {(['To Campus', 'From Campus'] as const).map(dir => {
              const on = direction === dir;
              return (
                <TouchableOpacity
                  key={dir}
                  style={[styles.dirBtn, on && { backgroundColor: isOffer ? RIDE_COLOR : '#8b5cf6' }]}
                  onPress={() => handleDirectionSelect(dir)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dirBtnTxt, { color: on ? '#fff' : C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {dir === 'To Campus' ? (t.rides2.toCampus ?? 'To Campus') : (t.rides2.fromCampus ?? 'From Campus')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 3. Origin & Destination */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isOffer ? (t.rides2.from ?? 'PICKUP POINT / FROM') : 'YOUR LOCATION / FROM'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={from}
            onChangeText={setFrom}
            placeholder={isOffer ? (t.rides2.fromPlaceholder ?? 'e.g. Mirpur 10') : 'e.g. Mirpur 2, Sony Cinema'}
            placeholderTextColor={C.textMuted}
          />

          {/* Quick Hub Chips */}
          <View style={styles.chipRow}>
            {QUICK_HUBS.map(hub => (
              <TouchableOpacity
                key={hub}
                style={[styles.hubChip, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => {
                  if (direction === 'To Campus') setFrom(hub);
                  else setTo(hub);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.hubChipTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                  {hub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.rides2.to ?? 'TO'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={to}
            onChangeText={setTo}
            placeholder={t.rides2.toPlaceholder ?? 'e.g. BUBT Campus'}
            placeholderTextColor={C.textMuted}
          />

          {/* 4. Date Choice (Today / Tomorrow) */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.rides2.date ?? 'DATE'}
          </Text>
          <View style={styles.dateRow}>
            {(['today', 'tomorrow'] as const).map(choice => {
              const on = dateChoice === choice;
              const label = choice === 'today' ? (t.rides2.todayText ?? 'Today') : (t.rides2.tomorrowText ?? 'Tomorrow');
              const dStr = choice === 'today' ? localToday() : localTomorrow();
              const accentBg = isOffer ? RIDE_COLOR : '#8b5cf6';
              return (
                <TouchableOpacity
                  key={choice}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: on ? accentBg : C.surface,
                      borderColor: on ? accentBg : C.border,
                    },
                  ]}
                  onPress={() => handleDateChoice(choice)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dateChipTxt, { color: on ? '#fff' : C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {label} ({formatDate(dStr)})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 5. Departure Time */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isOffer ? (t.rides2.time ?? 'DEPARTURE TIME') : 'WHEN DO YOU NEED THE RIDE?'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={time}
            onChangeText={setTime}
            placeholder="08:00"
            placeholderTextColor={C.textMuted}
          />

          <View style={styles.chipRow}>
            {TIME_PRESETS.map(preset => {
              const accentColor = isOffer ? RIDE_COLOR : '#8b5cf6';
              return (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.timePresetChip,
                    {
                      backgroundColor: time === preset ? accentColor : C.surface2,
                      borderColor: time === preset ? accentColor : C.border,
                    },
                  ]}
                  onPress={() => setTime(preset)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timePresetTxt, { color: time === preset ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {formatTime(preset)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 6. Seats & Fare Row */}
          <View style={styles.sideBySideRow}>
            {/* Seats Stepper */}
            <View style={styles.halfCol}>
              <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {isOffer ? (t.rides2.seats ?? 'SEATS OFFERED') : 'SEATS NEEDED'}
              </Text>
              <View style={[styles.stepper, { backgroundColor: C.surface, borderColor: C.border }]}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setSeats(s => Math.max(1, s - 1))}
                  activeOpacity={0.7}
                >
                  <Feather name="minus" size={16} color={C.text} />
                </TouchableOpacity>
                <Text style={[styles.stepVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {seats}
                </Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setSeats(s => isOffer ? Math.min(currentVehicleConfig.maxSeats, s + 1) : Math.min(2, s + 1))}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={16} color={C.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Fare Input */}
            <View style={styles.halfCol}>
              <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {isOffer ? (t.rides2.fareTk ?? 'FARE (৳) PER SEAT') : 'BUDGET (৳)'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={fare}
                onChangeText={setFare}
                keyboardType="numeric"
                placeholder="40"
                placeholderTextColor={C.textMuted}
              />
            </View>
          </View>

          {/* 7. Meeting Point / Notes */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isOffer ? (t.rides2.meetingSpot ?? 'MEETING POINT / LANDMARK') : 'NOTES / MEETING POINT'}
          </Text>
          <TextInput
            style={[styles.input, styles.multilineInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={notes}
            onChangeText={setNotes}
            placeholder={isOffer ? (t.rides2.meetingSpotPlaceholder ?? 'e.g. Opposite Sony Cinema Hall gate') : 'e.g. Waiting at footbridge, carrying backpack'}
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={2}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: isOffer ? RIDE_COLOR : '#8b5cf6',
                opacity: canSubmit && !loading ? 1 : 0.6,
              },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={0.8}
          >
            <Feather name={isOffer ? 'check-circle' : 'send'} size={17} color="#fff" />
            <Text style={[styles.submitBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
              {loading
                ? 'Posting…'
                : isOffer
                ? (t.rides2.offerRide ?? 'Post Offered Ride')
                : 'Post Ride Request'}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 6, paddingBottom: 24 },

  typeToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    marginBottom: 14,
  } as ViewStyle,
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 11,
    minHeight: 44,
  } as ViewStyle,
  typeBtnTxt: { fontSize: 13 } as TextStyle,

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 6,
  } as TextStyle,

  vehicleRow: {
    flexDirection: 'row',
    gap: 8,
  } as ViewStyle,
  vehicleCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 78,
    justifyContent: 'center',
  } as ViewStyle,
  vehicleIcon: { fontSize: 24, marginBottom: 3 },
  vehicleLabel: { fontSize: 12.5 } as TextStyle,
  vehicleSeatsHint: { fontSize: 10.5, marginTop: 1 } as TextStyle,

  dirToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 3,
  } as ViewStyle,
  dirBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    minHeight: 42,
  } as ViewStyle,
  dirBtnTxt: { fontSize: 13 } as TextStyle,

  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  } as TextStyle,
  multilineInput: {
    height: 70,
    paddingTop: 10,
    textAlignVertical: 'top',
  } as TextStyle,

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 7,
  } as ViewStyle,
  hubChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  } as ViewStyle,
  hubChipTxt: { fontSize: 11.5 } as TextStyle,

  dateRow: {
    flexDirection: 'row',
    gap: 8,
  } as ViewStyle,
  dateChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  } as ViewStyle,
  dateChipTxt: { fontSize: 12.5 } as TextStyle,

  timePresetChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  } as ViewStyle,
  timePresetTxt: { fontSize: 12 } as TextStyle,

  sideBySideRow: {
    flexDirection: 'row',
    gap: 10,
  } as ViewStyle,
  halfCol: {
    flex: 1,
  } as ViewStyle,

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 4,
  } as ViewStyle,
  stepBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  stepVal: { fontSize: 15 } as TextStyle,

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginTop: 22,
  } as ViewStyle,
  submitBtnTxt: { fontSize: 15 } as TextStyle,
});
