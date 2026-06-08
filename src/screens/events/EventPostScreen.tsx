// Matches design screens-g.jsx — EventPost
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
import type { Event } from '../../types/database';

const EVT_CATS: { id: Event['category']; label: string; color: string; icon: string }[] = [
  { id: 'Academic',  label: 'Academic',   color: '#2b5be3', icon: 'study' },
  { id: 'Cultural',  label: 'Cultural',   color: '#e08a2b', icon: 'sparkle' },
  { id: 'Sports',    label: 'Sports',     color: '#12915e', icon: 'pulse' },
  { id: 'Club',      label: 'Club',       color: '#8b5cf6', icon: 'clubs' },
  { id: 'Career',    label: 'Career',     color: '#0e9c8a', icon: 'jobs' },
];

export function EventPostScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();

  const [cat, setCat] = useState<Event['category']>('Academic');
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = title.trim() && venue.trim() && time.trim();

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('events').insert({
        title:      title.trim(),
        category:   cat,
        organizer:  organizer.trim() || 'Campus',
        venue:      venue.trim(),
        date:       date.trim() || new Date().toISOString().split('T')[0],
        time:       time.trim(),
        description: desc.trim(),
        created_by: user.id,
      });
      if (error) throw error;
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not post event. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Post an Event" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>CATEGORY</Text>
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
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>EVENT TITLE</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Tech Talk 2026"
          placeholderTextColor={C.textMuted}
        />

        {/* Organizer */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>ORGANIZER</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={organizer}
          onChangeText={setOrganizer}
          placeholder="e.g. CSE Department"
          placeholderTextColor={C.textMuted}
        />

        {/* Venue */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>VENUE</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={venue}
          onChangeText={setVenue}
          placeholder="e.g. Auditorium A"
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
              placeholder="e.g. Fri, 14 Jun"
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>TIME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={time}
              onChangeText={setTime}
              placeholder="3:00 PM"
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>

        {/* Description */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>DESCRIPTION</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={desc}
          onChangeText={setDesc}
          placeholder="Describe the event..."
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
