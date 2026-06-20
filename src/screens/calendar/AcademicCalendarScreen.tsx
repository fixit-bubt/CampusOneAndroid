import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
  RefreshControl, TextInput, Modal, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { Pill } from '../../components/ui/Pill';
import { supabase } from '../../lib/supabase';
import { FontFamily, FontSize, Layout, Radius, Spacing, SectorColors } from '../../theme';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  event_type: 'holiday' | 'exam' | 'semester' | 'general';
  created_by: string | null;
  created_at: string;
}

const EVENT_TYPES = ['holiday', 'exam', 'semester', 'general'] as const;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TYPE_COLOR: Record<string, string> = {
  holiday: '#d63d35',
  exam: '#b9760a',
  semester: '#2b5be3',
  general: '#5b6b86',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getDate()} ${MONTHS[dt.getMonth()].slice(0, 3)}`;
}

export function AcademicCalendarScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const t = useT();
  const isAdmin = profile?.role === 'admin';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [fTitle, setFTitle] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fDate, setFDate] = useState('');
  const [fEndDate, setFEndDate] = useState('');
  const [fType, setFType] = useState<string>('general');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${getDaysInMonth(year, month)}`;
    const { data } = await supabase
      .from('academic_calendar')
      .select('*')
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date', { ascending: true });
    setEvents((data as CalendarEvent[]) ?? []);
  }, [year, month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const eventsByDate = new Map<number, CalendarEvent[]>();
  for (const e of events) {
    const day = parseInt(e.event_date.split('-')[2], 10);
    const arr = eventsByDate.get(day) ?? [];
    arr.push(e);
    eventsByDate.set(day, arr);
  }

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const todayDay = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : -1;

  function openAdd() {
    setEditEvent(null);
    setFTitle(''); setFDesc(''); setFDate(''); setFEndDate(''); setFType('general');
    setModalVisible(true);
  }

  function openEdit(ev: CalendarEvent) {
    setEditEvent(ev);
    setFTitle(ev.title);
    setFDesc(ev.description ?? '');
    setFDate(ev.event_date);
    setFEndDate(ev.end_date ?? '');
    setFType(ev.event_type);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!fTitle.trim() || !fDate.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: fTitle.trim(),
        description: fDesc.trim() || null,
        event_date: fDate.trim(),
        end_date: fEndDate.trim() || null,
        event_type: fType,
      };
      if (editEvent) {
        const { error } = await supabase.from('academic_calendar').update(payload).eq('id', editEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('academic_calendar').insert(payload);
        if (error) throw error;
      }
      setModalVisible(false);
      load();
    } catch {
      Alert.alert(t.common.error, t.calendar2.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(ev: CalendarEvent) {
    Alert.alert(t.calendar2.deleteEventTitle, t.calendar2.deleteEventBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive',
        onPress: async () => {
          await supabase.from('academic_calendar').delete().eq('id', ev.id);
          load();
        },
      },
    ]);
  }

  const typeLabel = (ty: string) => {
    const map: Record<string, string> = {
      holiday: t.calendar2.typeHoliday,
      exam: t.calendar2.typeExam,
      semester: t.calendar2.typeSemester,
      general: t.calendar2.typeGeneral,
    };
    return map[ty] ?? ty;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.calendar2.title}
        onBack={() => navigation.goBack()}
        rightSlot={isAdmin ? (
          <TouchableOpacity onPress={openAdd} hitSlop={8}>
            <Icon name="plus" size={22} color={C.brand} />
          </TouchableOpacity>
        ) : undefined}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {/* Month picker */}
        <View style={[styles.monthRow, { paddingHorizontal: Layout.screenPadding }]}>
          <TouchableOpacity onPress={prevMonth} hitSlop={12}>
            <Icon name="chevL" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {MONTHS[month]} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={12}>
            <Icon name="chevR" size={24} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        <View style={[styles.calendarCard, { backgroundColor: C.surface, borderColor: C.border, marginHorizontal: Layout.screenPadding }]}>
          <View style={styles.dayHeader}>
            {DAYS.map(d => (
              <Text key={d} style={[styles.dayLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {d}
              </Text>
            ))}
          </View>
          {weeks.map((wk, wi) => (
            <View key={wi} style={styles.weekRow}>
              {wk.map((day, di) => {
                const hasEvents = day ? eventsByDate.has(day) : false;
                const isToday = day === todayDay;
                return (
                  <View key={di} style={styles.dayCell}>
                    {day ? (
                      <View style={[
                        styles.dayCircle,
                        isToday && { backgroundColor: SectorColors.calendar },
                      ]}>
                        <Text style={[
                          styles.dayNum,
                          { color: isToday ? '#fff' : C.text, fontFamily: FontFamily.jakartaMedium },
                        ]}>
                          {day}
                        </Text>
                      </View>
                    ) : null}
                    {hasEvents && (
                      <View style={styles.dotRow}>
                        {(eventsByDate.get(day!) ?? []).slice(0, 3).map((e, i) => (
                          <View key={i} style={[styles.dot, { backgroundColor: TYPE_COLOR[e.event_type] ?? C.brand }]} />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Type legend */}
        <View style={[styles.legendRow, { paddingHorizontal: Layout.screenPadding }]}>
          {EVENT_TYPES.map(ty => (
            <View key={ty} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TYPE_COLOR[ty] }]} />
              <Text style={[styles.legendText, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {typeLabel(ty)}
              </Text>
            </View>
          ))}
        </View>

        {/* Events list */}
        <View style={{ paddingHorizontal: Layout.screenPadding, paddingBottom: 32 }}>
          {events.length === 0 ? (
            <Text style={[styles.empty, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.calendar2.noEvents}
            </Text>
          ) : (
            events.map(ev => (
              <TouchableOpacity
                key={ev.id}
                style={[styles.eventCard, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => isAdmin ? openEdit(ev) : undefined}
                onLongPress={() => isAdmin ? handleDelete(ev) : undefined}
                activeOpacity={isAdmin ? 0.7 : 1}
              >
                <View style={[styles.eventStripe, { backgroundColor: TYPE_COLOR[ev.event_type] }]} />
                <View style={styles.eventContent}>
                  <View style={styles.eventTopRow}>
                    <Text style={[styles.eventTitle, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]} numberOfLines={1}>
                      {ev.title}
                    </Text>
                    <Pill label={typeLabel(ev.event_type)} customColor={TYPE_COLOR[ev.event_type]} />
                  </View>
                  <Text style={[styles.eventDate, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                    {formatDate(ev.event_date)}{ev.end_date ? ` — ${formatDate(ev.end_date)}` : ''}
                  </Text>
                  {ev.description ? (
                    <Text style={[styles.eventDesc, { color: C.text3, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={2}>
                      {ev.description}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {editEvent ? t.calendar2.editEvent : t.calendar2.addEvent}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                <Icon name="x" size={22} color={C.text2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.calendar2.eventTitle}
              </Text>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={fTitle}
                onChangeText={setFTitle}
                placeholder={t.calendar2.titlePlaceholder}
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.calendar2.eventType}
              </Text>
              <View style={styles.typeRow}>
                {EVENT_TYPES.map(ty => (
                  <TouchableOpacity
                    key={ty}
                    style={[
                      styles.typeChip,
                      { borderColor: fType === ty ? TYPE_COLOR[ty] : C.border,
                        backgroundColor: fType === ty ? TYPE_COLOR[ty] + '18' : C.surface2 },
                    ]}
                    onPress={() => setFType(ty)}
                  >
                    <Text style={[styles.typeChipText, {
                      color: fType === ty ? TYPE_COLOR[ty] : C.text2,
                      fontFamily: FontFamily.jakartaMedium,
                    }]}>
                      {typeLabel(ty)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.calendar2.eventDate}
              </Text>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={fDate}
                onChangeText={setFDate}
                placeholder={t.calendar2.datePlaceholder}
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.calendar2.endDate}
              </Text>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={fEndDate}
                onChangeText={setFEndDate}
                placeholder={t.calendar2.endDatePlaceholder}
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.calendar2.description}
              </Text>
              <TextInput
                style={[styles.input, styles.multiline, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={fDesc}
                onChangeText={setFDesc}
                placeholder={t.calendar2.descPlaceholder}
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: SectorColors.calendar, opacity: saving || !fTitle.trim() || !fDate.trim() ? 0.5 : 1 }]}
                onPress={handleSave}
                disabled={saving || !fTitle.trim() || !fDate.trim()}
              >
                <Text style={[styles.saveBtnText, { fontFamily: FontFamily.jakartaBold }]}>
                  {t.calendar2.saveEvent}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 20 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing[4] },
  monthLabel: { fontSize: FontSize.xl },
  calendarCard: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing[3], marginBottom: Spacing[3] },
  dayHeader: { flexDirection: 'row', marginBottom: Spacing[2] },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: FontSize.xs },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 6, minHeight: 44 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: FontSize.sm },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3], marginBottom: Spacing[4] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs },
  empty: { textAlign: 'center', marginTop: Spacing[8], fontSize: FontSize.base },
  eventCard: { flexDirection: 'row', borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing[2], overflow: 'hidden' },
  eventStripe: { width: 4 },
  eventContent: { flex: 1, padding: Spacing[3] },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  eventTitle: { fontSize: FontSize.md, flex: 1, marginRight: 8 },
  eventDate: { fontSize: FontSize.sm, marginBottom: 2 },
  eventDesc: { fontSize: FontSize.sm, marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Layout.screenPadding, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[4] },
  modalTitle: { fontSize: FontSize['2xl'] },
  fieldLabel: { fontSize: FontSize.xs, letterSpacing: 0.5, marginBottom: Spacing[1], marginTop: Spacing[3] },
  input: { height: Layout.inputHeight, borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: Spacing[3], fontSize: FontSize.base },
  multiline: { height: 90, paddingTop: Spacing[2], textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  typeChip: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1 },
  typeChipText: { fontSize: FontSize.sm },
  saveBtn: { height: Layout.inputHeight, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing[5] },
  saveBtnText: { color: '#fff', fontSize: FontSize.base },
});
