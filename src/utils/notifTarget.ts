// Resolve a notification's reference to a navigable screen. Shared by the
// in-app NotifDetail "View details" button and the push-notification tap
// handler, so both land on the same place.
import { supabase } from '../lib/supabase';
import { personName } from '../services/peopleService';

export interface NavTarget {
  screen: string;
  params?: Record<string, unknown>;
}

export const SECTOR_FALLBACK: Record<string, string> = {
  announce:   'Announcements',
  events:     'EventsBrowse',
  clubs:      'Clubs',
  lostfound:  'LostFoundBrowse',
  reports:    'CampusIssues',
  jobs:       'JobsBrowse',
  market:     'Market',
  ride:       'Rides',
  blood:      'Blood',
  study:      'StudyHub',
  directory:  'Directory',
  bus:        'Bus',
  prayer:     'Prayer',
  medical:    'Medical',
  faculty:    'Faculty',
  calendar:   'AcademicCalendar',
  routines:   'RoutinesBrowse',
  coverpage:  'CoverPageForm',
  messages:   'Messages',
};

const DIRECT: Record<string, { screen: string; key: string }> = {
  event:            { screen: 'EventDetail',        key: 'eventId'   },
  events:           { screen: 'EventDetail',        key: 'eventId'   },
  club:             { screen: 'ClubDetail',         key: 'clubId'    },
  clubs:            { screen: 'ClubDetail',         key: 'clubId'    },
  lost_found:       { screen: 'LostFoundDetail',    key: 'itemId'    },
  lost_found_item:  { screen: 'LostFoundDetail',    key: 'itemId'    },
  lostfound:        { screen: 'LostFoundDetail',    key: 'itemId'    },
  market:           { screen: 'MarketDetail',       key: 'listingId' },
  listing:          { screen: 'MarketDetail',       key: 'listingId' },
  job:              { screen: 'JobDetail',          key: 'jobId'     },
  jobs:             { screen: 'JobDetail',          key: 'jobId'     },
  study_course:     { screen: 'CourseDetail',       key: 'courseId'  },
  study:            { screen: 'CourseDetail',       key: 'courseId'  },
  ride:             { screen: 'RideDetail',         key: 'rideId'    },
  rides:            { screen: 'RideDetail',         key: 'rideId'    },
};

export async function resolveNotifTarget(
  refType: string | null | undefined,
  refId: string | null | undefined,
  sector?: string | null | undefined,
): Promise<NavTarget | null> {
  const normType = refType?.trim().toLowerCase();
  const rawId = refId?.trim();

  // If reference ID or type is absent, attempt clean sector fallback
  if (!normType || !rawId) {
    if (sector && SECTOR_FALLBACK[sector]) {
      return { screen: SECTOR_FALLBACK[sector] };
    }
    return null;
  }

  // Claim notifications carry the claim CODE - look up the item it belongs to.
  if (normType === 'claim') {
    const { data } = await supabase.from('claims').select('item_id').eq('code', rawId).maybeSingle();
    if (data?.item_id) return { screen: 'LostFoundDetail', params: { itemId: data.item_id } };
    return { screen: 'LostFoundBrowse' };
  }

  // Report notifications carry either the UUID or code (e.g. RPT-1234)
  if (normType === 'report' || normType === 'reports') {
    if (rawId.length === 36 && rawId.includes('-')) {
      return { screen: 'ReportDetail', params: { reportId: rawId } };
    }
    const { data } = await supabase.from('reports').select('id').eq('code', rawId).maybeSingle();
    if (data?.id) return { screen: 'ReportDetail', params: { reportId: data.id } };
    return { screen: 'CampusIssues' };
  }

  // Announcement notifications carry either UUID or code
  if (normType === 'announcement' || normType === 'announce') {
    if (rawId.length === 36 && rawId.includes('-')) {
      return { screen: 'AnnouncementDetail', params: { announcementId: rawId } };
    }
    const { data } = await supabase.from('announcements').select('id').eq('code', rawId).maybeSingle();
    if (data?.id) return { screen: 'AnnouncementDetail', params: { announcementId: data.id } };
    return { screen: 'Announcements' };
  }

  // Marketplace listings: can be UUID or code (e.g. from moderation)
  if (normType === 'listing' || normType === 'market') {
    if (rawId.length === 36 && rawId.includes('-')) {
      return { screen: 'MarketDetail', params: { listingId: rawId } };
    }
    const { data } = await supabase.from('listings').select('id').eq('code', rawId).maybeSingle();
    if (data?.id) return { screen: 'MarketDetail', params: { listingId: data.id } };
    return { screen: 'Market' };
  }

  // Blood pledge alert (for requester) carries request UUID; open BloodRequestDetail
  if (normType === 'blood_pledge' || normType === 'blood_pledge_cancelled') {
    return { screen: 'BloodRequestDetail', params: { requestId: rawId } };
  }

  // Blood request / fulfilled alerts carry request code; land on Blood screen with requestCode
  if (normType === 'blood_request' || normType === 'blood_request_fulfilled') {
    return { screen: 'Blood', params: { requestCode: rawId } };
  }

  // Connection request/accepted - land on specific Directory tabs.
  if (normType === 'connection_request') {
    return { screen: 'Directory', params: { tab: 'requests' } };
  }
  if (normType === 'connection_accepted') {
    return { screen: 'Directory', params: { tab: 'connections' } };
  }

  // DM notification - reference_id is the sender's id. Open their thread.
  if (normType === 'dm') {
    const name = await personName(rawId);
    return { screen: 'MessageThread', params: { kind: 'dm', id: rawId, title: name ?? 'Chat' } };
  }

  const m = DIRECT[normType];
  if (m) {
    return { screen: m.screen, params: { [m.key]: rawId } };
  }

  // Fallback to sector landing if known
  if (sector && SECTOR_FALLBACK[sector]) {
    return { screen: SECTOR_FALLBACK[sector] };
  }

  return null;
}
