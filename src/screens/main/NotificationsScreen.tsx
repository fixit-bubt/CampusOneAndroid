// Matches design screens-notif.jsx — NotifPanel
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { SectorIcon } from '../../components/ui/SectorIcon';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { SectorColors, type SectorKey } from '../../theme';
import {
  getMyNotifications, markAllRead, markRead,
  type Notification,
} from '../../services/notificationsService';

type Filter = 'all' | 'unread';

// Group notifications into buckets based on created_at
function bucket(n: Notification): 'new' | 'today' | 'earlier' {
  const now = Date.now();
  const age = now - new Date(n.created_at).getTime();
  if (age < 3 * 60 * 60 * 1000) return 'new';
  if (age < 24 * 60 * 60 * 1000) return 'today';
  return 'earlier';
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

// ── Single notification row ───────────────────────────────────────────────────
function NotifRow({ n, C, isDark, onPress }: { n: Notification; C: any; isDark: boolean; onPress: () => void }) {
  const sector: SectorKey = (n.sector in SectorColors) ? n.sector as SectorKey : 'announce';
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, !n.read && { backgroundColor: C.brand50 }]}
      activeOpacity={0.75}
    >
      <SectorIcon sector={sector} size="md" dark={isDark} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text
            style={[styles.rowTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }, !n.read && styles.unreadTitle]}
            numberOfLines={2}
          >
            {n.title}
          </Text>
          <Text style={[styles.rowTime, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
            {timeAgo(n.created_at)}
          </Text>
        </View>
        <Text style={[styles.rowText, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={2}>
          {n.body}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function Empty({ C }: { C: any }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: C.surface2 }]}>
        <Icon name="check" size={30} color={C.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
        All clear
      </Text>
      <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
        No notifications here
      </Text>
    </View>
  );
}

// ── NotificationsScreen ───────────────────────────────────────────────────────
export function NotificationsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const [notifs, setNotifs]     = useState<Notification[]>([]);
  const [filter, setFilter]     = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await getMyNotifications(50);
    if (res.ok) setNotifs(res.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleMarkAll() {
    if (!user?.id) return;
    await markAllRead(user.id);
    setNotifs(n => n.map(x => ({ ...x, read: true })));
  }

  async function handleOpen(n: Notification) {
    if (!n.read) {
      await markRead(n.id);
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    navigation.navigate('NotifDetail', { notification: n });
  }

  const unread = notifs.filter(n => !n.read).length;
  const list = filter === 'unread' ? notifs.filter(n => !n.read) : notifs;

  const BUCKET_LABELS = { new: t.mainx.notifBucketNew, today: t.mainx.notifBucketToday, earlier: t.mainx.notifBucketEarlier };
  const buckets = (['new', 'today', 'earlier'] as const)
    .map(b => ({ id: b, label: BUCKET_LABELS[b], items: list.filter(n => bucket(n) === b) }))
    .filter(g => g.items.length > 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* SubBar with mark-all + settings buttons */}
      <SubBar
        title="Alerts"
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.subRight}>
            <TouchableOpacity
              onPress={handleMarkAll}
              style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border, opacity: unread ? 1 : 0.4 }]}
              disabled={unread === 0}
            >
              <Icon name="checkAll" size={19} color={C.text2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
              onPress={() => navigation.navigate('NotifSettings')}
            >
              <Icon name="sliders" size={19} color={C.text2} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Filter chips */}
      <View style={[styles.chips, { paddingHorizontal: Layout.screenPadding }]}>
        {(['all', 'unread'] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[
              styles.chip,
              filter === f
                ? { backgroundColor: C.brand, borderColor: C.brand }
                : { backgroundColor: C.surface, borderColor: C.border },
            ]}
            onPress={() => setFilter(f)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, { color: filter === f ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {f === 'all' ? 'All' : 'Unread'}
            </Text>
            {f === 'all' && (
              <Text style={[styles.chipCount, { color: filter === f ? 'rgba(255,255,255,0.75)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {notifs.length}
              </Text>
            )}
            {f === 'unread' && unread > 0 && (
              <Text style={[styles.chipCount, { color: filter === f ? 'rgba(255,255,255,0.75)' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {unread}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {buckets.length === 0 ? (
          <Empty C={C} />
        ) : (
          buckets.map(g => (
            <View key={g.id}>
              <Text style={[styles.bucketLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold, marginLeft: Layout.screenPadding }]}>
                {g.label}
              </Text>
              <View style={[styles.group, { marginHorizontal: Layout.screenPadding, backgroundColor: C.surface, borderColor: C.border }]}>
                {g.items.map((n, i) => (
                  <View key={n.id}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                    <NotifRow n={n} C={C} isDark={isDark} onPress={() => handleOpen(n)} />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  subRight: {
    flexDirection: 'row',
    gap: 6,
  } as ViewStyle,

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
  } as ViewStyle,

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  } as ViewStyle,

  chipText: { fontSize: 13 } as any,
  chipCount: { fontSize: 12 } as any,

  bucketLabel: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginTop: 8,
    marginBottom: 7,
  } as any,

  group: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,

  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  } as ViewStyle,

  rowBody: { flex: 1 } as ViewStyle,

  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  } as ViewStyle,

  rowTitle: {
    fontSize: 13.5,
    flex: 1,
    lineHeight: 19,
  } as any,

  unreadTitle: { /* fontWeight 800 already via jakartaBold */ } as any,

  rowTime: {
    fontSize: 11,
    flexShrink: 0,
  } as any,

  rowText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  } as any,

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  } as ViewStyle,

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  emptyTitle: { fontSize: 16 } as any,
  emptySub: { fontSize: 13 } as any,
});
