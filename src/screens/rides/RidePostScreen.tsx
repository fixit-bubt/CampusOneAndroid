import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView,
  StyleSheet, Animated, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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

interface HubGroup {
  category: string;
  icon: keyof typeof Feather.glyphMap;
  hubs: string[];
}

const HUB_GROUPS: HubGroup[] = [
  {
    category: 'Nearby & Mirpur Area',
    icon: 'map-pin',
    hubs: ['Mirpur 10', 'Mirpur 2', 'Sony Cinema', 'Rainkhola', 'Mirpur 1', 'Technical'],
  },
  {
    category: 'Major Dhaka Corridors',
    icon: 'compass',
    hubs: ['Uttara', 'Shyamoli', 'Kalyanpur', 'Farmgate', 'Dhanmondi', 'Mohammadpur', 'Agargaon'],
  },
];

interface TimePeriod {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  times: string[];
}

const TIME_PERIODS: TimePeriod[] = [
  {
    title: 'Morning Shift (Class Arrivals)',
    icon: 'sunrise',
    times: ['07:30', '08:00', '08:30', '09:00', '10:00'],
  },
  {
    title: 'Afternoon (Midday Schedule)',
    icon: 'sun',
    times: ['12:00', '13:00', '14:30', '16:00'],
  },
  {
    title: 'Evening & Return Commutes',
    icon: 'sunset',
    times: ['16:30', '17:30', '18:00', '19:30', '21:00'],
  },
];

function localTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().split('T')[0];
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (!iso || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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

  const isOffer = postType === 'offer';
  const accentColor = isOffer ? RIDE_COLOR : '#8b5cf6';
  const TRACK_PADDING = 3;

  // 1. Post Type (Offer vs Request)
  const animIndex = useRef(new Animated.Value(initialPostType === 'request' ? 1 : 0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    Animated.spring(animIndex, {
      toValue: postType === 'request' ? 1 : 0,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [postType, animIndex]);

  const innerTrackWidth = Math.max(0, trackWidth - TRACK_PADDING * 2);
  const tabWidth = innerTrackWidth > 0 ? innerTrackWidth / 2 : 0;
  const translateX = animIndex.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
  });

  // 2. Direction (To Campus vs From Campus)
  const dirAnimIndex = useRef(new Animated.Value(direction === 'From Campus' ? 1 : 0)).current;
  const [dirTrackWidth, setDirTrackWidth] = useState(0);

  useEffect(() => {
    Animated.spring(dirAnimIndex, {
      toValue: direction === 'From Campus' ? 1 : 0,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [direction, dirAnimIndex]);

  const dirInnerTrackWidth = Math.max(0, dirTrackWidth - TRACK_PADDING * 2);
  const dirTabWidth = dirInnerTrackWidth > 0 ? dirInnerTrackWidth / 2 : 0;
  const dirTranslateX = dirAnimIndex.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dirTabWidth],
  });

  // 3. Date Choice (Today vs Tomorrow)
  const dateAnimIndex = useRef(new Animated.Value(dateChoice === 'tomorrow' ? 1 : 0)).current;
  const [dateTrackWidth, setDateTrackWidth] = useState(0);

  useEffect(() => {
    Animated.spring(dateAnimIndex, {
      toValue: dateChoice === 'tomorrow' ? 1 : 0,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [dateChoice, dateAnimIndex]);

  const dateInnerTrackWidth = Math.max(0, dateTrackWidth - TRACK_PADDING * 2);
  const dateTabWidth = dateInnerTrackWidth > 0 ? dateInnerTrackWidth / 2 : 0;
  const dateTranslateX = dateAnimIndex.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dateTabWidth],
  });

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

  const activeHub = direction === 'To Campus' ? from : to;

  function handleHubSelect(hub: string) {
    if (direction === 'To Campus') {
      setFrom(hub);
    } else {
      setTo(hub);
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.rides2.postRideTitle ?? 'Post a Ride'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {/* Post Type Segmented Animated Track Bar */}
          <View
            style={[styles.segmentedTrack, { backgroundColor: C.surface2 }]}
            onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
          >
            {tabWidth > 0 && (
              <Animated.View
                style={[
                  styles.slidingIndicator,
                  {
                    width: tabWidth,
                    transform: [{ translateX }],
                    backgroundColor: C.surface,
                    borderColor: isDark
                      ? (isOffer ? `${RIDE_COLOR}55` : '#8b5cf655')
                      : (isOffer ? `${RIDE_COLOR}35` : '#8b5cf635'),
                  },
                ]}
              />
            )}

            <TouchableOpacity
              style={styles.segmentedTabBtn}
              onPress={() => {
                setPostType('offer');
                if (fare === '40') setFare('50');
              }}
              activeOpacity={0.75}
            >
              <Feather name="navigation" size={14} color={isOffer ? RIDE_COLOR : C.textMuted} />
              <Text
                style={[
                  styles.segmentedTabTxt,
                  {
                    color: isOffer ? RIDE_COLOR : C.textMuted,
                    fontFamily: isOffer ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                Offer Ride (Driver)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.segmentedTabBtn}
              onPress={() => {
                setPostType('request');
                if (fare === '50') setFare('40');
              }}
              activeOpacity={0.75}
            >
              <Feather name="user-check" size={14} color={!isOffer ? '#8b5cf6' : C.textMuted} />
              <Text
                style={[
                  styles.segmentedTabTxt,
                  {
                    color: !isOffer ? '#8b5cf6' : C.textMuted,
                    fontFamily: !isOffer ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
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
                  {v.id === 'Rickshaw' ? (
                    <MaterialCommunityIcons
                      name="rickshaw"
                      size={26}
                      color={on ? accentColor : (isDark ? '#a3e635' : '#4d7c0f')}
                      style={{ marginBottom: 4 }}
                    />
                  ) : (
                    <Text style={styles.vehicleIcon}>{v.icon}</Text>
                  )}
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

          {/* 2. Direction Selection (Animated Segmented Track) */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.rides2.direction ?? 'DIRECTION'}
          </Text>
          <View
            style={[styles.segmentedTrack, { backgroundColor: C.surface2 }]}
            onLayout={e => setDirTrackWidth(e.nativeEvent.layout.width)}
          >
            {dirTabWidth > 0 && (
              <Animated.View
                style={[
                  styles.slidingIndicator,
                  {
                    width: dirTabWidth,
                    transform: [{ translateX: dirTranslateX }],
                    backgroundColor: C.surface,
                    borderColor: isDark
                      ? (isOffer ? `${RIDE_COLOR}55` : '#8b5cf655')
                      : (isOffer ? `${RIDE_COLOR}35` : '#8b5cf635'),
                  },
                ]}
              />
            )}

            <TouchableOpacity
              style={styles.segmentedTabBtn}
              onPress={() => handleDirectionSelect('To Campus')}
              activeOpacity={0.75}
            >
              <Feather
                name="arrow-up-right"
                size={14}
                color={direction === 'To Campus' ? accentColor : C.textMuted}
              />
              <Text
                style={[
                  styles.segmentedTabTxt,
                  {
                    color: direction === 'To Campus' ? accentColor : C.textMuted,
                    fontFamily: direction === 'To Campus' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                {t.rides2.toCampus ?? 'To Campus'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.segmentedTabBtn}
              onPress={() => handleDirectionSelect('From Campus')}
              activeOpacity={0.75}
            >
              <Feather
                name="arrow-down-left"
                size={14}
                color={direction === 'From Campus' ? accentColor : C.textMuted}
              />
              <Text
                style={[
                  styles.segmentedTabTxt,
                  {
                    color: direction === 'From Campus' ? accentColor : C.textMuted,
                    fontFamily: direction === 'From Campus' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                {t.rides2.fromCampus ?? 'From Campus'}
              </Text>
            </TouchableOpacity>
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

          {/* Organized Commute Hubs */}
          <View style={styles.hubContainer}>
            <View style={styles.hubHeaderRow}>
              <Text style={[styles.subSectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {direction === 'To Campus' ? 'POPULAR PICKUP HUBS' : 'POPULAR DESTINATION HUBS'}
              </Text>
              {activeHub.trim().length > 0 && (
                <Text style={[styles.hubActiveNotice, { color: accentColor, fontFamily: FontFamily.jakartaMedium }]}>
                  Selected: {activeHub}
                </Text>
              )}
            </View>

            {HUB_GROUPS.map(group => (
              <View key={group.category} style={styles.hubGroupBlock}>
                <View style={styles.hubCategoryTitleRow}>
                  <Feather name={group.icon} size={11} color={C.textMuted} />
                  <Text style={[styles.hubCategoryTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {group.category.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.chipRow}>
                  {group.hubs.map(hub => {
                    const isSelected = activeHub.trim().toLowerCase() === hub.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={hub}
                        style={[
                          styles.hubChip,
                          {
                            backgroundColor: isSelected
                              ? (isDark ? 'rgba(110, 139, 31, 0.22)' : (isOffer ? '#f2f7e4' : '#f5f0ff'))
                              : C.surface2,
                            borderColor: isSelected ? accentColor : C.border,
                          },
                        ]}
                        onPress={() => handleHubSelect(hub)}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <Feather name="check" size={11} color={accentColor} style={{ marginRight: 3 }} />
                        )}
                        <Text
                          style={[
                            styles.hubChipTxt,
                            {
                              color: isSelected ? accentColor : C.text2,
                              fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                            },
                          ]}
                        >
                          {hub}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* 4. Date Choice (Animated Segmented Track) */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.rides2.date ?? 'DATE'}
          </Text>
          <View
            style={[styles.segmentedTrack, { backgroundColor: C.surface2 }]}
            onLayout={e => setDateTrackWidth(e.nativeEvent.layout.width)}
          >
            {dateTabWidth > 0 && (
              <Animated.View
                style={[
                  styles.slidingIndicator,
                  {
                    width: dateTabWidth,
                    transform: [{ translateX: dateTranslateX }],
                    backgroundColor: C.surface,
                    borderColor: isDark
                      ? (isOffer ? `${RIDE_COLOR}55` : '#8b5cf655')
                      : (isOffer ? `${RIDE_COLOR}35` : '#8b5cf635'),
                  },
                ]}
              />
            )}

            <TouchableOpacity
              style={styles.segmentedTabBtn}
              onPress={() => handleDateChoice('today')}
              activeOpacity={0.75}
            >
              <Feather
                name="calendar"
                size={13}
                color={dateChoice === 'today' ? accentColor : C.textMuted}
              />
              <Text
                style={[
                  styles.segmentedTabTxt,
                  {
                    color: dateChoice === 'today' ? accentColor : C.textMuted,
                    fontFamily: dateChoice === 'today' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
                numberOfLines={1}
              >
                {(t.rides2.todayText ?? 'Today')} · {formatShortDate(localToday())}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.segmentedTabBtn}
              onPress={() => handleDateChoice('tomorrow')}
              activeOpacity={0.75}
            >
              <Feather
                name="calendar"
                size={13}
                color={dateChoice === 'tomorrow' ? accentColor : C.textMuted}
              />
              <Text
                style={[
                  styles.segmentedTabTxt,
                  {
                    color: dateChoice === 'tomorrow' ? accentColor : C.textMuted,
                    fontFamily: dateChoice === 'tomorrow' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
                numberOfLines={1}
              >
                {(t.rides2.tomorrowText ?? 'Tomorrow')} · {formatShortDate(localTomorrow())}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 5. Departure Time & Commute Shifts */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isOffer ? (t.rides2.time ?? 'DEPARTURE TIME') : 'WHEN DO YOU NEED THE RIDE?'}
          </Text>
          <View style={[styles.timeInputRow, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Feather name="clock" size={16} color={C.textMuted} style={{ marginLeft: 12, marginRight: 8 }} />
            <TextInput
              style={[styles.timeTextInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={time}
              onChangeText={setTime}
              placeholder="08:00"
              placeholderTextColor={C.textMuted}
            />
            {time.trim().length > 0 && (
              <View
                style={[
                  styles.timePreviewBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(110, 139, 31, 0.18)'
                      : (isOffer ? '#f2f7e4' : '#f5f0ff'),
                    borderColor: isDark ? 'transparent' : (isOffer ? `${RIDE_COLOR}40` : '#8b5cf640'),
                  },
                ]}
              >
                <Text style={[styles.timePreviewTxt, { color: accentColor, fontFamily: FontFamily.jakartaBold }]}>
                  {formatTime(time)}
                </Text>
              </View>
            )}
          </View>

          {/* Organized Time Shifts */}
          <View style={styles.timeContainer}>
            {TIME_PERIODS.map(period => (
              <View key={period.title} style={styles.timePeriodBlock}>
                <View style={styles.timePeriodTitleRow}>
                  <Feather name={period.icon} size={11} color={C.textMuted} />
                  <Text style={[styles.timePeriodTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {period.title.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.chipRow}>
                  {period.times.map(preset => {
                    const isSelected = time === preset;
                    return (
                      <TouchableOpacity
                        key={preset}
                        style={[
                          styles.timePresetChip,
                          {
                            backgroundColor: isSelected
                              ? (isDark ? 'rgba(110, 139, 31, 0.22)' : (isOffer ? '#f2f7e4' : '#f5f0ff'))
                              : C.surface2,
                            borderColor: isSelected ? accentColor : C.border,
                          },
                        ]}
                        onPress={() => setTime(preset)}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <Feather name="check" size={11} color={accentColor} style={{ marginRight: 3 }} />
                        )}
                        <Text
                          style={[
                            styles.timePresetTxt,
                            {
                              color: isSelected ? accentColor : C.text2,
                              fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                            },
                          ]}
                        >
                          {formatTime(preset)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
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

  segmentedTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginBottom: 12,
    position: 'relative',
  } as ViewStyle,
  slidingIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 11,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  } as ViewStyle,
  segmentedTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
    minHeight: 44,
    zIndex: 1,
  } as ViewStyle,
  segmentedTabTxt: {
    fontSize: 12.5,
  } as TextStyle,

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
    marginTop: 4,
  } as ViewStyle,

  hubContainer: {
    marginTop: 12,
    marginBottom: 6,
    gap: 10,
  } as ViewStyle,
  hubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  } as ViewStyle,
  subSectionLabel: {
    fontSize: 10.5,
    letterSpacing: 0.5,
  } as TextStyle,
  hubActiveNotice: {
    fontSize: 11,
  } as TextStyle,
  hubGroupBlock: {
    gap: 4,
  } as ViewStyle,
  hubCategoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  } as ViewStyle,
  hubCategoryTitle: {
    fontSize: 10,
    letterSpacing: 0.5,
  } as TextStyle,
  hubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 30,
  } as ViewStyle,
  hubChipTxt: { fontSize: 11.5 } as TextStyle,

  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  timeTextInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 6,
    fontSize: 14,
  } as TextStyle,
  timePreviewBadge: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  timePreviewTxt: {
    fontSize: 11.5,
  } as TextStyle,

  timeContainer: {
    marginTop: 10,
    marginBottom: 6,
    gap: 10,
  } as ViewStyle,
  timePeriodBlock: {
    gap: 4,
  } as ViewStyle,
  timePeriodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  } as ViewStyle,
  timePeriodTitle: {
    fontSize: 10,
    letterSpacing: 0.5,
  } as TextStyle,
  timePresetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 30,
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
