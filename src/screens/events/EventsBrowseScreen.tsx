import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { Feather } from '@expo/vector-icons';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { localToday } from '../../utils/format';
import type { Event } from '../../types/database';

const CAT_COLOR: Record<string, string> = {
  Academic: SectorColors.reports, Cultural: SectorColors.events, Sports: SectorColors.market,
  Club: SectorColors.clubs, Career: SectorColors.jobs,
};
const CAT_ICON: Record<string, string> = {
  Academic: 'study', Cultural: 'star', Sports: 'pulse',
  Club: 'clubs', Career: 'jobs',
};

function EventCard({ e, C, onPress }: { e: Event; C: any; onPress: () => void }) {
  const fg = CAT_COLOR[e.category] ?? Accent.slate;
  const bg = `${fg}1e`;
  // Date-only compare so a today-dated event isn't mislabelled 'Past' while
  // the tab filter (also date-only) places it under Upcoming.
  const isUpcoming = e.date >= localToday();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]} activeOpacity={0.75}>
      <View style={[styles.thumb, { backgroundColor: bg }]}>
        <Icon name={CAT_ICON[e.category] ?? 'events'} size={22} color={fg} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
          {e.title}
        </Text>
        <View style={styles.cardLoc}>
          <Icon name="events" size={12} color={C.textMuted} />
          <Text style={[styles.cardLocTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
            {e.date} · {e.venue}
          </Text>
        </View>
        <View style={styles.cardMeta}>
          <View style={[styles.statusPill, { backgroundColor: isUpcoming ? C.infoBg : C.surface2 }]}>
            <View style={[styles.statusDot, { backgroundColor: isUpcoming ? C.info : C.textMuted }]} />
            <Text style={[styles.statusText, { color: isUpcoming ? C.info : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {isUpcoming ? 'Upcoming' : 'Past'}
            </Text>
          </View>
          {e.organizer && (
            <Text style={[styles.metaText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              by {e.organizer}
            </Text>
          )}
        </View>
      </View>
      <Icon name="chevR" size={18} color={C.textMuted} />
    </TouchableOpacity>
  );
}

export function EventsBrowseScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const [isEventOrganizer, setIsEventOrganizer] = useState(false);
  const canPost = profile?.role === 'admin' || isEventOrganizer;
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from('event_organizers').select('user_id').eq('user_id', user.id).limit(1),
      supabase.from('club_members').select('role').eq('user_id', user.id).in('role', ['president', 'vp']).limit(1),
    ]).then(([orgRes, clubRes]) => {
      setIsEventOrganizer((orgRes.data?.length ?? 0) > 0 || (clubRes.data?.length ?? 0) > 0);
    });
  }, [user?.id]);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [category, setCategory] = useState('All');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // Fetch upcoming and past separately. A single ascending limit(50) let past
    // events fill the quota and silently drop genuinely upcoming ones.
    const today = localToday();
    const [upRes, pastRes] = await Promise.all([
      supabase.from('events').select('*').gte('date', today).order('date', { ascending: true }).limit(50),
      supabase.from('events').select('*').lt('date', today).order('date', { ascending: false }).limit(50),
    ]);
    if (upRes.error || pastRes.error) { console.error('events fetch:', upRes.error?.message ?? pastRes.error?.message); return; }
    setEvents([...(upRes.data ?? []), ...(pastRes.data ?? [])] as Event[]);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const today = localToday();
  const byCat = category === 'All' ? events : events.filter(e => e.category === category);
  const upcoming = byCat.filter(e => e.date >= today);
  const past = byCat.filter(e => e.date < today);
  const list = filter === 'past' ? past : upcoming;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Events"
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={{ padding: 4, marginRight: 6 }}
              onPress={() => setView(v => (v === 'list' ? 'calendar' : 'list'))}
              activeOpacity={0.75}
            >
              <Feather name={view === 'list' ? 'calendar' : 'list'} size={20} color={C.text} />
            </TouchableOpacity>
            {canPost && (
              <TouchableOpacity style={{ padding: 4 }} onPress={() => navigation.navigate('EventPost')} activeOpacity={0.75}>
                <Feather name="plus" size={22} color={C.text} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <View style={[styles.chips, { paddingHorizontal: Layout.screenPadding }]}>
        {([['upcoming', t.events2.upcoming, upcoming.length], ['past', t.events2.past, past.length]] as const).map(([id, label, count]) => (
          <TouchableOpacity
            key={id}
            style={[styles.chip, filter === id ? { backgroundColor: C.brand, borderColor: C.brand } : { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setFilter(id)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, { color: filter === id ? C.white : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {label}
            </Text>
            <Text style={[styles.chipCount, { color: filter === id ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={[styles.catChips, { paddingHorizontal: Layout.screenPadding }]}
      >
        {['All', 'Academic', 'Cultural', 'Sports', 'Club', 'Career'].map(c => {
          const on = category === c;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, on
                ? { backgroundColor: C.surface2, borderColor: C.text2 }
                : { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setCategory(c)}
              activeOpacity={0.75}
            >
              <Text style={[styles.catChipTxt, { color: on ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {view === 'calendar' ? (() => {
          // Month grid — dots mark event days; tap a day to list its events.
          const base = new Date();
          base.setDate(1);
          base.setMonth(base.getMonth() + monthOffset);
          const year = base.getFullYear();
          const month = base.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const firstDow = new Date(year, month, 1).getDay();
          const iso = (d: number) =>
            `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const eventDays = new Set(byCat.map(e => e.date));
          const cells: (number | null)[] = [
            ...Array.from({ length: firstDow }, () => null),
            ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
          ];
          const dayEvents = selectedDay ? byCat.filter(e => e.date === selectedDay) : [];
          return (
            <View>
              <View style={styles.calNav}>
                <TouchableOpacity onPress={() => { setSelectedDay(null); setMonthOffset(o => o - 1); }} hitSlop={10} activeOpacity={0.7}>
                  <Feather name="chevron-left" size={22} color={C.text} />
                </TouchableOpacity>
                <Text style={[styles.calTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                  {base.toLocaleString('en', { month: 'long' })} {year}
                </Text>
                <TouchableOpacity onPress={() => { setSelectedDay(null); setMonthOffset(o => o + 1); }} hitSlop={10} activeOpacity={0.7}>
                  <Feather name="chevron-right" size={22} color={C.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.calGrid}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <View key={`h${i}`} style={styles.calCell}>
                    <Text style={[styles.calHead, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{d}</Text>
                  </View>
                ))}
                {cells.map((d, i) => {
                  if (d === null) return <View key={`e${i}`} style={styles.calCell} />;
                  const dayISO = iso(d);
                  const has = eventDays.has(dayISO);
                  const isToday = dayISO === today;
                  const isSel = selectedDay === dayISO;
                  return (
                    <TouchableOpacity
                      key={dayISO}
                      style={[styles.calCell, isSel && { backgroundColor: C.brand, borderRadius: 10 },
                        !isSel && isToday && { backgroundColor: C.surface2, borderRadius: 10 }]}
                      onPress={() => setSelectedDay(isSel ? null : dayISO)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.calDay, {
                        color: isSel ? C.white : isToday ? C.brand : C.text,
                        fontFamily: has || isToday ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                      }]}>
                        {d}
                      </Text>
                      {has && <View style={[styles.calDot, { backgroundColor: isSel ? C.white : C.brand }]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedDay && (
                <View style={[styles.list, { marginTop: 14 }]}>
                  {dayEvents.length === 0 ? (
                    <Text style={[styles.emptyTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium, fontSize: 13, textAlign: 'center' }]}>
                      No events this day
                    </Text>
                  ) : dayEvents.map(e => (
                    <EventCard key={e.id} e={e} C={C} onPress={() => navigation.navigate('EventDetail', { eventId: e.id })} />
                  ))}
                </View>
              )}
            </View>
          );
        })() : list.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="events" size={28} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              No {filter} events
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {list.map(e => (
              <EventCard
                key={e.id}
                e={e}
                C={C}
                onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}
              />
            ))}
          </View>
        )}
        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 10 } as ViewStyle,
  catChips: { flexDirection: 'row', gap: 7, paddingBottom: 10 } as ViewStyle,
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } as ViewStyle,
  calTitle: { fontSize: 15 } as any,
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' } as ViewStyle,
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 8, gap: 2 } as ViewStyle,
  calHead: { fontSize: 10.5 } as any,
  calDay: { fontSize: 13 } as any,
  calDot: { width: 5, height: 5, borderRadius: 2.5 } as ViewStyle,
  catChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  catChipTxt: { fontSize: 11.5 } as any,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  chipText: { fontSize: 12.5 } as any,
  chipCount: { fontSize: 12 } as any,
  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,
  list: { gap: 10 } as ViewStyle,
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  thumb: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  cardBody: { flex: 1 } as ViewStyle,
  cardTitle: { fontSize: 14 } as any,
  cardLoc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 } as ViewStyle,
  cardLocTxt: { fontSize: 12 } as any,
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 } as ViewStyle,
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusText: { fontSize: 11 } as any,
  metaText: { fontSize: 12 } as any,
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 } as ViewStyle,
  emptyTitle: { fontSize: 16 } as any,
});
