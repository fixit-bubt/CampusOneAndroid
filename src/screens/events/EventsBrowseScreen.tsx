// Matches design screens-events.jsx — EventsBrowse
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { Feather } from '@expo/vector-icons';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
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
  const isUpcoming = new Date(e.date) >= new Date();
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
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })
      .limit(50);
    if (error) { console.error('events fetch:', error.message); return; }
    if (data) setEvents(data as Event[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.date >= today);
  const past = events.filter(e => e.date < today);
  const list = filter === 'past' ? past : upcoming;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Events"
        onBack={() => navigation.goBack()}
        rightSlot={canPost ? (
          <TouchableOpacity style={{ padding: 4 }} onPress={() => navigation.navigate('EventPost')} activeOpacity={0.75}>
            <Feather name="plus" size={22} color={C.text} />
          </TouchableOpacity>
        ) : undefined}
      />

      <View style={[styles.chips, { paddingHorizontal: Layout.screenPadding }]}>
        {([['upcoming', 'Upcoming', upcoming.length], ['past', 'Past', past.length]] as const).map(([id, label, count]) => (
          <TouchableOpacity
            key={id}
            style={[styles.chip, filter === id ? { backgroundColor: C.brand, borderColor: C.brand } : { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setFilter(id)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, { color: filter === id ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {label}
            </Text>
            <Text style={[styles.chipCount, { color: filter === id ? 'rgba(255,255,255,0.7)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {list.length === 0 ? (
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
