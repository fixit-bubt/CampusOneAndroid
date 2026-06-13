// Matches design screens-g.jsx — EventPost
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform,
  StyleSheet, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { Event } from '../../types/database';

const EVT_CATS: { id: Event['category']; label: string; color: string; icon: string }[] = [
  { id: 'Academic',  label: 'Academic',   color: SectorColors.reports, icon: 'study' },
  { id: 'Cultural',  label: 'Cultural',   color: SectorColors.events, icon: 'sparkle' },
  { id: 'Sports',    label: 'Sports',     color: SectorColors.market, icon: 'pulse' },
  { id: 'Club',      label: 'Club',       color: SectorColors.clubs, icon: 'clubs' },
  { id: 'Career',    label: 'Career',     color: SectorColors.jobs, icon: 'jobs' },
];

export function EventPostScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();

  // All hooks must be declared before any early return
  const [cat, setCat] = useState<Event['category']>('Academic');
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [canCreate, setCanCreate] = useState<boolean | null>(null);

  // Web parity: admins, event_organizers allowlist, and club presidents/VPs
  // can create events. The DB can_create_events() RLS gate enforces it too.
  useEffect(() => {
    (async () => {
      if (!user) { setCanCreate(false); return; }
      if (profile?.role === 'admin' || profile?.role === 'staff') { setCanCreate(true); return; }
      const [orgRes, leadRes] = await Promise.all([
        supabase.from('event_organizers').select('user_id').eq('user_id', user.id).maybeSingle(),
        supabase.from('club_members').select('id').eq('user_id', user.id).in('role', ['president', 'vp']).limit(1),
      ]);
      setCanCreate(!!orgRes.data || (leadRes.data?.length ?? 0) > 0);
    })();
  }, [user, profile?.role]);

  if (canCreate === false) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Post an Event" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Icon name="events" size={36} color={C.textMuted} />
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaBold, fontSize: 16, marginTop: 14 }}>
            Organizers Only
          </Text>
          <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium, fontSize: 13.5, marginTop: 8, textAlign: 'center' }}>
            Only staff, admins, approved organizers, and club leaders can post events.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = title.trim() && location.trim() && time.trim() && eventDate.trim();

  async function handleSubmit() {
    if (!canSubmit || !user || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('events').insert({
        code:        'EVT-' + String(performance.now()),
        title:       title.trim(),
        category:    cat,
        organizer:   organizer.trim() || 'Campus',
        venue:       location.trim(),
        date:        eventDate.trim(),
        time:        time.trim(),
        end_time:    endTime.trim() || null,
        capacity:    capacity.trim() ? Number(capacity.trim()) : null,
        description: desc.trim(),
        created_by:  user.id,
      });
      if (error) throw error;
      navigation.goBack();
    } catch {
      toast({ type: 'error', title: t.common.error, message: t.events2.postEventError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Post an Event" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.events2.category}</Text>
        <View style={styles.catRow}>
          {EVT_CATS.map(c => {
            const on = cat === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.catBtn, { borderColor: on ? c.color : C.border, backgroundColor: on ? c.color + '1a' : C.surface }]}
                onPress={() => setCat(c.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.catIcon, { backgroundColor: c.color + '22' }]}>
                  <Icon name={c.icon} size={16} color={c.color} />
                </View>
                <Text style={[styles.catLabel, { color: on ? c.color : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Title */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.events2.eventTitleLabel}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={title}
          onChangeText={setTitle}
          placeholder={t.events2.titlePlaceholder}
          placeholderTextColor={C.textMuted}
        />

        {/* Organizer */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.events2.organizerLabel}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={organizer}
          onChangeText={setOrganizer}
          placeholder={t.events2.organizerPlaceholder}
          placeholderTextColor={C.textMuted}
        />

        {/* Location */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.events2.venueLabel}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={location}
          onChangeText={setLocation}
          placeholder={t.events2.venuePlaceholder}
          placeholderTextColor={C.textMuted}
        />

        {/* Date + Time */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>{t.events2.dateLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={eventDate}
              onChangeText={setEventDate}
              placeholder={t.events2.datePlaceholder}
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>{t.events2.timeLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={time}
              onChangeText={setTime}
              placeholder={t.events2.timePlaceholder}
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>

        {/* End time + Capacity */}
        <View style={[styles.row, { marginTop: 14 }]}>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>{t.events2.endTimeLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={endTime}
              onChangeText={setEndTime}
              placeholder={t.events2.endTimePlaceholder}
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>{t.events2.capacityLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={capacity}
              onChangeText={setCapacity}
              placeholder="100"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Description */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.events2.descriptionLabel}</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={desc}
          onChangeText={setDesc}
          placeholder={t.events2.descPlaceholder}
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
          <Icon name="check" size={18} color={canSubmit ? '#fff' : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            Post Event
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

  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,

  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  } as ViewStyle,

  catIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  catLabel: { fontSize: 13 } as any,

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

  textarea: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
    fontSize: 14.5,
    lineHeight: 22,
  } as any,

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
