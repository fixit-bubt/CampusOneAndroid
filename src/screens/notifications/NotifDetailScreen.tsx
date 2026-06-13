// Matches design screens-notif.jsx — NotifDetail
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { SectorIcon } from '../../components/ui/SectorIcon';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';

const SECTOR_LABELS: Record<string, string> = {
  reports: 'Reports', lostfound: 'Lost & Found', clubs: 'Clubs', events: 'Events',
  jobs: 'Jobs', announce: 'Announcements', study: 'Study Hub', bus: 'Bus',
  medical: 'Medical', market: 'Marketplace', ride: 'Ride Share', blood: 'Blood',
  directory: 'Directory', prayer: 'Prayer', faculty: 'Faculty',
};

const SCREEN_MAP: Record<string, { screen: string; key: string }> = {
  report:       { screen: 'ReportDetail',       key: 'reportId'       },
  reports:      { screen: 'ReportDetail',       key: 'reportId'       },
  event:        { screen: 'EventDetail',        key: 'eventId'        },
  announcement: { screen: 'AnnouncementDetail', key: 'announcementId' },
  club:         { screen: 'ClubDetail',         key: 'clubId'         },
  lost_found:   { screen: 'LostFoundDetail',    key: 'itemId'         },
  market:       { screen: 'MarketDetail',       key: 'listingId'      },
  job:          { screen: 'JobDetail',          key: 'jobId'          },
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'Just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

export function NotifDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const { notification: n } = route.params;
  const sectorLabel = SECTOR_LABELS[n.sector] ?? n.sector;

  async function markUnread() {
    await supabase.from('notifications').update({ read: false }).eq('id', n.id);
    navigation.goBack();
  }

  async function muteSector() {
    if (!user?.id) return;
    await supabase.from('notif_prefs').upsert({ user_id: user.id, sector: n.sector, enabled: false });
    navigation.goBack();
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={sectorLabel} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <SectorIcon sector={n.sector} size="lg" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.time, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
              {timeAgo(n.created_at) === 'Just now' ? t.notif.justNow : t.notif.timeAgo(timeAgo(n.created_at))}
            </Text>
          </View>
        </View>

        {/* Title + body */}
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{n.title}</Text>
        <Text style={[styles.body, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>{n.body}</Text>

        {/* Related card */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>{t.notif.relatedTo}</Text>
        <TouchableOpacity
          style={[styles.relatedCard, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => {
            if (!n.reference_id) return;
            const m = SCREEN_MAP[n.reference_type ?? ''];
            if (m) navigation.navigate(m.screen as any, { [m.key]: n.reference_id });
          }}
          activeOpacity={0.75}
        >
          <SectorIcon sector={n.sector} size="sm" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.relatedTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{sectorLabel}</Text>
            <Text style={[styles.relatedSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.notif.viewDetails}</Text>
          </View>
          <Icon name="chevR" size={18} color={C.textMuted} />
        </TouchableOpacity>

        {/* Primary action */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: C.brand }]}
          onPress={() => {
            if (!n.reference_id) return;
            const m = SCREEN_MAP[n.reference_type ?? ''];
            if (m) navigation.navigate(m.screen as any, { [m.key]: n.reference_id });
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.actionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>{t.notif.viewDetails}</Text>
          <Icon name="chevR" size={18} color="#fff" />
        </TouchableOpacity>

        {/* Secondary actions */}
        <View style={styles.secondaryRow}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={markUnread}
            activeOpacity={0.85}
          >
            <Icon name="bell" size={16} color={C.text} />
            <Text style={[styles.secondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>{t.notif.markUnread}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={muteSector}
            activeOpacity={0.85}
          >
            <Icon name="bellOff" size={16} color={C.text} />
            <Text style={[styles.secondaryTxt, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>{t.notif.muteSector(sectorLabel)}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 16, paddingBottom: 20 } as ViewStyle,
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 } as ViewStyle,
  time: { fontSize: 13, marginTop: 6 } as any,
  title: { fontSize: 21, letterSpacing: -0.4, lineHeight: 28, marginTop: 18 } as any,
  body: { fontSize: 15, lineHeight: 22.5, marginTop: 10 } as any,
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 20, marginBottom: 9 } as any,
  relatedCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  relatedTitle: { fontSize: 14 } as any,
  relatedSub: { fontSize: 12.5, marginTop: 1 } as any,
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, marginTop: 18 } as ViewStyle,
  actionTxt: { fontSize: 15 } as any,
  secondaryRow: { flexDirection: 'row', gap: 10, marginTop: 10 } as ViewStyle,
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 44, borderRadius: 12, borderWidth: 1 } as ViewStyle,
  secondaryTxt: { fontSize: 13.5 } as any,
});
