import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout } from '../../theme';
import { useT } from '../../i18n';
import { useApp } from '../../store/appStore';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { setCache, getCache, CacheKeys } from '../../services/cacheService';
import { formatTime12, toMinutes } from '../../utils/transitPrayer';
import type { BusRoute } from '../../types/database';
import { openUrl, callPhone } from '../../utils/link';

const DAY_OPTIONS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

interface StopItem {
  id: string;
  name: string;
  legMins: number;
}

interface BusRouteEditorModalProps {
  visible: boolean;
  route: BusRoute | null;
  onClose: () => void;
  onSaveSuccess: (savedRoute: BusRoute) => void;
  onDeleteSuccess?: (deletedRouteId: string) => void;
  currentPdfUrl?: string | null;
  onPdfUrlUpdated?: (newPdfUrl: string) => void;
}

export function BusRouteEditorModal({
  visible,
  route,
  onClose,
  onSaveSuccess,
  onDeleteSuccess,
  currentPdfUrl,
  onPdfUrlUpdated,
}: BusRouteEditorModalProps) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { lang } = useApp();
  const isBn = lang === 'bn';
  const toast = useToast();

  const isNew = !route?.id;

  // Form State
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [busNo, setBusNo] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [helperName, setHelperName] = useState('');
  const [helperPhone, setHelperPhone] = useState('');
  const [days, setDays] = useState<string[]>(['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu']);
  const [fridayNote, setFridayNote] = useState('');

  // Dropdown expansion state (clean accordion standard)
  const [daysExpanded, setDaysExpanded] = useState(false);
  const [stopsExpanded, setStopsExpanded] = useState(false);
  const [depExpanded, setDepExpanded] = useState(false);

  // Structured Stops State
  const [stopsList, setStopsList] = useState<StopItem[]>([]);
  const [newStopInput, setNewStopInput] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkStopsInput, setBulkStopsInput] = useState('');

  // Departure Times State
  const [toDepartures, setToDepartures] = useState<string[]>([]);
  const [fromDepartures, setFromDepartures] = useState<string[]>([]);
  const [customToTime, setCustomToTime] = useState('');
  const [customFromTime, setCustomFromTime] = useState('');

  // PDF Schedule Link
  const [pdfUrl, setPdfUrl] = useState('');

  // Processing state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Initialize or reset form when route changes or opens
  useEffect(() => {
    if (!visible) return;

    if (route) {
      setName(route.name ?? '');
      setArea(route.area ?? '');
      setBusNo(route.bus_no ?? '');
      setIsActive(route.active !== false);
      setHelperName(route.helper_name ?? '');
      setHelperPhone(route.helper_phone ?? '');
      setDays(route.days && route.days.length > 0 ? route.days : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu']);
      setFridayNote(route.friday_note ?? '');

      const existingStops = route.stops ?? [];
      const existingLegs = route.leg_mins ?? [];
      const parsedStops: StopItem[] = existingStops.map((st, i) => ({
        id: `stop-${i}-${Date.now().toString(36)}`,
        name: st,
        legMins: existingLegs[i] ?? 10,
      }));
      setStopsList(parsedStops);
      setBulkStopsInput(existingStops.join(', '));

      setToDepartures([...(route.to_departures ?? [])].sort((a, b) => toMinutes(a) - toMinutes(b)));
      setFromDepartures([...(route.from_departures ?? [])].sort((a, b) => toMinutes(a) - toMinutes(b)));
    } else {
      // Create defaults
      setName('');
      setArea('');
      setBusNo('');
      setIsActive(true);
      setHelperName('');
      setHelperPhone('');
      setDays(['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu']);
      setFridayNote('');
      setStopsList([
        { id: 'stop-init-0', name: 'BUBT Main Campus (Rupnagar)', legMins: 0 },
        { id: 'stop-init-1', name: 'Pallabi Metro Station', legMins: 10 },
      ]);
      setBulkStopsInput('BUBT Main Campus (Rupnagar), Pallabi Metro Station');
      setToDepartures(['07:30', '08:30']);
      setFromDepartures(['13:30', '17:15']);
    }

    setPdfUrl(currentPdfUrl ?? '');
    setBulkMode(false);
    setCustomToTime('');
    setCustomFromTime('');
    setNewStopInput('');
    setDaysExpanded(false);
    setStopsExpanded(false);
    setDepExpanded(false);
  }, [visible, route, currentPdfUrl]);

  // Stops handlers
  const handleAddStop = useCallback((stopName: string) => {
    const trimmed = stopName.trim();
    if (!trimmed) return;
    setStopsList((prev) => [
      ...prev,
      {
        id: `stop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: trimmed,
        legMins: 10,
      },
    ]);
    setNewStopInput('');
  }, []);

  const handleRemoveStop = useCallback((index: number) => {
    setStopsList((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateStopName = useCallback((index: number, text: string) => {
    setStopsList((prev) =>
      prev.map((s, i) => (i === index ? { ...s, name: text } : s))
    );
  }, []);

  const handleUpdateLegMins = useCallback((index: number, delta: number) => {
    setStopsList((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const next = Math.max(0, Math.min(120, s.legMins + delta));
        return { ...s, legMins: next };
      })
    );
  }, []);

  const handleMoveStop = useCallback((index: number, direction: 'up' | 'down') => {
    setStopsList((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  }, []);

  const handleApplyBulkStops = useCallback(() => {
    const parsed = bulkStopsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parsed.length === 0) return;
    setStopsList(
      parsed.map((st, i) => ({
        id: `bulk-stop-${i}-${Date.now().toString(36)}`,
        name: st,
        legMins: i === 0 ? 0 : 10,
      }))
    );
    setBulkMode(false);
    toast({
      type: 'success',
      title: isBn ? 'স্টপ যোগ সম্পন্ন' : 'Stops Applied',
      message: `${parsed.length} ${isBn ? 'টি স্টপ যোগ হয়েছে।' : 'stops updated.'}`,
    });
  }, [bulkStopsInput, isBn, toast]);

  // Departures handlers
  const handleAddDeparture = useCallback(
    (timeStr: string, type: 'to' | 'from') => {
      const clean = timeStr.trim();
      if (!/^\d{1,2}:\d{2}$/.test(clean)) {
        toast({
          type: 'error',
          title: isBn ? 'ভুল ফরম্যাট' : 'Invalid Format',
          message: isBn ? 'অনুগ্রহ করে HH:MM ফরম্যাট লিখুন' : 'Please use HH:MM format',
        });
        return;
      }
      const [h, m] = clean.split(':').map(Number);
      if (h < 0 || h > 23 || m < 0 || m > 59) {
        toast({
          type: 'error',
          title: isBn ? 'ভুল সময়' : 'Invalid Time',
          message: isBn ? 'সময় ০:০০ থেকে ২৩:৫৯ হতে হবে।' : 'Time must be between 00:00 and 23:59',
        });
        return;
      }
      const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      if (type === 'to') {
        if (toDepartures.includes(formatted)) return;
        const next = [...toDepartures, formatted].sort((a, b) => toMinutes(a) - toMinutes(b));
        setToDepartures(next);
        setCustomToTime('');
      } else {
        if (fromDepartures.includes(formatted)) return;
        const next = [...fromDepartures, formatted].sort((a, b) => toMinutes(a) - toMinutes(b));
        setFromDepartures(next);
        setCustomFromTime('');
      }
    },
    [toDepartures, fromDepartures, isBn, toast]
  );

  const handleRemoveDeparture = useCallback((timeStr: string, type: 'to' | 'from') => {
    if (type === 'to') {
      setToDepartures((prev) => prev.filter((t) => t !== timeStr));
    } else {
      setFromDepartures((prev) => prev.filter((t) => t !== timeStr));
    }
  }, []);

  // Operating days toggle
  const toggleDay = useCallback((day: string) => {
    setDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  }, []);

  const setDaysPreset = useCallback((preset: 'sat_thu' | 'all' | 'fri_only') => {
    if (preset === 'sat_thu') {
      setDays(['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu']);
    } else if (preset === 'all') {
      setDays(['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    } else if (preset === 'fri_only') {
      setDays(['Fri']);
    }
  }, []);

  // Save Route
  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        type: 'error',
        title: isBn ? 'নাম প্রয়োজন' : 'Name Required',
        message: isBn ? 'অনুগ্রহ করে রুটের একটি নাম লিখুন।' : 'Please enter a name for the route.',
      });
      return;
    }

    setSaving(true);
    try {
      const stopsArray = stopsList.map((s) => s.name.trim()).filter(Boolean);
      const legMinsArray = stopsList.map((s) => s.legMins);

      const payload = {
        name: trimmedName,
        area: area.trim() || 'Dhaka Metropolitan',
        bus_no: busNo.trim() || null,
        helper_name: helperName.trim() || null,
        helper_phone: helperPhone.trim() || null,
        stops: stopsArray,
        leg_mins: legMinsArray,
        to_departures: toDepartures,
        from_departures: fromDepartures,
        days: days,
        friday_note: fridayNote.trim() || null,
        active: isActive,
        updated_at: new Date().toISOString(),
      };

      let savedRecord: BusRoute | null = null;

      if (route?.id) {
        const { data, error } = await supabase
          .from('bus_routes')
          .update(payload)
          .eq('id', route.id)
          .select()
          .single();

        if (error) throw error;
        savedRecord = data as BusRoute;
      } else {
        const slug = trimmedName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 36);
        const generatedId = slug ? `${slug}-${Date.now().toString(36).slice(-4)}` : `route-${Date.now().toString(36)}`;

        const { data, error } = await supabase
          .from('bus_routes')
          .insert({
            id: generatedId,
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        savedRecord = data as BusRoute;
      }

      // Update cache
      const cached = (await getCache<BusRoute[]>(CacheKeys.BUS_ROUTES)) ?? [];
      const updatedCache = route?.id
        ? cached.map((r) => (r.id === route.id ? (savedRecord as BusRoute) : r))
        : [...cached, savedRecord as BusRoute];
      await setCache(CacheKeys.BUS_ROUTES, updatedCache);

      // Save PDF if changed
      if (pdfUrl.trim() && pdfUrl.trim() !== currentPdfUrl) {
        await supabase
          .from('app_config')
          .upsert({ key: 'latest_bus_schedule_url', value: pdfUrl.trim() });
        await setCache(CacheKeys.BUS_SCHEDULE_PDF_URL, pdfUrl.trim());
        onPdfUrlUpdated?.(pdfUrl.trim());
      }

      toast({
        type: 'success',
        title: isBn ? 'সংরক্ষিত হয়েছে' : 'Route Saved',
        message: `${trimmedName} ${isBn ? 'সফলভাবে সংরক্ষিত হয়েছে।' : 'schedule has been updated.'}`,
      });

      onSaveSuccess(savedRecord as BusRoute);
      onClose();
    } catch (err: any) {
      toast({
        type: 'error',
        title: isBn ? 'ব্যর্থ হয়েছে' : 'Save Failed',
        message: err.message || (isBn ? 'সংরক্ষণ করার সময় ত্রুটি হয়েছে।' : 'An error occurred while saving.'),
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete Route
  const handleDelete = () => {
    if (!route?.id) return;
    Alert.alert(
      t.bus2.deleteRoute,
      t.bus2.deleteConfirm,
      [
        { text: isBn ? 'বাতিল' : 'Cancel', style: 'cancel' },
        {
          text: isBn ? 'মুছে ফেলুন' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase.from('bus_routes').delete().eq('id', route.id);
              if (error) throw error;

              const cached = (await getCache<BusRoute[]>(CacheKeys.BUS_ROUTES)) ?? [];
              const updatedCache = cached.filter((r) => r.id !== route.id);
              await setCache(CacheKeys.BUS_ROUTES, updatedCache);

              toast({
                type: 'success',
                title: isBn ? 'মুছে ফেলা হয়েছে' : 'Route Deleted',
                message: `${route.name} ${isBn ? 'মুছে ফেলা হয়েছে।' : 'has been removed.'}`,
              });

              onDeleteSuccess?.(route.id);
              onClose();
            } catch (err: any) {
              toast({
                type: 'error',
                title: isBn ? 'মুছতে ব্যর্থ' : 'Delete Failed',
                message: err.message,
              });
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Concise days summary for the 58dp dropdown bar header
  const daysSummary =
    days.length === 6 && !days.includes('Fri')
      ? (isBn ? 'শনি - বৃহস্পতি' : 'Sat - Thu')
      : days.length === 7
      ? (isBn ? 'সব দিন (৭ দিন)' : 'All 7 Days')
      : days.length === 1 && days[0] === 'Fri'
      ? (isBn ? 'শুধু শুক্রবার' : 'Friday Only')
      : `${days.length} ${isBn ? 'দিন' : 'Days'}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar
          title={isNew ? t.bus2.addRoute : t.bus2.editRoute}
          onBack={onClose}
          rightSlot={
            !isNew ? (
              <TouchableOpacity
                onPress={handleDelete}
                hitSlop={8}
                style={styles.headerTrashBtn}
                activeOpacity={0.7}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={C.danger} />
                ) : (
                  <Feather name="trash-2" size={20} color={C.danger} />
                )}
              </TouchableOpacity>
            ) : null
          }
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingHorizontal: Layout.screenPadding, paddingBottom: Math.max(insets.bottom + 80, 100) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Section 1: Route Status Bar (58dp Standard) */}
            <TouchableOpacity
              style={[
                styles.bar58,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  marginBottom: 10,
                },
              ]}
              onPress={() => setIsActive((prev) => !prev)}
              activeOpacity={0.75}
            >
              <View style={styles.barLeft}>
                <View style={styles.iconSlot32}>
                  <Feather
                    name={isActive ? 'check-circle' : 'slash'}
                    size={32}
                    color={C.text}
                  />
                </View>
                <View style={styles.barTitleCol}>
                  <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {isActive ? t.bus2.statusActive : t.bus2.statusSuspended}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusPill, { borderColor: C.border }]}>
                <Text style={[styles.statusPillTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {isActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'স্থগিত' : 'Paused')}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Field 1: Route Name (58dp Bar) */}
            <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 10 }]}>
              <View style={styles.iconSlot32}>
                <Feather name="navigation" size={32} color={C.text} />
              </View>
              <TextInput
                style={[styles.fullInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={isBn ? 'রুটের নাম' : 'Route Name'}
                placeholderTextColor={C.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Field 2: Service Area (58dp Bar) */}
            <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 10 }]}>
              <View style={styles.iconSlot32}>
                <Feather name="map" size={32} color={C.text} />
              </View>
              <TextInput
                style={[styles.fullInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={isBn ? 'এলাকা বা কাভারেজ' : 'Service Area / Coverage'}
                placeholderTextColor={C.textMuted}
                value={area}
                onChangeText={setArea}
              />
            </View>

            {/* Field 3: Bus Number / Plate (58dp Bar) */}
            <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 10 }]}>
              <View style={styles.iconSlot32}>
                <Feather name="truck" size={32} color={C.text} />
              </View>
              <TextInput
                style={[styles.fullInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={isBn ? 'বাস নম্বর বা প্লেট' : 'Bus Number / Plate'}
                placeholderTextColor={C.textMuted}
                value={busNo}
                onChangeText={setBusNo}
              />
            </View>

            {/* Field 4: Driver / Helper Name (58dp Bar) */}
            <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 10 }]}>
              <View style={styles.iconSlot32}>
                <Feather name="user" size={32} color={C.text} />
              </View>
              <TextInput
                style={[styles.fullInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={isBn ? 'ড্রাইভার বা হেল্পারের নাম' : 'Driver / Helper Name'}
                placeholderTextColor={C.textMuted}
                value={helperName}
                onChangeText={setHelperName}
              />
            </View>

            {/* Field 5: Helper Phone (58dp Bar) */}
            <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 14 }]}>
              <View style={styles.iconSlot32}>
                <Feather name="phone" size={32} color={C.text} />
              </View>
              <TextInput
                style={[styles.fullInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={isBn ? 'ফোন নম্বর' : 'Phone Number'}
                placeholderTextColor={C.textMuted}
                value={helperPhone}
                onChangeText={setHelperPhone}
                keyboardType="phone-pad"
              />
              {helperPhone.trim().length > 0 && (
                <TouchableOpacity
                  style={[styles.innerActionBtn, { borderColor: C.border }]}
                  onPress={() => callPhone(helperPhone.trim())}
                  activeOpacity={0.7}
                  hitSlop={6}
                >
                  <Feather name="phone-call" size={16} color={C.text} />
                </TouchableOpacity>
              )}
            </View>

            {/* Dropdown Bar 1: Operating Days (58dp Standard) */}
            <TouchableOpacity
              style={[
                styles.bar58,
                styles.dropdownBar,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  marginBottom: daysExpanded ? 8 : 14,
                },
              ]}
              onPress={() => setDaysExpanded((prev) => !prev)}
              activeOpacity={0.75}
            >
              <View style={styles.barLeft}>
                <View style={styles.iconSlot32}>
                  <Feather name="calendar" size={32} color={C.text} />
                </View>
                <View style={styles.barTitleCol}>
                  <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {t.bus2.operatingDaysSection}
                  </Text>
                  <Text style={[styles.barSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                    {daysSummary}
                  </Text>
                </View>
              </View>
              <Feather
                name={daysExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={C.textMuted}
              />
            </TouchableOpacity>

            {/* Expanded Content: Operating Days (All inner rows are 58dp) */}
            {daysExpanded && (
              <View style={styles.expandedBlock}>
                {/* Preset 1: Sat - Thu (58dp Bar) */}
                <TouchableOpacity
                  style={[
                    styles.bar58,
                    {
                      backgroundColor: C.surface,
                      borderColor: days.length === 6 && !days.includes('Fri') ? C.brand : C.border,
                      marginBottom: 8,
                    },
                  ]}
                  onPress={() => setDaysPreset('sat_thu')}
                  activeOpacity={0.75}
                >
                  <View style={styles.barLeft}>
                    <View style={styles.iconSlot32}>
                      <Feather name="calendar" size={24} color={C.text} />
                    </View>
                    <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {t.bus2.regularDays}
                    </Text>
                  </View>
                  {days.length === 6 && !days.includes('Fri') && (
                    <Feather name="check" size={20} color={C.brand} />
                  )}
                </TouchableOpacity>

                {/* Preset 2: All 7 Days (58dp Bar) */}
                <TouchableOpacity
                  style={[
                    styles.bar58,
                    {
                      backgroundColor: C.surface,
                      borderColor: days.length === 7 ? C.brand : C.border,
                      marginBottom: 8,
                    },
                  ]}
                  onPress={() => setDaysPreset('all')}
                  activeOpacity={0.75}
                >
                  <View style={styles.barLeft}>
                    <View style={styles.iconSlot32}>
                      <Feather name="calendar" size={24} color={C.text} />
                    </View>
                    <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {t.bus2.allDays}
                    </Text>
                  </View>
                  {days.length === 7 && (
                    <Feather name="check" size={20} color={C.brand} />
                  )}
                </TouchableOpacity>

                {/* Preset 3: Friday Only (58dp Bar) */}
                <TouchableOpacity
                  style={[
                    styles.bar58,
                    {
                      backgroundColor: C.surface,
                      borderColor: days.length === 1 && days[0] === 'Fri' ? C.brand : C.border,
                      marginBottom: 8,
                    },
                  ]}
                  onPress={() => setDaysPreset('fri_only')}
                  activeOpacity={0.75}
                >
                  <View style={styles.barLeft}>
                    <View style={styles.iconSlot32}>
                      <Feather name="calendar" size={24} color={C.text} />
                    </View>
                    <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {t.bus2.fridayOnly}
                    </Text>
                  </View>
                  {days.length === 1 && days[0] === 'Fri' && (
                    <Feather name="check" size={20} color={C.brand} />
                  )}
                </TouchableOpacity>

                {/* Individual Days Selection (7 bars of 58dp) */}
                <View style={{ gap: 8, marginTop: 4, marginBottom: 8 }}>
                  {DAY_OPTIONS.map((d) => {
                    const isSelected = days.includes(d);
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.bar58,
                          {
                            backgroundColor: C.surface,
                            borderColor: isSelected ? C.brand : C.border,
                          },
                        ]}
                        onPress={() => toggleDay(d)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.barLeft}>
                          <View style={styles.iconSlot32}>
                            <Feather name="clock" size={24} color={C.text} />
                          </View>
                          <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                            {d}
                          </Text>
                        </View>
                        {isSelected && <Feather name="check" size={20} color={C.brand} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Holiday / Friday Notice Bar (58dp) */}
                <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 14 }]}>
                  <View style={styles.iconSlot32}>
                    <Feather name="info" size={24} color={C.textMuted} />
                  </View>
                  <TextInput
                    style={[styles.fullInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    placeholder={isBn ? 'ছুটি বা বিশেষ নোটিশ' : 'Holiday or operational notice'}
                    placeholderTextColor={C.textMuted}
                    value={fridayNote}
                    onChangeText={setFridayNote}
                  />
                </View>
              </View>
            )}

            {/* Dropdown Bar 2: Route Stops (58dp Standard) */}
            <TouchableOpacity
              style={[
                styles.bar58,
                styles.dropdownBar,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  marginBottom: stopsExpanded ? 8 : 14,
                },
              ]}
              onPress={() => setStopsExpanded((prev) => !prev)}
              activeOpacity={0.75}
            >
              <View style={styles.barLeft}>
                <View style={styles.iconSlot32}>
                  <Feather name="map-pin" size={32} color={C.text} />
                </View>
                <View style={styles.barTitleCol}>
                  <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {t.bus2.stopsSection}
                  </Text>
                  <Text style={[styles.barSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                    {`${stopsList.length} ${isBn ? 'টি স্টপ' : 'Stops'}`}
                  </Text>
                </View>
              </View>
              <Feather
                name={stopsExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={C.textMuted}
              />
            </TouchableOpacity>

            {/* Expanded Content: Route Stops (All inner items are 58dp) */}
            {stopsExpanded && (
              <View style={styles.expandedBlock}>
                {/* Add New Stop (58dp Bar) */}
                <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 8 }]}>
                  <View style={styles.iconSlot32}>
                    <Feather name="map-pin" size={24} color={C.text} />
                  </View>
                  <TextInput
                    style={[styles.fullInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    placeholder={t.bus2.addStopPlaceholder}
                    placeholderTextColor={C.textMuted}
                    value={newStopInput}
                    onChangeText={setNewStopInput}
                    onSubmitEditing={() => handleAddStop(newStopInput)}
                  />
                  <TouchableOpacity
                    style={[styles.innerActionBtn, { borderColor: C.border, opacity: newStopInput.trim() ? 1 : 0.4 }]}
                    onPress={() => handleAddStop(newStopInput)}
                    disabled={!newStopInput.trim()}
                    activeOpacity={0.75}
                    hitSlop={6}
                  >
                    <Feather name="plus" size={18} color={C.text} />
                  </TouchableOpacity>
                </View>

                {/* Bulk Paste Toggle Bar (58dp Bar) */}
                <TouchableOpacity
                  style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 8 }]}
                  onPress={() => setBulkMode((prev) => !prev)}
                  activeOpacity={0.75}
                >
                  <View style={styles.barLeft}>
                    <View style={styles.iconSlot32}>
                      <Feather name="file-text" size={24} color={C.text} />
                    </View>
                    <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {bulkMode ? (isBn ? 'তালিকা ভিউ' : 'List View') : t.bus2.bulkStopsMode}
                    </Text>
                  </View>
                  <Feather name={bulkMode ? 'chevron-up' : 'chevron-right'} size={20} color={C.textMuted} />
                </TouchableOpacity>

                {bulkMode ? (
                  <View style={[styles.bulkBox, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 10 }]}>
                    <TextInput
                      style={[
                        styles.bulkInput,
                        {
                          color: C.text,
                          backgroundColor: C.bg,
                          borderColor: C.border,
                          fontFamily: FontFamily.jakartaMedium,
                        },
                      ]}
                      value={bulkStopsInput}
                      onChangeText={setBulkStopsInput}
                      multiline
                      numberOfLines={3}
                      placeholderTextColor={C.textMuted}
                      placeholder={t.bus2.bulkStopsPlaceholder}
                    />
                    <TouchableOpacity
                      style={[styles.bar58, styles.applyBulkBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                      onPress={handleApplyBulkStops}
                      activeOpacity={0.8}
                    >
                      <Feather name="check" size={18} color={C.text} />
                      <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {t.bus2.applyBulkStops}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Ordered Stop Bars (Each is 58dp) */
                  <View style={{ gap: 8, marginBottom: 14 }}>
                    {stopsList.map((stop, index) => {
                      const isFirst = index === 0;
                      const isLast = index === stopsList.length - 1;

                      return (
                        <View
                          key={stop.id}
                          style={[
                            styles.bar58,
                            {
                              backgroundColor: C.surface,
                              borderColor: C.border,
                            },
                          ]}
                        >
                          {/* Step Index Badge (32dp slot) */}
                          <View style={styles.iconSlot32}>
                            <Text style={[styles.indexBadgeTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                              {index + 1}
                            </Text>
                          </View>

                          {/* Stop Name & Leg Minutes (Zero overlap) */}
                          <View style={styles.barTitleCol}>
                            <TextInput
                              style={[styles.stopInlineInput, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                              value={stop.name}
                              onChangeText={(txt) => handleUpdateStopName(index, txt)}
                              placeholder="Stop name"
                              placeholderTextColor={C.textMuted}
                              numberOfLines={1}
                            />
                            {!isFirst && (
                              <Text style={[styles.barSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                                {`+${stop.legMins} ${t.bus2.travelMin}`}
                              </Text>
                            )}
                          </View>

                          {/* Actions: Adjust Leg Minutes, Reorder, Delete */}
                          <View style={styles.stopActionGroup}>
                            {!isFirst && (
                              <View style={styles.legBtnPair}>
                                <TouchableOpacity
                                  style={[styles.miniBtn, { borderColor: C.border }]}
                                  onPress={() => handleUpdateLegMins(index, -5)}
                                  hitSlop={6}
                                >
                                  <Feather name="minus" size={12} color={C.textMuted} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.miniBtn, { borderColor: C.border }]}
                                  onPress={() => handleUpdateLegMins(index, 5)}
                                  hitSlop={6}
                                >
                                  <Feather name="plus" size={12} color={C.textMuted} />
                                </TouchableOpacity>
                              </View>
                            )}

                            <TouchableOpacity
                              style={[styles.miniBtn, { borderColor: C.border, opacity: isFirst ? 0.3 : 1 }]}
                              onPress={() => handleMoveStop(index, 'up')}
                              disabled={isFirst}
                              hitSlop={6}
                            >
                              <Feather name="arrow-up" size={14} color={C.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.miniBtn, { borderColor: C.border, opacity: isLast ? 0.3 : 1 }]}
                              onPress={() => handleMoveStop(index, 'down')}
                              disabled={isLast}
                              hitSlop={6}
                            >
                              <Feather name="arrow-down" size={14} color={C.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.miniBtn, { borderColor: C.border }]}
                              onPress={() => handleRemoveStop(index)}
                              hitSlop={6}
                            >
                              <Feather name="trash-2" size={14} color={C.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Dropdown Bar 3: Departure Schedules (58dp Standard) */}
            <TouchableOpacity
              style={[
                styles.bar58,
                styles.dropdownBar,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  marginBottom: depExpanded ? 8 : 14,
                },
              ]}
              onPress={() => setDepExpanded((prev) => !prev)}
              activeOpacity={0.75}
            >
              <View style={styles.barLeft}>
                <View style={styles.iconSlot32}>
                  <Feather name="clock" size={32} color={C.text} />
                </View>
                <View style={styles.barTitleCol}>
                  <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {t.bus2.departuresSection}
                  </Text>
                  <Text style={[styles.barSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                    {`${toDepartures.length} ${t.bus2.toCampus} · ${fromDepartures.length} ${t.bus2.fromCampus}`}
                  </Text>
                </View>
              </View>
              <Feather
                name={depExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={C.textMuted}
              />
            </TouchableOpacity>

            {/* Expanded Content: Departure Schedules (All inner items are 58dp) */}
            {depExpanded && (
              <View style={styles.expandedBlock}>
                {/* 3.1 To Campus Section */}
                <Text style={[styles.subGroupLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {t.bus2.toCampus}
                </Text>

                {/* Add To Campus Time (58dp Bar) */}
                <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 8 }]}>
                  <View style={styles.iconSlot32}>
                    <Feather name="arrow-right" size={24} color={C.text} />
                  </View>
                  <TextInput
                    style={[styles.fullInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    placeholder={t.bus2.customTimePlaceholder}
                    placeholderTextColor={C.textMuted}
                    value={customToTime}
                    onChangeText={setCustomToTime}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <TouchableOpacity
                    style={[styles.innerActionBtn, { borderColor: C.border, opacity: customToTime.trim() ? 1 : 0.4 }]}
                    onPress={() => handleAddDeparture(customToTime, 'to')}
                    disabled={!customToTime.trim()}
                    activeOpacity={0.75}
                    hitSlop={6}
                  >
                    <Feather name="plus" size={18} color={C.text} />
                  </TouchableOpacity>
                </View>

                {/* To Campus Departure Rows (58dp each) */}
                <View style={{ gap: 8, marginBottom: 14 }}>
                  {toDepartures.map((time) => (
                    <View
                      key={time}
                      style={[
                        styles.bar58,
                        {
                          backgroundColor: C.surface,
                          borderColor: C.border,
                        },
                      ]}
                    >
                      <View style={styles.barLeft}>
                        <View style={styles.iconSlot32}>
                          <Feather name="clock" size={24} color={C.text} />
                        </View>
                        <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {formatTime12(time)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.miniBtn, { borderColor: C.border }]}
                        onPress={() => handleRemoveDeparture(time, 'to')}
                        activeOpacity={0.7}
                        hitSlop={6}
                      >
                        <Feather name="trash-2" size={14} color={C.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {toDepartures.length === 0 && (
                    <Text style={[styles.emptyPrompt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {isBn ? 'কোনো সময় যোগ করা হয়নি' : 'No times configured'}
                    </Text>
                  )}
                </View>

                {/* 3.2 From Campus Section */}
                <Text style={[styles.subGroupLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {t.bus2.fromCampus}
                </Text>

                {/* Add From Campus Time (58dp Bar) */}
                <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 8 }]}>
                  <View style={styles.iconSlot32}>
                    <Feather name="arrow-left" size={24} color={C.text} />
                  </View>
                  <TextInput
                    style={[styles.fullInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    placeholder={t.bus2.customTimePlaceholder}
                    placeholderTextColor={C.textMuted}
                    value={customFromTime}
                    onChangeText={setCustomFromTime}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <TouchableOpacity
                    style={[styles.innerActionBtn, { borderColor: C.border, opacity: customFromTime.trim() ? 1 : 0.4 }]}
                    onPress={() => handleAddDeparture(customFromTime, 'from')}
                    disabled={!customFromTime.trim()}
                    activeOpacity={0.75}
                    hitSlop={6}
                  >
                    <Feather name="plus" size={18} color={C.text} />
                  </TouchableOpacity>
                </View>

                {/* From Campus Departure Rows (58dp each) */}
                <View style={{ gap: 8, marginBottom: 14 }}>
                  {fromDepartures.map((time) => (
                    <View
                      key={time}
                      style={[
                        styles.bar58,
                        {
                          backgroundColor: C.surface,
                          borderColor: C.border,
                        },
                      ]}
                    >
                      <View style={styles.barLeft}>
                        <View style={styles.iconSlot32}>
                          <Feather name="clock" size={24} color={C.text} />
                        </View>
                        <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {formatTime12(time)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.miniBtn, { borderColor: C.border }]}
                        onPress={() => handleRemoveDeparture(time, 'from')}
                        activeOpacity={0.7}
                        hitSlop={6}
                      >
                        <Feather name="trash-2" size={14} color={C.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {fromDepartures.length === 0 && (
                    <Text style={[styles.emptyPrompt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {isBn ? 'কোনো সময় যোগ করা হয়নি' : 'No times configured'}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Official PDF Schedule URL Bar (58dp) */}
            <View style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 14 }]}>
              <View style={styles.iconSlot32}>
                <Feather name="file-text" size={32} color={C.text} />
              </View>
              <TextInput
                style={[styles.fullInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={t.bus2.pdfUrlPlaceholder}
                placeholderTextColor={C.textMuted}
                value={pdfUrl}
                onChangeText={setPdfUrl}
                autoCapitalize="none"
              />
              {pdfUrl.trim().length > 0 && (
                <TouchableOpacity
                  style={[styles.innerActionBtn, { borderColor: C.border }]}
                  onPress={() => openUrl(pdfUrl.trim())}
                  activeOpacity={0.7}
                  hitSlop={6}
                >
                  <Feather name="external-link" size={16} color={C.text} />
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Floating Bottom CTA Dock (58dp Standard) */}
        <View
          style={[
            styles.bottomDock,
            {
              backgroundColor: C.surface,
              borderTopColor: C.border,
              paddingBottom: Math.max(insets.bottom + 12, 16),
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.bar58,
              styles.submitBtn,
              {
                backgroundColor: C.text,
                opacity: name.trim() && !saving ? 1 : 0.4,
              },
            ]}
            onPress={handleSave}
            disabled={!name.trim() || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={C.bg} size="small" />
            ) : (
              <>
                <Feather name="check" size={20} color={C.bg} />
                <Text style={[styles.submitBtnTxt, { color: C.bg, fontFamily: FontFamily.jakartaBold }]}>
                  {t.bus2.saveRoute}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10 } as ViewStyle,

  headerTrashBtn: {
    padding: 6,
    borderRadius: 8,
  } as ViewStyle,

  // Universal 58dp Bar Standard
  bar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,

  dropdownBar: {
    justifyContent: 'space-between',
  } as ViewStyle,

  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  } as ViewStyle,

  iconSlot32: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,

  barTitleCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  } as ViewStyle,

  barTitle: {
    fontSize: 15,
  } as TextStyle,

  barSub: {
    fontSize: 12,
    marginTop: 2,
  } as TextStyle,

  fullInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,

  stopInlineInput: {
    fontSize: 14.5,
    paddingVertical: 0,
    paddingHorizontal: 0,
  } as TextStyle,

  indexBadgeTxt: {
    fontSize: 13,
  } as TextStyle,

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,

  statusPillTxt: {
    fontSize: 11.5,
  } as TextStyle,

  innerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,

  miniBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  stopActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  } as ViewStyle,

  legBtnPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,

  expandedBlock: {
    marginBottom: 8,
  } as ViewStyle,

  subGroupLabel: {
    fontSize: 11.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  } as TextStyle,

  bulkBox: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  } as ViewStyle,

  bulkInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13.5,
    minHeight: 80,
    textAlignVertical: 'top',
  } as TextStyle,

  applyBulkBtn: {
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,

  emptyPrompt: {
    fontSize: 12.5,
    paddingVertical: 6,
    paddingHorizontal: 4,
  } as TextStyle,

  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
  } as ViewStyle,

  submitBtn: {
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,

  submitBtnTxt: {
    fontSize: 15,
  } as TextStyle,
});
