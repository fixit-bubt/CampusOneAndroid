import { Share } from 'react-native';
import { supabase } from '../lib/supabase';
import { localToday } from '../utils/format';
import type { Event } from '../types/database';

export type EventLiveStatus = 'Ongoing' | 'Today' | 'Upcoming' | 'Ended';

export interface EventStatusInfo {
  status: EventLiveStatus;
  label: string;
  badgeTone: 'emerald' | 'amber' | 'blue' | 'slate';
  countdownText: string;
}

/**
 * Calculates real-time 4-tier event status against Asia/Dhaka time.
 */
export function getEventLiveStatus(event: Event): EventStatusInfo {
  const today = localToday();
  const eventDate = event.date || '';

  // Get current Dhaka time in minutes from midnight
  const now = new Date();
  const dhakaFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = dhakaFormatter.formatToParts(now);
  const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const nowMinutes = currentHour * 60 + currentMinute;

  // Convert event time string "HH:MM" to minutes
  function timeToMinutes(t?: string | null): number {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  const startMinutes = timeToMinutes(event.time || '10:00');
  const endMinutes = event.end_time ? timeToMinutes(event.end_time) : startMinutes + 120; // default 2 hours

  if (eventDate < today) {
    return {
      status: 'Ended',
      label: 'Ended',
      badgeTone: 'slate',
      countdownText: 'Completed',
    };
  }

  if (eventDate > today) {
    // Calculate days away
    const todayDate = new Date(today);
    const evDate = new Date(eventDate);
    const diffDays = Math.round((evDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      status: 'Upcoming',
      label: 'Upcoming',
      badgeTone: 'blue',
      countdownText: diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`,
    };
  }

  // Event is TODAY
  if (nowMinutes < startMinutes) {
    const minsUntil = startMinutes - nowMinutes;
    const hoursUntil = Math.floor(minsUntil / 60);
    const timeCountdown = hoursUntil > 0 ? `Starts in ${hoursUntil}h` : `Starts in ${minsUntil}m`;
    return {
      status: 'Today',
      label: 'Today',
      badgeTone: 'amber',
      countdownText: timeCountdown,
    };
  }

  if (nowMinutes <= endMinutes) {
    return {
      status: 'Ongoing',
      label: 'Happening Now',
      badgeTone: 'emerald',
      countdownText: 'In Progress',
    };
  }

  return {
    status: 'Ended',
    label: 'Ended',
    badgeTone: 'slate',
    countdownText: 'Concluded today',
  };
}

/**
 * Fetch events feed with optional filters.
 */
export async function fetchEventsList(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .is('deleted_at', null)
    .order('date', { ascending: true });

  if (error) {
    console.error('fetchEventsList error:', error.message);
    throw error;
  }

  return (data || []) as Event[];
}

/**
 * Toggle RSVP status for an event (atomic).
 */
export async function toggleEventRSVP(
  eventId: string,
  userId: string,
  isCurrentlyGoing: boolean
): Promise<{ ok: boolean; going: boolean; reason?: string }> {
  if (isCurrentlyGoing) {
    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('toggleEventRSVP delete error:', error.message);
      return { ok: false, going: true, reason: error.message };
    }
    return { ok: true, going: false };
  } else {
    const { data, error } = await supabase.rpc('rsvp_event', { p_event_id: eventId });
    if (error) {
      console.error('toggleEventRSVP rsvp_event rpc error:', error.message);
      return { ok: false, going: false, reason: error.message };
    }
    const res: any = Array.isArray(data) ? data[0] : data;
    if (!res?.ok) {
      return { ok: false, going: false, reason: res?.reason || 'Event is full' };
    }
    return { ok: true, going: true };
  }
}

/**
 * Toggle bookmarked / saved event for student.
 */
export async function toggleBookmark(eventId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_event_bookmark', { p_event_id: eventId });
  if (error) {
    console.error('toggleBookmark error:', error.message);
    throw error;
  }
  return !!data;
}

/**
 * Fetch bookmarked event IDs for a user.
 */
export async function fetchUserEventBookmarks(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('event_bookmarks')
    .select('event_id')
    .eq('user_id', userId);

  if (error) {
    console.error('fetchUserEventBookmarks error:', error.message);
    return new Set();
  }
  return new Set((data || []).map((row: any) => row.event_id));
}

/**
 * Native OS share helper for event invitation.
 */
export async function shareEventDetails(event: Event): Promise<void> {
  const message = [
    `BUBT Campus Event: ${event.title}`,
    `Date: ${event.date} (${event.time}${event.end_time ? ' - ' + event.end_time : ''})`,
    `Venue: ${event.venue}`,
    `Organizer: ${event.organizer}`,
    '',
    event.description ? `${event.description.slice(0, 150)}...` : '',
    '',
    event.external_url ? `Official link: ${event.external_url}` : 'RSVP and join via CampusOne App!',
  ].filter(Boolean).join('\n');

  try {
    await Share.share({
      title: event.title,
      message,
    });
  } catch (err) {
    console.warn('Share event error:', err);
  }
}

/**
 * Invokes background BUBT crawler to auto-refresh campus events.
 */
export async function triggerBubtEventsSync(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('sync-events', {
    headers: { 'x-force-sync': 'true' },
  });
  if (error) throw error;
  return data;
}

