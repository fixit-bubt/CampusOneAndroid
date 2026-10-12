import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Image, Modal, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, CacheKeys } from '../../services/cacheService';
import { openUrl } from '../../utils/link';
import { localToday } from '../../utils/format';
import {
  getEventLiveStatus,
  shareEventDetails,
  toggleBookmark,
  fetchUserEventBookmarks,
  type EventLiveStatus,
} from '../../services/eventsService';
import type { Event } from '../../types/database';

const CAT_COLOR: Record<string, string> = {
  Academic: SectorColors.reports,
  Cultural: SectorColors.events,
  Sports: SectorColors.market,
  Club: SectorColors.clubs,
  Career: SectorColors.jobs,
};

const CAT_ICON: Record<string, string> = {
  Academic: 'study',
  Cultural: 'star',
  Sports: 'pulse',
  Club: 'clubs',
  Career: 'jobs',
};

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
  const toast = useToast();

  const { eventId, id: paramId } = route.params ?? {};
  const id = eventId || paramId;

  const [event, setEvent] = useState<Event | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [going, setGoing] = useState(false);
  const [goingCount, setGoingCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [canCreateEvents, setCanCreateEvents] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc('can_create_events').then(({ data }) => setCanCreateEvents(!!data));
    if (id) {
      fetchUserEventBookmarks(user.id).then(bookmarks => {
        setIsSaved(bookmarks.has(id));
      });
    }
  }, [user?.id, id]);

  const load = useCallback(async () => {
    if (!id) {
      setNotFound(true);
      return;
    }

    const cached = await getCache<Event[]>(CacheKeys.EVENTS);
    const found = cached?.find(e => e.id === id);
    if (found) setEvent(found);

    try {
      const [evRes, rsvpRes, countRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).maybeSingle(),
        user
          ? supabase.from('event_rsvps').select('user_id').eq('event_id', id).eq('user_id', user.id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('event_rsvps').select('user_id', { count: 'exact', head: true }).eq('event_id', id),
      ]);

      if (evRes.error || !evRes.data) {
        if (!found) {
          if (evRes.error) console.error('event detail fetch error:', evRes.error.message);
          setNotFound(true);
        }
        return;
      }

      setEvent(evRes.data as Event);
      setGoing(!!rsvpRes.data);
      setGoingCount(countRes.count ?? 0);
    } catch (e) {
      if (!found) {
        console.error('EventDetail load error:', e);
        setNotFound(true);
      }
    }
  }, [id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRSVP() {
    if (!event || !user || busy) return;
    setBusy(true);

    if (going) {
      const { error } = await supabase
        .from('event_rsvps')
        .delete()
        .eq('event_id', id)
        .eq('user_id', user.id);

      if (!error) {
        setGoing(false);
        setGoingCount(c => Math.max(0, c - 1));
        toast({ type: 'success', title: 'RSVP Cancelled' });
      } else {
        console.error('RSVP delete error:', error.message);
        toast({ type: 'error', title: t.common.error });
      }
    } else {
      const { data, error } = await supabase.rpc('rsvp_event', { p_event_id: id });
      const res: any = Array.isArray(data) ? data[0] : data;

      if (error || !res?.ok) {
        if (res?.reason === 'full') toast({ type: 'info', title: t.events2.eventFull });
        else toast({ type: 'error', title: t.common.error });
      } else {
        setGoing(true);
        if (!res.already) setGoingCount(c => c + 1);
        setShowPassModal(true);
        toast({ type: 'success', title: "You're registered!", message: 'Your BUBT Event Pass is ready.' });
      }
    }
    setBusy(false);
  }

  async function handleToggleSave() {
    if (!id || !user?.id) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      await toggleBookmark(id);
      toast({
        type: 'success',
        title: nextSaved ? 'Event Saved' : 'Removed from Saved',
      });
    } catch {
      setIsSaved(!nextSaved);
    }
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Events" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {notFound ? (
            <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium }}>
              {t.common.error}
            </Text>
          ) : (
            <ActivityIndicator color={C.brand} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const fg = CAT_COLOR[event.category] ?? Accent.slate;
  const bg = `${fg}1e`;
  const { status, countdownText } = getEventLiveStatus(event);
  const isUpcoming = status !== 'Ended';
  const isFull = !!(event.capacity && goingCount >= event.capacity && !going);
  const canDelete = profile?.role === 'admin' || (event.created_by === user?.id && canCreateEvents);

  function deleteEvent() {
    Alert.alert('Delete event?', event!.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { data, error } = await supabase.from('events').delete().eq('id', id).select('id');
          if (error) {
            toast({ type: 'error', title: t.common.error, message: error.message });
            return;
          }
          if (!data || data.length === 0) {
            toast({ type: 'error', title: t.common.error, message: 'Not allowed to delete this event.' });
            return;
          }
          navigation.goBack();
        },
      },
    ]);
  }

  const passTicketCode = `PASS-${(event.code || 'EVT').slice(-6).toUpperCase()}-${(profile?.student_id || 'BUBT').replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Event Details"
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity onPress={handleToggleSave} hitSlop={8} activeOpacity={0.7} style={{ padding: 4 }}>
              <Feather name={isSaved ? 'bookmark' : 'bookmark'} size={19} color={isSaved ? C.warn : C.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => shareEventDetails(event)}
              hitSlop={8}
              activeOpacity={0.7}
              style={{ padding: 4 }}
            >
              <Feather name="share-2" size={18} color={C.text} />
            </TouchableOpacity>
            {canDelete && (
              <TouchableOpacity onPress={deleteEvent} hitSlop={8} activeOpacity={0.7} style={{ padding: 4 }}>
                <Feather name="trash-2" size={18} color={C.danger} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Flyer or Category Header */}
        {event.banner_url ? (
          <View style={styles.heroBannerWrap}>
            <Image source={{ uri: event.banner_url }} style={styles.heroBannerImg} resizeMode="cover" />
            <View style={styles.heroOverlayBadge}>
              <View style={[styles.statusTag, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        status === 'Ongoing' ? C.success : status === 'Today' ? C.warn : C.info,
                    },
                  ]}
                />
                <Text style={[styles.statusText, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  {status} · {countdownText}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.thumbLg, { backgroundColor: bg }]}>
            <Icon name={CAT_ICON[event.category] ?? 'events'} size={48} color={fg} />
            <View
              style={[
                styles.statusOverlay,
                {
                  backgroundColor:
                    status === 'Ongoing'
                      ? `${C.success}25`
                      : status === 'Today'
                      ? `${C.warn}25`
                      : `${C.info}25`,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      status === 'Ongoing' ? C.success : status === 'Today' ? C.warn : C.info,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      status === 'Ongoing' ? C.success : status === 'Today' ? C.warn : C.info,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
              >
                {status} · {countdownText}
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
          {event.title}
        </Text>

        {/* Category & Source Badges Row */}
        <View style={styles.badgeRow}>
          <View style={[styles.catPill, { backgroundColor: bg }]}>
            <Icon name={CAT_ICON[event.category] ?? 'events'} size={13} color={fg} />
            <Text style={[styles.catPillTxt, { color: fg, fontFamily: FontFamily.jakartaBold }]}>
              {event.category}
            </Text>
          </View>

          {event.source === 'bubt_news' && (
            <View style={[styles.officialTag, { backgroundColor: `${C.info}18` }]}>
              <Feather name="check-circle" size={12} color={C.info} style={{ marginRight: 4 }} />
              <Text style={[styles.officialTagTxt, { color: C.info, fontFamily: FontFamily.jakartaBold }]}>
                Official University Event
              </Text>
            </View>
          )}
        </View>

        {/* Schedule & Venue Grid */}
        <View style={[styles.infoGrid, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.infoCell, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.border }]}>
            <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t.events2.when}
            </Text>
            <View style={styles.infoVal}>
              <Icon name="clock" size={13} color={C.textMuted} />
              <Text style={[styles.infoTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                {event.date}
              </Text>
            </View>
            <Text style={[styles.infoSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {event.time}{event.end_time ? ` - ${event.end_time}` : ''}
            </Text>
          </View>

          <View style={styles.infoCell}>
            <Text style={[styles.infoLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t.events2.where}
            </Text>
            <View style={styles.infoVal}>
              <Icon name="pin" size={13} color={C.textMuted} />
              <Text style={[styles.infoTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                {event.venue}
              </Text>
            </View>
            <Text style={[styles.infoSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              BUBT Campus, Mirpur-2
            </Text>
          </View>
        </View>

        {/* Organizer Card (with tap to Club if linked) */}
        <TouchableOpacity
          disabled={!event.club_id}
          onPress={() => event.club_id && navigation.navigate('ClubDetail', { clubId: event.club_id })}
          style={[styles.byCard, { backgroundColor: C.surface, borderColor: C.border }]}
          activeOpacity={event.club_id ? 0.75 : 1}
        >
          <Avatar name={event.organizer} size="sm" style={{ borderRadius: 11, backgroundColor: bg }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.byName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {event.organizer}
            </Text>
            <Text style={[styles.bySub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              {event.club_id ? 'Tap to view club profile' : t.events2.organizer}
            </Text>
          </View>
          {event.club_id && <Icon name="chevR" size={18} color={C.textMuted} />}
        </TouchableOpacity>

        {/* Description Section */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
          {t.events2.about}
        </Text>
        <Text style={[styles.body, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
          {event.description}
        </Text>

        {/* External Link if Synced from BUBT */}
        {event.external_url && (
          <TouchableOpacity
            style={[styles.externalLinkBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => openUrl(event.external_url!)}
            activeOpacity={0.8}
          >
            <Feather name="external-link" size={15} color={C.brand} style={{ marginRight: 8 }} />
            <Text style={[styles.externalLinkTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
              View on official BUBT portal
            </Text>
          </TouchableOpacity>
        )}

        {/* Attendance Counter */}
        <View style={styles.attendRow}>
          <Icon name="directory" size={16} color={C.textMuted} />
          <Text style={[styles.attendTxt, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            {goingCount} attending
            {event.capacity ? ` · ${event.capacity} total capacity` : ''}
          </Text>
        </View>

        {/* Capacity Bar if Capacity Set */}
        {event.capacity && (
          <View style={[styles.capacityTrack, { backgroundColor: C.surface2 }]}>
            <View
              style={[
                styles.capacityFill,
                {
                  backgroundColor: isFull ? C.danger : C.brand,
                  width: `${Math.min(100, (goingCount / event.capacity) * 100)}%`,
                },
              ]}
            />
          </View>
        )}

        {/* Digital Event Pass Button (When Going) */}
        {going && (
          <TouchableOpacity
            style={[styles.ticketPassBtn, { backgroundColor: `${C.brand}18`, borderColor: C.brand }]}
            onPress={() => setShowPassModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="award" size={18} color={C.brand} style={{ marginRight: 8 }} />
            <Text style={[styles.ticketPassTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
              View BUBT Event Pass
            </Text>
          </TouchableOpacity>
        )}

        {/* RSVP Action Button */}
        {isUpcoming && (
          <TouchableOpacity
            style={[
              styles.rsvpBtn,
              going
                ? { backgroundColor: C.successBg, borderWidth: 1, borderColor: C.success }
                : isFull
                ? { backgroundColor: C.surface2, opacity: 0.6 }
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
                <Text
                  style={[
                    styles.btnTxt,
                    { color: going ? C.success : C.white, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  {going ? "You're Going (Tap to Cancel)" : isFull ? t.events2.eventFull : 'RSVP for Event'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Add to Google Calendar Action */}
        {isUpcoming && (
          <TouchableOpacity
            style={[styles.calBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => openUrl(gcalLink(event))}
            activeOpacity={0.8}
          >
            <Icon name="calendar" size={16} color={C.text2} style={{ marginRight: 8 }} />
            <Text style={[styles.calBtnTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
              Add to Google Calendar
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* Digital BUBT Event Pass Modal */}
      <Modal
        visible={showPassModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPassModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.passContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
            {/* Pass Header */}
            <View style={[styles.passHeader, { backgroundColor: SectorColors.reports }]}>
              <Text style={styles.passUniTitle}>BANGLADESH UNIVERSITY OF BUSINESS & TECHNOLOGY</Text>
              <Text style={styles.passSubTitle}>CAMPUS ENTRY PASS</Text>
            </View>

            {/* Pass Body */}
            <View style={styles.passBody}>
              <Text style={[styles.passEventTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={2}>
                {event.title}
              </Text>

              <View style={styles.passMetaGrid}>
                <View style={styles.passMetaCell}>
                  <Text style={[styles.passMetaLabel, { color: C.textMuted }]}>DATE</Text>
                  <Text style={[styles.passMetaVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {event.date}
                  </Text>
                </View>
                <View style={styles.passMetaCell}>
                  <Text style={[styles.passMetaLabel, { color: C.textMuted }]}>TIME</Text>
                  <Text style={[styles.passMetaVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {event.time}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={[styles.passMetaLabel, { color: C.textMuted }]}>VENUE</Text>
                <Text style={[styles.passMetaVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {event.venue}
                </Text>
              </View>

              {/* Student Details */}
              <View style={[styles.studentBox, { backgroundColor: C.bg, borderColor: C.border }]}>
                <View style={styles.studentRow}>
                  <Text style={[styles.passMetaLabel, { color: C.textMuted }]}>ATTENDEE</Text>
                  <Text style={[styles.studentName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {profile?.full_name || user?.email || 'BUBT Student'}
                  </Text>
                </View>
                <View style={styles.studentRow}>
                  <Text style={[styles.passMetaLabel, { color: C.textMuted }]}>STUDENT ID</Text>
                  <Text style={[styles.studentId, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                    {profile?.student_id || 'REGISTERED'}
                  </Text>
                </View>
              </View>

              {/* QR Representation */}
              <View style={[styles.qrWrapper, { borderColor: C.border }]}>
                <View style={[styles.qrBlock, { backgroundColor: C.surface2 }]}>
                  <Feather name="maximize" size={54} color={C.brand} />
                  <Text style={[styles.qrCodeText, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {passTicketCode}
                  </Text>
                </View>
                <Text style={[styles.qrHint, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  Scan or present at the auditorium door for entry
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: C.brand }]}
                onPress={() => setShowPassModal(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.closeModalTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  content: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  heroBannerWrap: { height: 180, borderRadius: 18, overflow: 'hidden', position: 'relative', marginBottom: 6 } as ViewStyle,
  heroBannerImg: { width: '100%', height: '100%' } as any,
  heroOverlayBadge: { position: 'absolute', top: 12, left: 12 } as ViewStyle,
  statusTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 } as ViewStyle,
  thumbLg: { height: 160, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' } as ViewStyle,
  statusOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  } as ViewStyle,
  statusDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  statusText: { fontSize: 11 } as any,
  title: { fontSize: 21, letterSpacing: -0.4, marginTop: 14, lineHeight: 28 } as any,
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' } as ViewStyle,
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 } as ViewStyle,
  catPillTxt: { fontSize: 12.5 } as any,
  officialTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 } as ViewStyle,
  officialTagTxt: { fontSize: 11.5 } as any,
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
  externalLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  } as ViewStyle,
  externalLinkTxt: { fontSize: 13.5 } as any,
  attendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 } as ViewStyle,
  attendTxt: { fontSize: 13 } as any,
  capacityTrack: { height: 6, borderRadius: 3, width: '100%', marginTop: 8, overflow: 'hidden' } as ViewStyle,
  capacityFill: { height: '100%', borderRadius: 3 } as ViewStyle,
  ticketPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 14,
  } as ViewStyle,
  ticketPassTxt: { fontSize: 14.5 } as any,
  rsvpBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  btnTxt: { fontSize: 15 } as any,
  calBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  } as ViewStyle,
  calBtnTxt: { fontSize: 14 } as any,
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  } as ViewStyle,
  passContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  passHeader: { paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' } as ViewStyle,
  passUniTitle: { fontSize: 11, color: '#fff', letterSpacing: 0.5, textAlign: 'center', fontWeight: 'bold' } as any,
  passSubTitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', letterSpacing: 1.5, marginTop: 2, fontWeight: 'bold' } as any,
  passBody: { padding: 18 } as ViewStyle,
  passEventTitle: { fontSize: 17, lineHeight: 22, textAlign: 'center' } as any,
  passMetaGrid: { flexDirection: 'row', gap: 12, marginTop: 14 } as ViewStyle,
  passMetaCell: { flex: 1 } as ViewStyle,
  passMetaLabel: { fontSize: 10.5, letterSpacing: 0.5, marginBottom: 2 } as any,
  passMetaVal: { fontSize: 13 } as any,
  studentBox: { padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 14, gap: 8 } as ViewStyle,
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as ViewStyle,
  studentName: { fontSize: 13 } as any,
  studentId: { fontSize: 13 } as any,
  qrWrapper: { alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth } as ViewStyle,
  qrBlock: { width: 140, height: 110, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6 } as ViewStyle,
  qrCodeText: { fontSize: 10, letterSpacing: 1 } as any,
  qrHint: { fontSize: 11, textAlign: 'center', marginTop: 8 } as any,
  closeModalBtn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18 } as ViewStyle,
  closeModalTxt: { fontSize: 14 } as any,
});
