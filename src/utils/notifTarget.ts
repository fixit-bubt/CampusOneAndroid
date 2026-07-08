// Resolve a notification's reference to a navigable screen. Shared by the
// in-app NotifDetail "View details" button and the push-notification tap
// handler, so both land on the same place.
import { supabase } from '../lib/supabase';

export interface NavTarget {
  screen: string;
  params?: Record<string, unknown>;
}

const DIRECT: Record<string, { screen: string; key: string }> = {
  event:        { screen: 'EventDetail',        key: 'eventId'        },
  club:         { screen: 'ClubDetail',         key: 'clubId'         },
  lost_found:   { screen: 'LostFoundDetail',    key: 'itemId'         },
  market:       { screen: 'MarketDetail',       key: 'listingId'      },
  job:          { screen: 'JobDetail',          key: 'jobId'          },
  // study material/question notifications carry the course UUID.
  study_course: { screen: 'CourseDetail',       key: 'courseId'       },
};

export async function resolveNotifTarget(
  refType: string | null | undefined,
  refId: string | null | undefined,
): Promise<NavTarget | null> {
  if (!refType || !refId) return null;

  // Claim notifications carry the claim CODE - look up the item it belongs to.
  if (refType === 'claim') {
    const { data } = await supabase.from('claims').select('item_id').eq('code', refId).maybeSingle();
    return data?.item_id ? { screen: 'LostFoundDetail', params: { itemId: data.item_id } } : null;
  }
  // Report + announcement notifications carry the CODE; detail screens want the UUID.
  if (refType === 'report' || refType === 'reports') {
    const { data } = await supabase.from('reports').select('id').eq('code', refId).maybeSingle();
    return data?.id ? { screen: 'ReportDetail', params: { reportId: data.id } } : null;
  }
  if (refType === 'announcement') {
    const { data } = await supabase.from('announcements').select('id').eq('code', refId).maybeSingle();
    return data?.id ? { screen: 'AnnouncementDetail', params: { announcementId: data.id } } : null;
  }
  // Blood notifications carry a request code; there's no public per-request
  // detail for non-requesters, so land on the Blood screen.
  if (refType === 'blood_request') {
    return { screen: 'Blood' };
  }
  const m = DIRECT[refType];
  return m ? { screen: m.screen, params: { [m.key]: refId } } : null;
}
