// Matches design screens-events.jsx — EventDetail with RSVP
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Linking, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
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

// Build a Google Calendar template link from event fields (web parity).
function gcalLink(ev: Event): string {
  const date = (ev.date ?? '').replace(/-/g, '');
  const details = encodeURIComponent(ev.description ?? '');
  const text = encodeURIComponent(ev.title ?? 'Campus event');
  const location = encodeURIComponent(ev.venue ?? '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${date}/${date}&details=${details}&location=${location}`;
}

export function EventDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const { eventId } = route.params ?? {};
  if (!eventId) return null;
  const id = eventId;

  const toast = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [going, setGoing] = useState(false);
  const [goingCount, setGoingCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [evRes, rsvpRes, countRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        user ? supabase.from('event_rsvps').select('user_id').eq('event_id', id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from('event_rsvps').select('user_id', { count: 'exact', head: true }).eq('event_id', id),
      ]);
      if (evRes.error) { console.error('event detail fetch:', evRes.error.message); return; }
      if (evRes.data) setEvent(evRes.data as Event);
      setGoing(!!rsvpRes.data);
      setGoingCount(countRes.count ?? 0);
    })();
  }, [id, user]);

  async function handleRSVP() {
    if (!event || !user || busy) return;
    setBusy(true);
    if (going) {
      const { error } = await supabase.from('event_rsvps').delete().eq('event_id', id).eq('user_id', user.id);
      if (!error) {
        setGoing(false);
        setGoingCount(c => Math.max(0, c - 1));
      } else {
        console.error('RSVP delete error:', error.message);
      }
    } else {
      const { error } = await supabase.from('event_rsvps').insert({ event_id: id, user_id: user.id });
      if (!error) {
        setGoing(true);
        setGoingCount(c => c + 1);
      } else {
        console.error('RSVP insert error:', error.message);
      }
    }
    setBusy(false);
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Events" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

  const fg = CAT_COLOR[event.category] ?? Accent.slate;
  const bg = `${fg}1e`;
  const isUpcoming = event.date >= new Date().toISOString().split('T')[0];
  const isFull = !!(event.capacity && goingCount >= event.capacity && !going);
  const canDelete = profile?.role === 'admin' || (event as any).created_by === user?.id;

  function deleteEvent() {
    Alert.alert('Delete event?', event!.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('events').delete().eq('id', id);
          if (error) { toast({ type: 'error', title: t.common.error, message: error.message }); return; }
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Events"
        onBack={() => navigation.goBack()}
        rightSlot={canDelete ? (
          <TouchableOpacity onPress={deleteEvent} hitSlop={8} activeOpacity={0.7} style={{ padding: 4 }}>
            <Feather name="trash-2" size={18} color={C.danger} />
          </TouchableOpacity>
        ) : undefined}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]} showsVerticalScrollIndicator={false}>
        {/* Large category thumb */}
        <View style={[styles.thumbLg, { backgroundColor: bg }]}>
          <Icon name={CAT_ICON[event.category] ?? 'events'} size={48} color={fg} />
          <View style={[styles.statusOverlay, isUpcoming ? { backgroundColor: C.infoBg } : { backgroundColor: C.surface2 }]}>
            <View style={[styles.statusDot, { backgroundColor: isUpcoming ? C.info : C.textMuted }]} />
            <Text style={[styles.statusText, { color: isUpcoming ? C.info : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {isUpcoming ? 'Upcoming' : 'Past'}
            </Text>
          </View>
        </View>

        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
          {event.title}
        </Text>

        {/* Category pill */}
        <View style={[styles.catPill, { backgroundColor: bg }]}>
          <Icon name={CAT_ICON[event.category] ?? 'events'} size={13} color={fg} />
          <Text style={[styles.catPillTxt, { color: fg, fontFamily: FontFamily.jakartaBold }]}>
            {event.category}
          </Text>
        </View>

        {/* Info grid */}
        <View style={[styles.infoGrid, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.infoCell, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.border }]}>
            <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.events2.when}</Text>
            <View style={styles.infoVal}>
              <Icon name="clock" size={13} color={C.textMuted} />
              <Text style={[styles.infoTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                {event.date}
              </Text>
            </View>
            <Text style={[styles.infoSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {event.time}{event.end_time ? ` – ${event.end_time}` : ''}
            </Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.events2.where}</Text>
            <View style={styles.infoVal}>
              <Icon name="pin" size={13} color={C.textMuted} />
              <Text style={[styles.infoTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                {event.venue}
              </Text>
            </View>
          </View>
        </View>

        {/* Organizer */}
        <View style={[styles.byCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Avatar name={event.organizer} size="sm" style={{ borderRadius: 11, backgroundColor: bg }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.byName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{event.organizer}</Text>
            <Text style={[styles.bySub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>{t.events2.organizer}</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.events2.about}</Text>
        <Text style={[styles.body, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>{event.description}</Text>

        {/* Attendance */}
        <View style={styles.attendRow}>
          <Icon name="directory" size={16} color={C.textMuted} />
          <Text style={[styles.attendTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            {goingCount} attending
            {event.capacity ? ` · ${event.capacity} capacity` : ''}
          </Text>
        </View>

        {/* RSVP button */}
        {isUpcoming && (
          <TouchableOpacity
            style={[
              styles.rsvpBtn,
              going
                ? { backgroundColor: C.successBg }
                : isFull
                ? { backgroundColor: C.surface2, opacity: 0.5 }
                : { backgroundColor: C.brand },
              { marginTop: 12 },
            ]}
            onPress={handleRSVP}
            disabled={isFull || busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={going ? C.success : C.white} />
            ) : (
              <View style={styles.btnRow}>
                <Icon name={going ? 'check' : 'events'} size={17} color={going ? C.success : C.white} />
                <Text style={[styles.btnTxt, { color: going ? C.success : C.white, fontFamily: FontFamily.jakartaBold }]}>
                  {going ? t.events2.going : isFull ? t.events2.eventFull : t.events2.rsvp}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Add to Google Calendar */}
        {isUpcoming && (
          <TouchableOpacity
            style={[styles.rsvpBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, marginTop: 10 }]}
            onPress={() => Linking.openURL(gcalLink(event))}
            activeOpacity={0.8}
          >
            <View style={styles.btnRow}>
              <Icon name="calendar" size={16} color={C.text2} />
              <Text style={[styles.btnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                Add to Google Calendar
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: 26 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  content: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  thumbLg: { height: 160, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' } as ViewStyle,
  statusOverlay: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusText: { fontSize: 11 } as any,
  title: { fontSize: 21, letterSpacing: -0.5, marginTop: 16, lineHeight: 28 } as any,
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start', marginTop: 8 } as ViewStyle,
  catPillTxt: { fontSize: 12.5 } as any,
  infoGrid: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginTop: 16 } as ViewStyle,
  infoCell: { flex: 1, padding: 14 } as ViewStyle,
  infoLabel: { fontSize: 11, letterSpacing: 0.4, marginBottom: 6 } as any,
  infoVal: { flexDirection: 'row', alignItems: 'center', gap: 5 } as ViewStyle,
  infoTxt: { fontSize: 13, flex: 1 } as any,
  infoSub: { fontSize: 12, marginTop: 4 } as any,
  byCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 12 } as ViewStyle,
  byName: { fontSize: 14 } as any,
  bySub: { fontSize: 12, marginTop: 2 } as any,
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 20, marginBottom: 8 } as any,
  body: { fontSize: 14.5, lineHeight: 22 } as any,
  attendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 } as ViewStyle,
  attendTxt: { fontSize: 13 } as any,
  rsvpBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  btnTxt: { fontSize: 15 } as any,
});
