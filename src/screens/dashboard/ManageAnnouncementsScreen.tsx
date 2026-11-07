import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from '../../components/layout/SafeAreaView';

import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { FontFamily, Layout } from '../../theme';
import { useAuth } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import { formatRelativeTime } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import type { Announcement } from '../../types/database';
import {
  fetchAnnouncementsFeed,
  triggerNoticeSync,
  updateAnnouncementBannerStatus,
} from '../../services/announcementService';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';

interface SyncLog {
  id: string;
  created_at?: string;
  status: string;
  total_scanned?: number;
  new_added?: number;
  updated_count?: number;
  duration_ms?: number;
}

type FilterType = 'all' | 'manual' | 'scraped' | 'banner';

interface FilterOption {
  id: FilterType;
  label: string;
  icon: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'All Notices', icon: 'layers' },
  { id: 'manual', label: 'Manual Broadcasts', icon: 'send' },
  { id: 'scraped', label: 'BUBT Scraped', icon: 'globe' },
  { id: 'banner', label: 'Home Hero Banner', icon: 'image' },
];

export function ManageAnnouncementsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [filterPickerVisible, setFilterPickerVisible] = useState(false);
  const [lastSyncLog, setLastSyncLog] = useState<SyncLog | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 180);
    return () => clearTimeout(handler);
  }, [search]);

  const loadData = useCallback(async () => {
    try {
      const [res, logRes] = await Promise.all([
        fetchAnnouncementsFeed(),
        supabase
          .from('crawler_audit_logs' as any)
          .select('*')
          .eq('feature', 'notices')
          .order('created_at', { ascending: false })
          .limit(1),
      ]);
      if (res.items) {
        setAnnouncements(res.items);
      }
      if (logRes.data && logRes.data[0]) {
        setLastSyncLog(logRes.data[0] as unknown as SyncLog);
      } else {
        const { data: legacyLog } = await supabase
          .from('notice_sync_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);
        if (legacyLog && legacyLog[0]) {
          setLastSyncLog(legacyLog[0] as unknown as SyncLog);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusRefresh(loadData);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Android hardware back button handler for bottom sheet
  useEffect(() => {
    const onBackPress = () => {
      if (filterPickerVisible) {
        setFilterPickerVisible(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [filterPickerVisible]);

  const handleSyncCrawler = async () => {
    if (syncing) return;
    setSyncing(true);
    toast({ type: 'info', title: 'Crawler Syncing', message: 'Checking BUBT notice board for new circulars...' });
    try {
      const res = await triggerNoticeSync(false, true);
      if (res.success) {
        toast({
          type: 'success',
          title: 'Sync Complete',
          message: res.newAdded ? `Ingested ${res.newAdded} new notices.` : 'All notices are up to date.',
        });
        await loadData();
      } else {
        toast({ type: 'error', title: 'Sync Failed', message: res.error });
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleBanner = async (item: Announcement) => {
    setBusyId(item.id);
    const nextInBanner = !item.in_banner;

    setAnnouncements((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, in_banner: nextInBanner } : a))
    );

    try {
      const res = await updateAnnouncementBannerStatus(item.id, nextInBanner);
      if (!res.success) throw new Error(res.error);
      toast({
        type: 'success',
        title: nextInBanner ? 'Added to Home Banner' : 'Removed from Banner',
        message: `"${item.title.slice(0, 26)}..." banner status updated.`,
      });
    } catch (err: any) {
      toast({ type: 'error', title: 'Update Failed', message: err.message });
      loadData();
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePin = async (item: Announcement) => {
    setBusyId(item.id);
    const nextPinned = !item.pinned;

    setAnnouncements((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, pinned: nextPinned } : a))
    );

    try {
      const { error } = await supabase
        .from('announcements')
        .update({ pinned: nextPinned })
        .eq('id', item.id);
      if (error) throw error;
      toast({
        type: 'success',
        title: nextPinned ? 'Pinned to Top' : 'Unpinned',
        message: 'Notice pin status updated.',
      });
    } catch (err: any) {
      toast({ type: 'error', title: 'Pin Failed', message: err.message });
      loadData();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (item: Announcement) => {
    Alert.alert('Delete Notice', `Are you sure you want to delete "${item.title.slice(0, 32)}..."?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setAnnouncements((prev) => prev.filter((a) => a.id !== item.id));
          const { error } = await supabase
            .from('announcements')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', item.id);
          if (error) {
            toast({ type: 'error', title: 'Delete Failed', message: error.message });
            loadData();
          } else {
            toast({ type: 'success', title: 'Deleted', message: 'Notice deleted successfully.' });
          }
        },
      },
    ]);
  };

  const filteredItems = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return announcements.filter((a) => {
      if (activeFilter === 'manual' && a.source !== 'manual') return false;
      if (activeFilter === 'scraped' && a.source === 'manual') return false;
      if (activeFilter === 'banner' && !a.in_banner) return false;

      if (q) {
        const matchTitle = (a.title || '').toLowerCase().includes(q);
        const matchDept = (a.department || '').toLowerCase().includes(q);
        const matchCode = (a.code || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDept && !matchCode) return false;
      }
      return true;
    });
  }, [announcements, activeFilter, debouncedSearch]);

  const currentFilterOption = useMemo(() => {
    return FILTER_OPTIONS.find((opt) => opt.id === activeFilter) || FILTER_OPTIONS[0];
  }, [activeFilter]);

  if (profile?.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Announcements & Circulars" onBack={() => navigation.goBack()} />
        <View style={styles.centerPad}>
          <Icon name="shield" size={36} color={C.textMuted} />
          <Text style={[styles.blockedTitle, { color: C.text }]}>Admin Access Required</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={{ paddingTop: 8 }}>
      {/* 1. Post Announcement 58dp Action Bar */}
      <TouchableOpacity
        style={[styles.postBar58, { backgroundColor: C.brand }]}
        onPress={() => navigation.navigate('AnnouncePost')}
        activeOpacity={0.85}
      >
        <Feather name="plus-circle" size={18} color="#fff" />
        <Text style={[styles.postBar58Txt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
          Post New Announcement
        </Text>
      </TouchableOpacity>

      {/* 2. BUBT Notice Board Automated Sync Card (Matches Manage Faculty Sync Card) */}
      <View style={[styles.syncCard, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={styles.syncCardTop}>
          <View style={styles.syncIconWrap}>
            <AnimatedIcon name="refresh-cw" size={32} color={C.text} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={[styles.syncTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              BUBT Official Notice Board
            </Text>
            <Text style={[styles.syncSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              {lastSyncLog?.created_at
                ? `Last crawl: ${formatRelativeTime(lastSyncLog.created_at)}`
                : 'Automated crawler for bubt.edu.bd/notice'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.syncActionBtn, { backgroundColor: C.brand }]}
          onPress={handleSyncCrawler}
          disabled={syncing}
          activeOpacity={0.85}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="globe" size={18} color="#fff" />
              <Text style={[styles.syncActionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                Sync from BUBT Website
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 3. 58dp Global Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
        <Icon name="search" size={22} color={C.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search notices..."
          placeholderTextColor={C.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Feather name="x" size={16} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* 4. 58dp Dropdown Selector Bar */}
      <TouchableOpacity
        style={[styles.dropdownBar, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={() => setFilterPickerVisible(true)}
        activeOpacity={0.75}
      >
        <View style={styles.dropdownIconTile}>
          <AnimatedIcon name={currentFilterOption.icon} size={28} color={C.text} />
        </View>
        <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
          <Text style={[styles.dropdownValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {currentFilterOption.label}
          </Text>
        </View>
        <Feather name="chevron-down" size={18} color={C.textMuted} />
      </TouchableOpacity>

      {/* 5. Results Count & Clear Filter Header */}
      <View style={styles.resultsHead}>
        <Text style={[styles.resultsTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
          {filteredItems.length} {filteredItems.length === 1 ? 'NOTICE FOUND' : 'NOTICES FOUND'}
        </Text>
        {(search.length > 0 || activeFilter !== 'all') && (
          <TouchableOpacity
            onPress={() => {
              setSearch('');
              setActiveFilter('all');
            }}
            hitSlop={8}
          >
            <Text style={[styles.clearTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
              Clear Filter
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Announcements & Circulars" onBack={() => navigation.goBack()} />

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />
        }
        ListHeaderComponent={renderHeader()}
        renderItem={({ item }) => {
          const isBusy = busyId === item.id;
          const isOfficial = item.source !== 'manual';

          return (
            <TouchableOpacity
              style={[styles.noticeCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => navigation.navigate('AnnouncementDetail', { announcementId: item.id })}
              activeOpacity={0.75}
            >
              {/* Top Row: Ref Code, Department, Discreet Source Badge */}
              <View style={styles.cardTopRow}>
                <View style={styles.cardTopLeft}>
                  <Text style={[styles.codeTxt, { color: C.text2 }]}>{item.code || 'NOTICE'}</Text>
                  <Text style={[styles.dotTxt, { color: C.textMuted }]}>·</Text>
                  <Text style={[styles.deptTxt, { color: C.textMuted }]} numberOfLines={1}>
                    {item.department_code || item.department || 'General'}
                  </Text>
                </View>

                <View style={[styles.sourceBadge, { backgroundColor: C.surface2, borderColor: C.border }]}>
                  <Text style={[styles.sourceBadgeTxt, { color: C.text2 }]}>
                    {isOfficial ? 'BUBT Official' : 'Manual'}
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={2}>
                {item.title}
              </Text>

              {/* Date Metadata */}
              <Text style={[styles.cardDate, { color: C.textMuted }]}>
                {formatRelativeTime(item.created_at)}
              </Text>

              {/* Disciplined Control Toolbar (Zero Color Clutter) */}
              <View style={[styles.cardBottomRow, { borderTopColor: C.border }]}>
                {/* 1. Toggle Banner Button */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: item.in_banner ? C.surface2 : C.surface,
                      borderColor: item.in_banner ? C.border2 : C.border,
                    },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleBanner(item);
                  }}
                  disabled={isBusy}
                  activeOpacity={0.8}
                >
                  <Feather
                    name={item.in_banner ? 'check' : 'image'}
                    size={13}
                    color={item.in_banner ? C.text : C.textMuted}
                  />
                  <Text
                    style={[
                      styles.actionBtnTxt,
                      { color: item.in_banner ? C.text : C.textMuted },
                    ]}
                  >
                    {item.in_banner ? 'In Banner' : '+ Banner'}
                  </Text>
                </TouchableOpacity>

                {/* 2. Toggle Pin Button */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: item.pinned ? C.surface2 : C.surface,
                      borderColor: item.pinned ? C.border2 : C.border,
                    },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleTogglePin(item);
                  }}
                  disabled={isBusy}
                  activeOpacity={0.8}
                >
                  <Icon
                    name="pin"
                    size={12}
                    color={item.pinned ? C.text : C.textMuted}
                  />
                  <Text
                    style={[
                      styles.actionBtnTxt,
                      { color: item.pinned ? C.text : C.textMuted },
                    ]}
                  >
                    {item.pinned ? 'Pinned' : 'Pin'}
                  </Text>
                </TouchableOpacity>

                <View style={{ flex: 1 }} />

                {/* 3. Delete Button */}
                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(item);
                  }}
                  disabled={isBusy}
                  activeOpacity={0.8}
                >
                  <Feather name="trash-2" size={14} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerPad}>
              <ActivityIndicator size="small" color={C.brand} />
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="file-text" size={26} color={C.textMuted} />
              <Text style={[styles.emptyCardTitle, { color: C.text }]}>No Notices Found</Text>
              <Text style={[styles.emptyCardSub, { color: C.textMuted }]}>
                No announcements match your search or selected filter.
              </Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />

      {/* Bottom Sheet Filter Modal (58dp items inside) */}
      <Modal
        visible={filterPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterPickerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setFilterPickerVisible(false)}
          />
          <View style={[styles.sheetCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sheetHandle}>
              <View style={[styles.sheetHandleBar, { backgroundColor: C.border }]} />
            </View>

            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Filter Announcements
            </Text>

            {FILTER_OPTIONS.map((opt) => {
              const active = activeFilter === opt.id;
              const count =
                opt.id === 'all'
                  ? announcements.length
                  : opt.id === 'manual'
                  ? announcements.filter((a) => a.source === 'manual').length
                  : opt.id === 'scraped'
                  ? announcements.filter((a) => a.source !== 'manual').length
                  : announcements.filter((a) => a.in_banner).length;

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.pickerBar58,
                    {
                      backgroundColor: active
                        ? isDark
                          ? 'rgba(62, 125, 224, 0.16)'
                          : 'rgba(62, 125, 224, 0.08)'
                        : C.surface2,
                      borderColor: active ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => {
                    setActiveFilter(opt.id);
                    setFilterPickerVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.pickerIconTile}>
                    <AnimatedIcon
                      name={opt.icon}
                      size={28}
                      color={active ? C.brand : C.text}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                    <Text
                      style={[
                        styles.pickerBarText,
                        {
                          color: active ? C.brand : C.text,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {opt.label} ({count})
                    </Text>
                  </View>
                  {active ? (
                    <View style={[styles.checkCircle, { backgroundColor: C.brand }]}>
                      <Feather name="check" size={13} color="#fff" />
                    </View>
                  ) : (
                    <View style={[styles.emptyCircle, { borderColor: C.border }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  } as ViewStyle,
  scroll: {
    paddingBottom: 24,
  } as ViewStyle,
  centerPad: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  blockedTitle: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 16,
    marginTop: 14,
  } as TextStyle,

  // 1. Post Announcement 58dp Bar
  postBar58: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: Layout.controlHeight,
    borderRadius: 16,
    marginBottom: 10,
  } as ViewStyle,
  postBar58Txt: {
    fontSize: 14.5,
  } as TextStyle,

  // 2. BUBT Notice Board Sync Card (Matches ManageFacultyScreen.tsx)
  syncCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  } as ViewStyle,
  syncCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  } as ViewStyle,
  syncIconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  syncTitle: {
    fontSize: 14.5,
  } as TextStyle,
  syncSub: {
    fontSize: 12,
    marginTop: 2,
  } as TextStyle,
  syncActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: Layout.controlHeight,
    borderRadius: 16,
  } as ViewStyle,
  syncActionTxt: {
    fontSize: 14.5,
  } as TextStyle,

  // 3. 58dp Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    height: Layout.controlHeight,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,

  // 4. 58dp Dropdown Trigger Bar
  dropdownBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: Layout.controlHeight,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  dropdownIconTile: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  dropdownValue: {
    fontSize: 14,
  } as TextStyle,

  // Results meta header
  resultsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 10,
    paddingHorizontal: 2,
  } as ViewStyle,
  resultsTxt: {
    fontSize: 11.5,
    letterSpacing: 0.8,
  } as TextStyle,
  clearTxt: {
    fontSize: 12.5,
  } as TextStyle,

  // Notice card (Anti-clutter, clean monochrome)
  noticeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  } as ViewStyle,
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  } as ViewStyle,
  codeTxt: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 11.5,
  } as TextStyle,
  dotTxt: {
    fontSize: 12,
  } as TextStyle,
  deptTxt: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 11.5,
    flex: 1,
  } as TextStyle,
  sourceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  } as ViewStyle,
  sourceBadgeTxt: {
    fontFamily: FontFamily.jakartaSemiBold,
    fontSize: 10,
  } as TextStyle,
  cardTitle: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 14,
    lineHeight: 19,
  } as TextStyle,
  cardDate: {
    fontFamily: FontFamily.jakartaRegular,
    fontSize: 11,
    marginTop: -2,
  } as TextStyle,
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 2,
  } as ViewStyle,
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,
  actionBtnTxt: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 11.5,
  } as TextStyle,
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  emptyCard: {
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,
  emptyCardTitle: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 14,
    marginTop: 4,
  } as TextStyle,
  emptyCardSub: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 12,
    textAlign: 'center',
  } as TextStyle,

  // Bottom sheet modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  } as ViewStyle,
  modalBackdrop: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0,0,0,0.5)',
  } as ViewStyle,
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Layout.screenPadding + 16,
  } as ViewStyle,
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 10,
  } as ViewStyle,
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  } as ViewStyle,
  sheetTitle: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 16,
  } as TextStyle,

  // 58dp Picker Bars inside Bottom Sheet
  pickerBar58: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: Layout.controlHeight,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  pickerIconTile: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  pickerBarText: {
    fontSize: 14,
  } as TextStyle,
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  emptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  } as ViewStyle,
});
