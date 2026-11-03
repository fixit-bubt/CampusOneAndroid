import { useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Radius, Accent } from '../../theme';
import { useAuth } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import type { Announcement } from '../../types/database';
import {
  fetchAnnouncementsFeed,
  triggerNoticeSync,
  updateAnnouncementBannerStatus,
} from '../../services/announcementService';

export function ManageAnnouncementsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'manual' | 'scraped' | 'banner'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetchAnnouncementsFeed();
      if (res.items) {
        setAnnouncements(res.items);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

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
        loadData();
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
        message: `Notice pin status updated.`,
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
            toast({ type: 'success', title: 'Deleted', message: 'Notice soft-deleted successfully.' });
          }
        },
      },
    ]);
  };

  const inBannerCount = useMemo(() => {
    return announcements.filter((a) => a.in_banner).length;
  }, [announcements]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return announcements.filter((a) => {
      if (activeTab === 'manual' && a.source !== 'manual') return false;
      if (activeTab === 'scraped' && a.source === 'manual') return false;
      if (activeTab === 'banner' && !a.in_banner) return false;

      if (q) {
        const matchTitle = (a.title || '').toLowerCase().includes(q);
        const matchDept = (a.department || '').toLowerCase().includes(q);
        const matchCode = (a.code || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDept && !matchCode) return false;
      }
      return true;
    });
  }, [announcements, activeTab, search]);

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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Announcements & Circulars"
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            style={[styles.postBtn, { backgroundColor: C.brand }]}
            onPress={() => navigation.navigate('AnnouncePost')}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={15} color="#ffffff" />
            <Text style={styles.postBtnTxt}>Post</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />
        }
        ListHeaderComponent={
          <View>
            {/* Quick Executive Stats Strip */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={[styles.statNum, { color: C.text }]}>{announcements.length}</Text>
                <Text style={[styles.statLabel, { color: C.textMuted }]}>Total</Text>
              </View>

              <TouchableOpacity
                style={[styles.statBox, { backgroundColor: C.surface, borderColor: C.brand }]}
                onPress={() => navigation.navigate('ManageBanner')}
                activeOpacity={0.8}
              >
                <View style={styles.bannerBadgeRow}>
                  <Text style={[styles.statNum, { color: C.brand }]}>{inBannerCount}/6</Text>
                  <Feather name="chevron-right" size={14} color={C.brand} />
                </View>
                <Text style={[styles.statLabel, { color: C.brand }]}>In Banner (Curate)</Text>
              </TouchableOpacity>

              <View style={[styles.statBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={[styles.statNum, { color: C.text }]}>
                  {announcements.filter((a) => a.source !== 'manual').length}
                </Text>
                <Text style={[styles.statLabel, { color: C.textMuted }]}>Scraped</Text>
              </View>
            </View>

            {/* Ingestion Hub Banner Bar */}
            <View style={[styles.syncBar, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.syncLeft}>
                <Feather name="globe" size={18} color={C.brand} />
                <View>
                  <Text style={[styles.syncTitle, { color: C.text }]}>BUBT Official Notice Board</Text>
                  <Text style={[styles.syncSub, { color: C.textMuted }]}>Auto-scraped from bubt.edu.bd/notice</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.syncActionBtn, { backgroundColor: syncing ? C.surface2 : C.brand }]}
                onPress={handleSyncCrawler}
                disabled={syncing}
                activeOpacity={0.8}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Feather name="refresh-cw" size={13} color="#ffffff" />
                    <Text style={styles.syncActionBtnTxt}>Sync Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={[styles.searchBox, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="search" size={16} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Search notices by title, code or dept..."
                placeholderTextColor={C.textMuted}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                  <Feather name="x" size={16} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabsRow}>
              {(['all', 'manual', 'scraped', 'banner'] as const).map((tab) => {
                const isActive = activeTab === tab;
                const label =
                  tab === 'all'
                    ? 'All'
                    : tab === 'manual'
                    ? 'Manual Broadcasts'
                    : tab === 'scraped'
                    ? 'BUBT Scraped'
                    : `In Banner (${inBannerCount})`;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[
                      styles.filterTabPill,
                      {
                        backgroundColor: isActive ? C.brand : C.surface,
                        borderColor: isActive ? C.brand : C.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterTabTxt,
                        { color: isActive ? '#ffffff' : C.textMuted, fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isBusy = busyId === item.id;
          const isOfficial = item.source !== 'manual';

          return (
            <TouchableOpacity
              style={[
                styles.noticeCard,
                { backgroundColor: C.surface, borderColor: item.in_banner ? C.brand : C.border },
              ]}
              onPress={() => navigation.navigate('AnnouncementDetail', { announcementId: item.id })}
              activeOpacity={0.75}
            >
              {/* Top Row: Ref Code, Department, Time */}
              <View style={styles.cardTopRow}>
                <View style={styles.cardTopLeft}>
                  <Text style={[styles.codeTxt, { color: C.brand }]}>{item.code || 'ANN'}</Text>
                  <Text style={[styles.dotTxt, { color: C.textMuted }]}>·</Text>
                  <Text style={[styles.deptTxt, { color: C.textMuted }]} numberOfLines={1}>
                    {item.department_code || item.department}
                  </Text>
                </View>

                {isOfficial ? (
                  <View style={[styles.officialTag, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#e0edff' }]}>
                    <Text style={[styles.officialTagTxt, { color: C.brand }]}>BUBT Scraped</Text>
                  </View>
                ) : (
                  <View style={[styles.officialTag, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5' }]}>
                    <Text style={[styles.officialTagTxt, { color: C.success }]}>Manual Broadcast</Text>
                  </View>
                )}
              </View>

              {/* Title */}
              <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={2}>
                {item.title}
              </Text>

              {/* Control Action Toolbar */}
              <View style={[styles.cardBottomRow, { borderTopColor: C.border }]}>
                {/* 1. Toggle Banner Button */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: item.in_banner ? (isDark ? 'rgba(59, 130, 246, 0.2)' : '#e0edff') : C.surface2,
                      borderColor: item.in_banner ? C.brand : C.border,
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
                    name="image"
                    size={13}
                    color={item.in_banner ? C.brand : C.textMuted}
                  />
                  <Text
                    style={[
                      styles.actionBtnTxt,
                      { color: item.in_banner ? C.brand : C.textMuted },
                    ]}
                  >
                    {item.in_banner ? 'In Banner' : '+ Home Banner'}
                  </Text>
                </TouchableOpacity>

                {/* 2. Toggle Pin Button */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: item.pinned ? (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7') : C.surface2,
                      borderColor: item.pinned ? Accent.gold : C.border,
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
                    color={item.pinned ? Accent.gold : C.textMuted}
                  />
                  <Text
                    style={[
                      styles.actionBtnTxt,
                      { color: item.pinned ? Accent.gold : C.textMuted },
                    ]}
                  >
                    {item.pinned ? 'Pinned' : 'Pin'}
                  </Text>
                </TouchableOpacity>

                {/* 3. Delete Button */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(item);
                  }}
                  disabled={isBusy}
                  activeOpacity={0.8}
                >
                  <Feather name="trash-2" size={13} color={C.danger} />
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
                No announcements match your search or selected tab.
              </Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 24,
  },
  centerPad: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedTitle: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 16,
    marginTop: 14,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  postBtnTxt: {
    color: '#ffffff',
    fontFamily: FontFamily.jakartaBold,
    fontSize: 12.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNum: {
    fontFamily: FontFamily.jakartaExtraBold,
    fontSize: 18,
  },
  statLabel: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 11,
    marginTop: 2,
  },
  bannerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  syncTitle: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 13,
  },
  syncSub: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 11,
    marginTop: 1,
  },
  syncActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  syncActionBtnTxt: {
    color: '#ffffff',
    fontFamily: FontFamily.jakartaBold,
    fontSize: 11.5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  filterTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    marginBottom: 12,
  },
  filterTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterTabTxt: {
    fontSize: 11.5,
  },
  noticeCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  codeTxt: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 11.5,
  },
  dotTxt: {
    fontSize: 12,
  },
  deptTxt: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 11.5,
    flex: 1,
  },
  officialTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  officialTagTxt: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 10,
  },
  cardTitle: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 13.5,
    lineHeight: 18,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  actionBtnTxt: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 11,
  },
  emptyCard: {
    padding: 30,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyCardTitle: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 14,
    marginTop: 4,
  },
  emptyCardSub: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 12,
    textAlign: 'center',
  },
});

