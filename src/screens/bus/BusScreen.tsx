import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal, ScrollView,
  StyleSheet, RefreshControl, KeyboardAvoidingView, Linking, ActivityIndicator, type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../components/ui/Toast';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { useApp } from '../../store/appStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { SkeletonList, LoadError } from '../../components/ui/LoadState';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { openUrl } from '../../utils/link';
import {
  minutesToHHMM,
  nowDhakaMinutes,
  formatTime12,
  fmtCountdown,
  nextDeparture,
  dhakaWeekday,
} from '../../utils/transitPrayer';
import type { BusRoute } from '../../types/database';

const BUS_COLOR = SectorColors.bus;
const BUS_BG    = `${SectorColors.bus}1e`;

interface RouteForm {
  id: string | null;
  name: string;
  area: string;
  bus_no: string;
  helper_name: string;
  helper_phone: string;
  stops: string;
  to_departures: string;
  from_departures: string;
}

const csv = (a: string[] | null | undefined) => (a ?? []).join(', ');
const uncsv = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

export function BusScreen({ navigation }: any) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
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
  const [form, setForm] = useState<RouteForm | null>(null);
  const [saving, setSaving] = useState(false);
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

    const [routesRes, savedRes] = await Promise.all([
      supabase.from('bus_routes').select('*').eq('active', true).order('name').limit(50),
      supabase.from('saved_bus_routes').select('route_id').eq('user_id', user?.id ?? '').limit(50),
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
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
    setForm(r ? {
      id: r.id,
      name: r.name ?? '',
      area: r.area ?? '',
      bus_no: r.bus_no ?? '',
      helper_name: r.helper_name ?? '',
      helper_phone: r.helper_phone ?? '',
      stops: csv(r.stops),
      to_departures: csv(r.to_departures),
      from_departures: csv(r.from_departures),
    } : {
      id: null, name: '', area: '', bus_no: '', helper_name: '', helper_phone: '',
      stops: '', to_departures: '', from_departures: '',
    });
  }

  async function saveRoute() {
    if (!form || !form.name.trim() || saving) return;
    setSaving(true);
    const row = {
      name: form.name.trim(),
      area: form.area.trim() || '',
      bus_no: form.bus_no.trim() || null,
      helper_name: form.helper_name.trim() || null,
      helper_phone: form.helper_phone.trim() || null,
      stops: uncsv(form.stops),
      to_departures: uncsv(form.to_departures),
      from_departures: uncsv(form.from_departures),
      active: true,
    };
    if (form.id) {
      const { error } = await supabase.from('bus_routes').update(row).eq('id', form.id);
      if (error) {
        setSaving(false);
        toast({ type: 'error', title: t.common.error, message: error.message });
        return;
      }
    } else {
      const slug = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      const id = slug || `br-${Date.now().toString(36)}`;
      const { error } = await supabase.from('bus_routes').insert({ id, ...row });
      if (error) {
        setSaving(false);
        toast({ type: 'error', title: t.common.error, message: error.message });
        return;
      }
    }
    setSaving(false);
    setForm(null);
    load();
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
        rightSlot={(
          <View style={styles.headerActions}>
            {busPdfUrl ? (
              <TouchableOpacity
                style={[styles.pdfBtn, { borderColor: C.border }]}
                onPress={() => openUrl(busPdfUrl)}
                accessibilityLabel={isBn ? 'অফিসিয়াল বাস রুট শিডিউল পিডিএফ' : 'Official Bus Schedule PDF'}
                activeOpacity={0.7}
              >
                <Feather name="file-text" size={13} color={C.text2} />
                <Text style={[styles.pdfTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>PDF</Text>
              </TouchableOpacity>
            ) : null}
            {isAdmin && (
              <TouchableOpacity onPress={() => openEditor()} hitSlop={8} activeOpacity={0.7}>
                <Feather name="plus-circle" size={20} color={BUS_COLOR} />
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* 58dp Direction Switcher */}
      <View style={{ paddingHorizontal: Layout.screenPadding, marginTop: 4, marginBottom: 8 }}>
        <SegmentedTabs<'to' | 'from'>
          tabs={directionTabs}
          activeTab={direction}
          onTabChange={setDirection}
        />
      </View>

      {/* 58dp Search Bar */}
      <View style={[styles.searchWrapper, { paddingHorizontal: Layout.screenPadding, marginBottom: 8 }]}>
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Icon name="search" size={18} color={C.textMuted} />
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

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <OfflineBanner visible={isOffline} onRetry={load} />

        {/* Friday Notice Banner */}
        {isFriday && (
          <View style={[styles.noticeBanner, { backgroundColor: C.surface, borderColor: C.warn }]}>
            <Icon name="alert-triangle" size={16} color={C.warn} />
            <Text style={[styles.noticeText, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
              {isBn
                ? 'শুক্রবার নিয়মিত ক্লাসের শাটল বাস বন্ধ থাকে। বিশেষ পরীক্ষা বা ইভেন্টের বাস চলতে পারে।'
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
              <View style={[styles.heroBadge, { backgroundColor: BUS_BG }]}>
                <AnimatedIcon key={direction} family="feather" name="clock" size={13} color={BUS_COLOR} animation="spring" />
                <Text style={[styles.heroBadgeTxt, { color: BUS_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                  {direction === 'to'
                    ? (isBn ? 'ক্যাম্পাসে যাওয়ার পরবর্তী বাস' : 'Next shuttle to campus')
                    : (isBn ? 'ক্যাম্পাস থেকে ফেরার পরবর্তী বাস' : 'Next shuttle from campus')}
                </Text>
              </View>
              <View style={[styles.waitPill, { backgroundColor: hero.tomorrow ? C.surface2 : `${BUS_COLOR}1e` }]}>
                <Text style={[styles.waitPillTxt, { color: hero.tomorrow ? C.textMuted : BUS_COLOR, fontFamily: FontFamily.jakartaBold }]}>
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
              <Text style={[styles.heroTime, { color: BUS_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                {formatTime12(minutesToHHMM(hero.mins))}
              </Text>
            </View>

            <View style={[styles.heroFooter, { borderColor: C.border }]}>
              <Text style={[styles.heroMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                {hero.route.bus_no ? `${hero.route.bus_no} · ` : ''}
                {direction === 'to'
                  ? (isBn ? `শুরু: ${hero.route.stops?.[0] ?? hero.route.area}` : `Starts from ${hero.route.stops?.[0] ?? hero.route.area}`)
                  : (isBn ? 'বিইউবিটি মেইন ক্যাম্পাস থেকে ছাড়বে' : 'Departs from BUBT Main Campus')}
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
                  <View style={[styles.thumb, { backgroundColor: BUS_BG }]}>
                    <Icon name="bus" size={22} color={BUS_COLOR} />
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardTitleRow}>
                      <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {r.name}
                      </Text>
                      {r.bus_no && (
                        <View style={[styles.busNoBadge, { backgroundColor: C.surface2, borderColor: C.border }]}>
                          <Text style={[styles.busNoTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                            {r.bus_no}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.cardStops, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                      {t.bus2.stopsCount((r.stops ?? []).length)} · {r.area}
                    </Text>

                    {matchedStop && (
                      <View style={[styles.matchedPill, { backgroundColor: `${C.brand}14` }]}>
                        <Feather name="map-pin" size={11} color={C.brand} />
                        <Text style={[styles.matchedPillTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                          {isBn ? `স্টপেজ: ${matchedStop}` : `Stops at ${matchedStop}`}
                        </Text>
                      </View>
                    )}

                    <View style={styles.cardMeta}>
                      <View style={[styles.timePill, { backgroundColor: `${BUS_COLOR}1e` }]}>
                        <View style={[styles.timeDot, { backgroundColor: BUS_COLOR }]} />
                        <Text style={[styles.timeTxt, { color: BUS_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                          {dep
                            ? `${dep.nextDayLabel === 'Sat' ? 'Sat' : dep.tomorrow ? 'Tmrw' : 'Next'}: ${formatTime12(minutesToHHMM(dep.mins))}`
                            : 'No service'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {isAdmin && (
                    <TouchableOpacity onPress={() => openEditor(r)} hitSlop={8} activeOpacity={0.7}>
                      <Feather name="edit-2" size={16} color={C.textMuted} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => toggleSave(r.id)} hitSlop={8} activeOpacity={0.7}>
                    <Feather name="star" size={18} color={isSaved ? BUS_COLOR : C.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Campus Transit & Helpline Footer */}
        <View style={[styles.transitFooter, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.transitRow}>
            <View style={[styles.transitIconBox, { backgroundColor: `${C.brand}1e` }]}>
              <Feather name="navigation" size={18} color={C.brand} />
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
            <View style={[styles.transitIconBox, { backgroundColor: `${C.success}1e` }]}>
              <Feather name="phone-call" size={18} color={C.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.transitTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {isBn ? 'বিইউবিটি ট্রান্সপোর্ট ডেস্ক' : 'BUBT Transport Desk'}
              </Text>
              <Text style={[styles.transitSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                {isBn
                  ? 'ওয়ান স্টপ সার্ভিস হটলাইন: 01810033740 · বিইউবিটি আইডি কার্ডে ফ্রি'
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

      {/* Admin: add/edit route modal */}
      <Modal visible={!!form} transparent animationType="slide" onRequestClose={() => setForm(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setForm(null)} />
          <View style={[styles.sheet, { backgroundColor: C.surface, paddingBottom: Math.max(insets.bottom + 16, 36) }]}>
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {form?.id ? t.bus2.editRoute : t.bus2.addRoute}
            </Text>
            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              {([
                ['name', t.bus2.fieldName],
                ['area', t.bus2.fieldArea],
                ['bus_no', t.bus2.fieldBusNo],
                ['helper_name', t.bus2.fieldHelperName],
                ['helper_phone', t.bus2.fieldHelperPhone],
                ['stops', t.bus2.fieldStops],
                ['to_departures', t.bus2.fieldToTimes],
                ['from_departures', t.bus2.fieldFromTimes],
              ] as [keyof RouteForm, string][]).map(([key, label]) => (
                <TextInput
                  key={key}
                  style={[styles.sheetInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  value={(form?.[key] as string) ?? ''}
                  onChangeText={val => setForm(f => f ? { ...f, [key]: val } : f)}
                  placeholder={label}
                  placeholderTextColor={C.textMuted}
                />
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.sheetBtn, { backgroundColor: BUS_COLOR, opacity: form?.name.trim() && !saving ? 1 : 0.5 }]}
              onPress={saveRoute}
              disabled={!form?.name.trim() || saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.sheetBtnTxt, { fontFamily: FontFamily.jakartaBold }]}>{t.bus2.saveRoute}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  cardTitle: {
    fontSize: 14.5,
    flexShrink: 1,
  } as any,
  busNoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  } as ViewStyle,
  busNoTxt: {
    fontSize: 10.5,
  } as any,
  cardStops: {
    fontSize: 12,
    marginTop: 3,
  } as any,
  matchedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginTop: 4,
  } as ViewStyle,
  matchedPillTxt: {
    fontSize: 11,
  } as any,
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  } as ViewStyle,
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  } as ViewStyle,
  timeDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  timeTxt: { fontSize: 11 } as any,

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

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
  } as ViewStyle,
  sheetTitle: { fontSize: 17, marginBottom: 12 } as any,
  sheetInput: {
    height: Layout.controlHeight,
    borderRadius: Layout.controlRadius,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 10,
  } as any,
  sheetBtn: {
    height: Layout.controlHeight,
    borderRadius: Layout.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  } as ViewStyle,
  sheetBtnTxt: { color: '#fff', fontSize: 15 } as any,

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
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
