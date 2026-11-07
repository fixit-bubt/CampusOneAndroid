import { usePdfViewer } from '../../components/pdf/usePdfViewer';
import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, RefreshControl, Linking, type ViewStyle, type TextStyle,
} from 'react-native';

import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../components/ui/Toast';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { useApp } from '../../store/appStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SkeletonList, LoadError } from '../../components/ui/LoadState';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import {
  minutesToHHMM,
  nowDhakaMinutes,
  formatTime12,
  fmtCountdown,
  nextDeparture,
  dhakaWeekday,
} from '../../utils/transitPrayer';
import type { BusRoute } from '../../types/database';
import { BusRouteEditorModal } from './BusRouteEditorModal';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';

const BUS_COLOR = SectorColors.bus;

export function BusScreen({ navigation }: any) {
  const pdfViewer = usePdfViewer();
  const { C } = useTheme();
  const toast = useToast();
  const t = useT();
  const { lang } = useApp();
  const isBn = lang === 'bn';
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [direction, setDirection] = useState<'to' | 'from'>(() => {
    const h = Math.floor(nowDhakaMinutes() / 60);
    return h >= 12 ? 'from' : 'to';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [busPdfUrl, setBusPdfUrl] = useState<string | null>(null);

  const directionTabs: TabItem<'to' | 'from'>[] = useMemo(
    () => [
      { id: 'to', label: isBn ? 'ক্যাম্পাসে আসা' : 'To Campus', icon: 'arrow-right', accentColor: BUS_COLOR },
      { id: 'from', label: isBn ? 'ক্যাম্পাস থেকে ফেরা' : 'From Campus', icon: 'arrow-left', accentColor: BUS_COLOR },
    ],
    [isBn]
  );

  const load = useCallback(async () => {
    // Instant cached official bus schedule circular PDF
    const cachedBusPdf = await getCache<string>(CacheKeys.BUS_SCHEDULE_PDF_URL);
    if (cachedBusPdf) setBusPdfUrl(cachedBusPdf);

    const cachedRoutes = await getCache<BusRoute[]>(CacheKeys.BUS_ROUTES);
    if (cachedRoutes && cachedRoutes.length > 0) {
      setRoutes(cachedRoutes);
      setLoading(false);
    }
    if (user?.id) {
      const cachedSaved = await getCache<string[]>(CacheKeys.SAVED_BUS_ROUTES(user.id));
      if (cachedSaved) setSavedIds(new Set(cachedSaved));
    }

    let query = supabase.from('bus_routes').select('*').order('name').limit(100);
    if (!isAdmin) {
      query = query.eq('active', true);
    }

    const [routesRes, savedRes] = await Promise.all([
      query,
      supabase.from('saved_bus_routes').select('route_id').eq('user_id', user?.id ?? '').limit(100),
    ]);

    // Fetch dynamic bus schedule PDF url from app_config if available
    supabase
      .from('app_config')
      .select('value')
      .eq('key', 'latest_bus_schedule_url')
      .maybeSingle()
      .then(({ data: cfg }) => {
        if (cfg?.value) {
          setBusPdfUrl(cfg.value);
          setCache(CacheKeys.BUS_SCHEDULE_PDF_URL, cfg.value);
        }
      });

    if (routesRes.error) {
      if (!cachedRoutes || cachedRoutes.length === 0) {
        setLoadFailed(true);
      } else {
        setIsOffline(true);
      }
      setLoading(false);
      return;
    }

    setLoadFailed(false);
    setIsOffline(false);
    setRoutes(routesRes.data as BusRoute[]);
    setCache(CacheKeys.BUS_ROUTES, routesRes.data as BusRoute[]);

    if (savedRes.data) {
      const ids = savedRes.data.map((r: any) => r.route_id);
      setSavedIds(new Set(ids));
      if (user?.id) setCache(CacheKeys.SAVED_BUS_ROUTES(user.id), ids);
    }
    setLoading(false);
  }, [user?.id, isAdmin]);

  useFocusRefresh(load);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function toggleSave(routeId: string) {
    if (!user) return;
    const isSaved = savedIds.has(routeId);
    setSavedIds(prev => { const n = new Set(prev); isSaved ? n.delete(routeId) : n.add(routeId); return n; });
    const { error } = isSaved
      ? await supabase.from('saved_bus_routes').delete().eq('route_id', routeId).eq('user_id', user.id)
      : await supabase.from('saved_bus_routes').upsert({ route_id: routeId, user_id: user.id }, { onConflict: 'user_id,route_id' });
    if (error && error.code !== '23505') {
      setSavedIds(prev => { const n = new Set(prev); isSaved ? n.add(routeId) : n.delete(routeId); return n; });
      toast({ type: 'error', title: t.common.error });
    }
  }

  function openEditor(r?: BusRoute) {
    setSelectedRoute(r ?? null);
    setEditorOpen(true);
  }

  function getDeparture(r: BusRoute) {
    const list = direction === 'to' ? (r.to_departures ?? []) : (r.from_departures ?? []);
    return nextDeparture(list);
  }

  const queryTrimmed = searchQuery.toLowerCase().trim();

  const filteredRoutes = useMemo(() => {
    if (!queryTrimmed) return routes;
    return routes.filter(r => {
      const nameMatch = r.name?.toLowerCase().includes(queryTrimmed);
      const areaMatch = r.area?.toLowerCase().includes(queryTrimmed);
      const busMatch = r.bus_no?.toLowerCase().includes(queryTrimmed);
      const stopsMatch = (r.stops ?? []).some(s => s.toLowerCase().includes(queryTrimmed));
      return nameMatch || areaMatch || busMatch || stopsMatch;
    });
  }, [routes, queryTrimmed]);

  const sortedRoutes = useMemo(() => {
    return [...filteredRoutes].sort((a, b) =>
      Number(savedIds.has(b.id)) - Number(savedIds.has(a.id)) || a.name.localeCompare(b.name)
    );
  }, [filteredRoutes, savedIds]);

  const hero = useMemo(() => {
    if (routes.length === 0) return null;
    const candidates = (savedIds.size > 0
      ? routes.filter(r => savedIds.has(r.id))
      : routes
    )
      .map(r => {
        const d = getDeparture(r);
        return d ? { route: r, ...d } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.wait - b.wait);

    if (candidates.length > 0) return candidates[0];

    const fallback = routes
      .map(r => {
        const d = getDeparture(r);
        return d ? { route: r, ...d } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.wait - b.wait);

    return fallback[0] ?? null;
  }, [routes, savedIds, direction]);

  const isFriday = dhakaWeekday() === 'Fri';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.bus2.scheduleTitle}
        onBack={() => navigation.goBack()}
        rightSlot={
          busPdfUrl ? (
            <TouchableOpacity
              style={[styles.pdfBtn, { borderColor: C.border }]}
              onPress={() => pdfViewer.open(busPdfUrl, 'Bus Schedule', 'Bus Schedule')}
              accessibilityLabel={isBn ? 'অফিসিয়াল বাস রুট শিডিউল পিডিএফ' : 'Official Bus Schedule PDF'}
              activeOpacity={0.7}
            >
              <Feather name="file-text" size={13} color={C.text2} />
              <Text style={[styles.pdfTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>PDF</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <OfflineBanner visible={isOffline} onRetry={load} />

        {/* 52dp Admin Add Bus Route Bar */}
        {isAdmin && (
          <View style={{ marginTop: 4, marginBottom: 8 }}>
            <TouchableOpacity
              style={[
                styles.addBusBar52,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                },
              ]}
              onPress={() => openEditor()}
              activeOpacity={0.75}
            >
              <Feather name="plus-circle" size={20} color={C.text} />
              <Text style={[styles.addBusBarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.bus2.addBusBar}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 58dp Direction Switcher */}
        <View style={{ marginTop: isAdmin ? 0 : 4, marginBottom: 8 }}>
          <SegmentedTabs<'to' | 'from'>
            tabs={directionTabs}
            activeTab={direction}
            onTabChange={setDirection}
          />
        </View>

        {/* 58dp Search Bar */}
        <View style={[styles.searchWrapper, { marginBottom: 12 }]}>
          <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Icon name="search" size={24} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              placeholder={isBn ? 'রুট, স্টপেজ বা এলাকা খুঁজুন…' : 'Search route, stop, or area…'}
              placeholderTextColor={C.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} style={{ padding: 4 }}>
                <Icon name="x" size={15} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Friday Notice Banner */}
        {isFriday && (
          <View style={[styles.noticeBanner, { backgroundColor: C.surface, borderColor: C.warn }]}>
            <Icon name="alert-triangle" size={16} color={C.warn} />
            <Text style={[styles.noticeText, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
              {isBn
                ? 'শুক্রবার নিয়মিত ক্লাসের শাটল বাস বন্ধ থাকে। বিশেষ পরীক্ষা বা ইভেন্টের বাস চলতে পারে।'
                : 'Friday service is suspended for regular classes. Special exam or event shuttles may operate.'}
            </Text>
          </View>
        )}

        {/* Next Departure Hero Card */}
        {hero && !searchQuery && (
          <TouchableOpacity
            style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => navigation.navigate('BusDetail', { id: hero.route.id, initialDirection: direction })}
            activeOpacity={0.8}
          >
            <View style={styles.heroTop}>
              <View style={[styles.heroBadge, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Feather name="clock" size={13} color={C.text} />
                <Text style={[styles.heroBadgeTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {direction === 'to'
                    ? (isBn ? 'ক্যাম্পাসে যাওয়ার পরবর্তী বাস' : 'Next shuttle to campus')
                    : (isBn ? 'ক্যাম্পাস থেকে ফেরার পরবর্তী বাস' : 'Next shuttle from campus')}
                </Text>
              </View>
              <View style={[styles.waitPill, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Text style={[styles.waitPillTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {hero.nextDayLabel === 'Sat'
                    ? (isBn ? 'শনিবার' : 'Saturday')
                    : hero.tomorrow
                    ? (isBn ? 'আগামীকাল' : 'Tomorrow')
                    : `in ${fmtCountdown(hero.wait)}`}
                </Text>
              </View>
            </View>

            <View style={styles.heroBody}>
              <Text style={[styles.heroTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {hero.route.name}
              </Text>
              <Text style={[styles.heroTime, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {formatTime12(minutesToHHMM(hero.mins))}
              </Text>
            </View>

            <View style={[styles.heroFooter, { borderColor: C.border }]}>
              <Text style={[styles.heroMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                {hero.route.bus_no ? `${hero.route.bus_no} · ` : ''}
                {direction === 'to'
                  ? (isBn ? `শুরু: ${hero.route.stops?.[0] ?? hero.route.area}` : `Starts from ${hero.route.stops?.[0] ?? hero.route.area}`)
                  : (isBn ? 'বিইউবিটি মেইন ক্যাম্পাস থেকে ছাড়বে' : 'Departs from BUBT Main Campus')}
              </Text>
              <Feather name="chevron-right" size={16} color={C.textMuted} />
            </View>
          </TouchableOpacity>
        )}

        {loading && routes.length === 0 ? (
          <SkeletonList />
        ) : loadFailed ? (
          <LoadError onRetry={load} />
        ) : sortedRoutes.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="bus" size={32} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {searchQuery ? t.common.noResults : t.bus2.noRoutes}
            </Text>
            {searchQuery ? (
              <TouchableOpacity
                style={[styles.clearBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => setSearchQuery('')}
                activeOpacity={0.75}
              >
                <Text style={[styles.clearBtnTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {isBn ? 'অনুসন্ধান মুছুন' : 'Clear search'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {sortedRoutes.map(r => {
              const dep = getDeparture(r);
              const isSaved = savedIds.has(r.id);
              const matchedStop = queryTrimmed
                ? (r.stops ?? []).find(s => s.toLowerCase().includes(queryTrimmed))
                : null;

              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => navigation.navigate('BusDetail', { id: r.id, initialDirection: direction })}
                  activeOpacity={0.75}
                >
                  <View style={styles.thumb}>
                    <Icon name="bus" size={32} color={C.text} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {r.name}
                    </Text>

                    <View style={styles.cardMetaRow}>
                      <Text style={[styles.cardStops, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                        {t.bus2.stopsCount((r.stops ?? []).length)} · {r.area}
                      </Text>
                      {r.bus_no && (
                        <View style={[styles.busNoBadge, { backgroundColor: C.surface2, borderColor: C.border }]}>
                          <Text style={[styles.busNoTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                            {r.bus_no}
                          </Text>
                        </View>
                      )}
                      {!r.active && (
                        <View style={[styles.suspendedBadge, { backgroundColor: C.surface2, borderColor: C.border }]}>
                          <Text style={[styles.suspendedTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                            {isBn ? 'স্থগিত' : 'Suspended'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {matchedStop && (
                      <View style={[styles.matchedPill, { backgroundColor: C.surface2, borderColor: C.border }]}>
                        <Feather name="map-pin" size={11} color={C.text} />
                        <Text style={[styles.matchedPillTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          {isBn ? `স্টপেজ: ${matchedStop}` : `Stops at ${matchedStop}`}
                        </Text>
                      </View>
                    )}

                    <View style={styles.cardMeta}>
                      <View style={[styles.timePill, { backgroundColor: C.surface2, borderColor: C.border }]}>
                        <Feather name="clock" size={12} color={C.text} />
                        <Text style={[styles.timeTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          {dep
                            ? `${dep.nextDayLabel === 'Sat' ? 'Sat' : dep.tomorrow ? 'Tmrw' : 'Next'}: ${formatTime12(minutesToHHMM(dep.mins))}`
                            : 'No service'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    {isAdmin && (
                      <TouchableOpacity
                        style={[styles.adminEditBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                        onPress={() => openEditor(r)}
                        hitSlop={8}
                        activeOpacity={0.7}
                      >
                        <Feather name="edit-2" size={13} color={C.text} />
                        <Text style={[styles.adminEditTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          {isBn ? 'এডিট' : 'Edit'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => toggleSave(r.id)} hitSlop={8} activeOpacity={0.7}>
                      <Feather name="star" size={18} color={isSaved ? C.text : C.textMuted} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Campus Transit & Helpline Footer */}
        <View style={[styles.transitFooter, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.transitRow}>
            <View style={styles.transitIconBox}>
              <Feather name="navigation" size={24} color={C.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.transitTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {isBn ? 'মেট্রোরেল ও ক্যাম্পাস সংযোগ' : 'Metro Rail & Campus Link'}
              </Text>
              <Text style={[styles.transitSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                {isBn
                  ? 'পল্লবী ও মিরপুর-১১ মেট্রো স্টেশন (MRT Line-6) রূপনগর ক্যাম্পাস থেকে ৫-১০ মিনিটের দূরত্বে।'
                  : 'Pallabi & Mirpur-11 Metro Stations (MRT Line-6) are 5-10 min from Rupnagar Campus.'}
              </Text>
            </View>
          </View>

          <View style={[styles.transitDivider, { backgroundColor: C.border }]} />

          <View style={styles.transitRow}>
            <View style={styles.transitIconBox}>
              <Feather name="phone-call" size={24} color={C.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.transitTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {isBn ? 'বিইউবিটি ট্রান্সপোর্ট ডেস্ক' : 'BUBT Transport Desk'}
              </Text>
              <Text style={[styles.transitSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                {isBn
                  ? 'ওয়ান স্টপ সার্ভিস হটলাইন: 01810033740 · বিইউবিটি আইডি কার্ডে ফ্রি'
                  : 'One Stop Service Hotline: 01810033740 · Free with BUBT ID'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.callBtn, { backgroundColor: C.success }]}
              onPress={() => Linking.openURL('tel:01810033740')}
              hitSlop={8}
              activeOpacity={0.8}
            >
              <Feather name="phone" size={13} color="#fff" />
              <Text style={[styles.callBtnTxt, { fontFamily: FontFamily.jakartaBold }]}>
                {isBn ? 'কল' : 'Call'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Admin: Full-page add/edit route modal */}
      <BusRouteEditorModal
        visible={editorOpen}
        route={selectedRoute}
        onClose={() => {
          setEditorOpen(false);
          setSelectedRoute(null);
        }}
        onSaveSuccess={(savedRoute) => {
          setRoutes((prev) => {
            const exists = prev.some((r) => r.id === savedRoute.id);
            if (exists) {
              return prev.map((r) => (r.id === savedRoute.id ? savedRoute : r));
            }
            return [...prev, savedRoute].sort((a, b) => a.name.localeCompare(b.name));
          });
          load();
        }}
        onDeleteSuccess={(deletedId) => {
          setRoutes((prev) => prev.filter((r) => r.id !== deletedId));
          load();
        }}
        currentPdfUrl={busPdfUrl}
        onPdfUrlUpdated={(newPdf) => setBusPdfUrl(newPdf)}
      />
          {pdfViewer.viewer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 6, paddingBottom: 24 } as ViewStyle,

  searchWrapper: {} as ViewStyle,
  searchBar: {
    height: Layout.controlHeight,
    borderRadius: Layout.controlRadius,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
  } as any,

  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  } as ViewStyle,
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  } as any,

  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  } as ViewStyle,
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  } as ViewStyle,
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'visible',
  } as ViewStyle,
  heroBadgeTxt: {
    fontSize: 12,
  } as any,
  waitPill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 20,
  } as ViewStyle,
  waitPillTxt: {
    fontSize: 11.5,
  } as any,
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  } as ViewStyle,
  heroTitle: {
    fontSize: 18,
    flex: 1,
  } as any,
  heroTime: {
    fontSize: 17,
  } as any,
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 8,
  } as ViewStyle,
  heroMeta: {
    fontSize: 12,
  } as any,

  list: { gap: 10 } as ViewStyle,
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  cardBody: { flex: 1 } as ViewStyle,
  cardTitle: {
    fontSize: 15,
  } as TextStyle,
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  } as ViewStyle,
  busNoBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  } as ViewStyle,
  busNoTxt: {
    fontSize: 11,
  } as TextStyle,
  cardStops: {
    fontSize: 12.5,
  } as TextStyle,
  matchedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  } as ViewStyle,
  matchedPillTxt: {
    fontSize: 11.5,
  } as TextStyle,
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  } as ViewStyle,
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  timeTxt: { fontSize: 11.5 } as TextStyle,

  empty: {
    alignItems: 'center',
    paddingTop: 50,
    gap: 12,
  } as ViewStyle,
  emptyTitle: { fontSize: 15 } as any,
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,
  clearBtnTxt: { fontSize: 13 } as any,

  transitFooter: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  } as ViewStyle,
  transitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  transitIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  transitTitle: {
    fontSize: 13.5,
  } as any,
  transitSub: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  } as any,
  transitDivider: {
    height: 1,
    opacity: 0.6,
  } as ViewStyle,
  callBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,
  callBtnTxt: {
    color: '#fff',
    fontSize: 12.5,
  } as any,

  addBusBar52: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  addBusBarTitle: {
    fontSize: 14.5,
  } as TextStyle,

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  adminEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  adminEditTxt: {
    fontSize: 11.5,
  } as TextStyle,
  suspendedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
  } as ViewStyle,
  suspendedTxt: {
    fontSize: 10,
  } as TextStyle,

  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  pdfTxt: {
    fontSize: 11.5,
  } as any,
});
