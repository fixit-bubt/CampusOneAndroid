import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type ImageSourcePropType,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { localToday, formatDate } from '../../utils/format';

export type CommunityTab = 'All' | 'Notices' | 'Clubs' | 'Events';

interface CommunityItem {
  id: string;
  category: 'Notice' | 'Event' | 'Club Update';
  source: string;
  title: string;
  body: string;
  date: string;
  rawDate: string;
  imageSource: ImageSourcePropType | null;
  sectorColor: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  params?: any;
}

const BANNERS_MAP: Record<string, ImageSourcePropType> = {
  'blood-drive.jpg': require('../../../assets/banners/blood-drive.jpg'),
  'convocation-2026.jpg': require('../../../assets/banners/convocation-2026.jpg'),
  'exam-routine.jpg': require('../../../assets/banners/exam-routine.jpg'),
  'hackathon-2026.jpg': require('../../../assets/banners/hackathon-2026.jpg'),
};

function resolveNewsImage(rawUrl?: string | null): ImageSourcePropType | null {
  if (!rawUrl) return null;
  const cleaned = rawUrl.trim();
  const filename = cleaned.split('/').pop()?.split('?')[0] || '';
  if (filename && BANNERS_MAP[filename]) {
    return BANNERS_MAP[filename];
  }
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    return { uri: cleaned };
  }
  if (cleaned.startsWith('/')) {
    return { uri: `https://campus-theta.vercel.app${cleaned}` };
  }
  return null;
}

const DEFAULT_NEWS: CommunityItem[] = [
  {
    id: 'def-hackathon',
    category: 'Event',
    source: 'Campus Auditorium',
    title: 'Innovate & Code: BUBT Inter-University Hackathon 2026',
    body: 'Annual 36-hour hackathon with students across national universities competing in AI, Web, and Mobile tracks.',
    date: 'Oct 23, 2026',
    rawDate: '2026-10-23',
    imageSource: BANNERS_MAP['hackathon-2026.jpg'],
    sectorColor: SectorColors.events,
    icon: 'calendar',
    route: 'EventsBrowse',
  },
  {
    id: 'def-exam',
    category: 'Notice',
    source: 'Controller of Examinations',
    title: 'Tri-Semester Final Examination Routine Published',
    body: 'Official schedule for undergraduate and graduate programs. Check section timing and room allocation.',
    date: 'Oct 15, 2026',
    rawDate: '2026-10-15',
    imageSource: BANNERS_MAP['exam-routine.jpg'],
    sectorColor: SectorColors.announce,
    icon: 'bell',
    route: 'Announcements',
  },
  {
    id: 'def-convocation',
    category: 'Notice',
    source: 'Office of the Registrar',
    title: '10th Convocation Ceremony - Registration Open',
    body: 'Graduating students are requested to complete online registration and cap & gown sizing before the deadline.',
    date: 'Oct 09, 2026',
    rawDate: '2026-10-09',
    imageSource: BANNERS_MAP['convocation-2026.jpg'],
    sectorColor: SectorColors.announce,
    icon: 'bell',
    route: 'Announcements',
  },
  {
    id: 'def-club',
    category: 'Club Update',
    source: 'BUBT IT Club',
    title: 'Spring Executive Panel & Workshop Series Announced',
    body: 'Join hands-on sessions in Cloud Architecture, Competitive Programming, and UI/UX Design this semester.',
    date: 'Oct 12, 2026',
    rawDate: '2026-10-12',
    imageSource: null,
    sectorColor: SectorColors.clubs,
    icon: 'users',
    route: 'Clubs',
  },
  {
    id: 'def-blood',
    category: 'Event',
    source: 'Rover Scout Group',
    title: 'Voluntary Blood Donation Drive & Free Health Camp',
    body: 'Join the annual student blood drive to support emergency patients in Mirpur and surrounding hospitals.',
    date: 'Oct 30, 2026',
    rawDate: '2026-10-30',
    imageSource: BANNERS_MAP['blood-drive.jpg'],
    sectorColor: SectorColors.blood,
    icon: 'heart',
    route: 'Blood',
  },
];

export function HomeCommunityUpdates() {
  const navigation = useNavigation<any>();
  const { C, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<CommunityTab>('All');
  const [items, setItems] = useState<CommunityItem[]>(DEFAULT_NEWS);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const today = localToday();
      const [annRes, evRes, clubPostsRes] = await Promise.all([
        supabase
          .from('announcements')
          .select('id, title, department, body, created_at, pinned, image_url, attachment_url')
          .is('deleted_at', null)
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('events')
          .select('id, title, venue, time, date, category, banner_url, description')
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(8),
        supabase
          .from('club_posts')
          .select('id, title, body, created_at, image_url, club_id, clubs(id, name, cover_url)')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      const list: CommunityItem[] = [];

      // 1. Announcements
      if (annRes.data && annRes.data.length > 0) {
        annRes.data.forEach((a: any) => {
          const imgUrl =
            a.image_url ||
            (a.attachment_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(a.attachment_url)
              ? a.attachment_url
              : null);

          list.push({
            id: `ann-${a.id}`,
            category: 'Notice',
            source: a.department ? `${a.department} Dept` : 'Office of Registrar',
            title: a.title,
            body: a.body || 'Official university announcement and guidance for students.',
            date: a.created_at ? formatDate(a.created_at) : 'Recent',
            rawDate: a.created_at ? a.created_at.split('T')[0] : '',
            imageSource: resolveNewsImage(imgUrl),
            sectorColor: SectorColors.announce,
            icon: 'bell',
            route: 'AnnouncementDetail',
            params: { announcementId: a.id },
          });
        });
      }

      // 2. Events
      if (evRes.data && evRes.data.length > 0) {
        evRes.data.forEach((e: any) => {
          list.push({
            id: `ev-${e.id}`,
            category: 'Event',
            source: e.venue || 'Campus Auditorium',
            title: e.title,
            body: e.description || `${e.venue || 'Campus'}${e.time ? ` · ${e.time}` : ''}`,
            date: e.date ? formatDate(e.date) : 'Upcoming',
            rawDate: e.date || '',
            imageSource: resolveNewsImage(e.banner_url),
            sectorColor: SectorColors.events,
            icon: 'calendar',
            route: 'EventDetail',
            params: { eventId: e.id },
          });
        });
      }

      // 3. Club Posts
      if (clubPostsRes.data && clubPostsRes.data.length > 0) {
        clubPostsRes.data.forEach((cp: any) => {
          const clubData = Array.isArray(cp.clubs) ? cp.clubs[0] : cp.clubs;
          const clubName = clubData?.name || 'Campus Club';
          list.push({
            id: `club-${cp.id}`,
            category: 'Club Update',
            source: clubName,
            title: cp.title || `${clubName} Update`,
            body: cp.body || 'Latest news and activities from registered student clubs.',
            date: cp.created_at ? formatDate(cp.created_at) : 'Recent',
            rawDate: cp.created_at ? cp.created_at.split('T')[0] : '',
            imageSource: resolveNewsImage(cp.image_url || clubData?.cover_url),
            sectorColor: SectorColors.clubs,
            icon: 'users',
            route: 'ClubDetail',
            params: { clubId: cp.club_id, id: cp.club_id },
          });
        });
      }

      if (list.length > 0) {
        // If fewer than 4 items, merge defaults to keep the feed engaging
        if (list.length < 4) {
          const existingTitles = new Set(list.map((i) => i.title.toLowerCase()));
          DEFAULT_NEWS.forEach((d) => {
            if (!existingTitles.has(d.title.toLowerCase())) {
              list.push(d);
            }
          });
        }
        list.sort((a, b) => (b.rawDate || '').localeCompare(a.rawDate || ''));
        setItems(list);
      } else {
        setItems(DEFAULT_NEWS);
      }
    } catch {
      setItems(DEFAULT_NEWS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      All: items.length,
      Notices: items.filter((n) => n.category === 'Notice').length,
      Clubs: items.filter((n) => n.category === 'Club Update').length,
      Events: items.filter((n) => n.category === 'Event').length,
    };
  }, [items]);

  // Filtered list
  const filtered = useMemo(() => {
    if (activeTab === 'All') return items;
    if (activeTab === 'Notices') return items.filter((n) => n.category === 'Notice');
    if (activeTab === 'Clubs') return items.filter((n) => n.category === 'Club Update');
    if (activeTab === 'Events') return items.filter((n) => n.category === 'Event');
    return items;
  }, [items, activeTab]);

  const tabs: { id: CommunityTab; label: string; icon: keyof typeof Feather.glyphMap; color: string }[] = [
    { id: 'All', label: 'All', icon: 'layers', color: C.brand },
    { id: 'Notices', label: 'Notices', icon: 'bell', color: SectorColors.announce },
    { id: 'Clubs', label: 'Clubs', icon: 'users', color: SectorColors.clubs },
    { id: 'Events', label: 'Events', icon: 'calendar', color: SectorColors.events },
  ];

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="rss" size={13} color={C.textMuted} />
          <Text style={[styles.headerText, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
            COMMUNITY UPDATES
          </Text>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]}>
          <View style={styles.pulseDot} />
          <Text style={[styles.liveText, { color: SectorColors.announce, fontFamily: FontFamily.jakartaBold }]}>
            {filtered.length} updates
          </Text>
        </View>
      </View>

      {/* Luxury Filter Pills Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsScroll}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id];

          let pillBg = C.surface;
          let pillBorder = C.border;
          let textColor = C.textMuted;
          let iconColor = C.textMuted;
          let countColor = C.textMuted;

          if (isActive) {
            if (tab.id === 'All') {
              pillBg = isDark ? C.surface2 : '#0f172a';
              pillBorder = isDark ? C.text2 : '#0f172a';
              textColor = isDark ? C.text : C.white;
              iconColor = isDark ? C.text : C.white;
              countColor = isDark ? C.textMuted : 'rgba(255,255,255,0.7)';
            } else {
              pillBg = isDark ? `${tab.color}1e` : `${tab.color}14`;
              pillBorder = tab.color;
              textColor = tab.color;
              iconColor = tab.color;
              countColor = tab.color;
            }
          }

          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.75}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.pill,
                {
                  backgroundColor: pillBg,
                  borderColor: pillBorder,
                },
              ]}
            >
              <Feather name={tab.icon} size={13} color={iconColor} />
              <Text
                style={[
                  styles.pillLabel,
                  {
                    color: textColor,
                    fontFamily: isActive ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                {tab.label}
              </Text>
              <Text
                style={[
                  styles.pillCount,
                  {
                    color: countColor,
                    fontFamily: FontFamily.jakartaBold,
                  },
                ]}
              >
                · {count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Feed List */}
      {loading ? (
        <View style={[styles.loadingBox, { backgroundColor: C.surface, borderColor: C.border }]}>
          <ActivityIndicator color={C.brand} size="small" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Feather name="inbox" size={24} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            No updates found for this category.
          </Text>
        </View>
      ) : (
        <View style={styles.listCol}>
          {filtered.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.75}
              onPress={() => navigation.navigate(item.route, item.params)}
              style={[
                styles.card,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                },
              ]}
            >
              {/* Thumbnail / Category Box */}
              <View
                style={[
                  styles.thumbBox,
                  {
                    backgroundColor: C.surface2,
                    borderColor: C.border,
                  },
                ]}
              >
                {item.imageSource && !failedImages[item.id] ? (
                  <Image
                    source={item.imageSource}
                    style={styles.thumbImage}
                    resizeMode="cover"
                    onError={() => setFailedImages((prev) => ({ ...prev, [item.id]: true }))}
                  />
                ) : (
                  <View
                    style={[
                      styles.thumbFallback,
                      {
                        backgroundColor: `${item.sectorColor}18`,
                      },
                    ]}
                  >
                    <Feather name={item.icon} size={20} color={item.sectorColor} />
                  </View>
                )}
              </View>

              {/* Text Column */}
              <View style={styles.cardContent}>
                {/* Meta Row: Badge · Source · Date */}
                <View style={styles.metaRow}>
                  <View
                    style={[
                      styles.catBadge,
                      {
                        backgroundColor: `${item.sectorColor}16`,
                        borderColor: `${item.sectorColor}38`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.catBadgeText,
                        {
                          color: item.sectorColor,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {item.category}
                    </Text>
                  </View>
                  <Text style={[styles.metaDot, { color: C.textMuted }]}>·</Text>
                  <Text
                    style={[
                      styles.sourceText,
                      {
                        color: C.textMuted,
                        fontFamily: FontFamily.jakartaMedium,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.source}
                  </Text>
                  {item.date ? (
                    <>
                      <Text style={[styles.metaDot, { color: C.textMuted }]}>·</Text>
                      <Text
                        style={[
                          styles.dateText,
                          {
                            color: C.textMuted,
                            fontFamily: FontFamily.jakartaRegular,
                          },
                        ]}
                      >
                        {item.date}
                      </Text>
                    </>
                  ) : null}
                </View>

                {/* Title */}
                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: C.text,
                      fontFamily: FontFamily.jakartaBold,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>

                {/* Body Snippet */}
                <Text
                  style={[
                    styles.cardBody,
                    {
                      color: C.text2,
                      fontFamily: FontFamily.jakartaRegular,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {item.body}
                </Text>
              </View>

              {/* Right Chevron */}
              <Feather name="chevron-right" size={16} color={C.textMuted} style={styles.chevron} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 16,
  } as ViewStyle,

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  } as ViewStyle,

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,

  headerText: {
    fontSize: 11,
    letterSpacing: 0.8,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  } as ViewStyle,

  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SectorColors.announce,
  },

  liveText: {
    fontSize: 10.5,
  },

  pillsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 2,
  } as ViewStyle,

  pill: {
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,

  pillLabel: {
    fontSize: 12,
  },

  pillCount: {
    fontSize: 11,
  },

  loadingBox: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  emptyBox: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,

  emptyText: {
    fontSize: 12,
  },

  listCol: {
    gap: 9,
  } as ViewStyle,

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 11,
  } as ViewStyle,

  thumbBox: {
    width: 58,
    height: 58,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,

  thumbImage: {
    width: '100%',
    height: '100%',
  },

  thumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  cardContent: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  } as ViewStyle,

  catBadge: {
    paddingVertical: 1.5,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
  } as ViewStyle,

  catBadgeText: {
    fontSize: 9.5,
  },

  metaDot: {
    fontSize: 10,
  },

  sourceText: {
    fontSize: 10.5,
    maxWidth: 110,
  },

  dateText: {
    fontSize: 10.5,
  },

  cardTitle: {
    fontSize: 13,
    lineHeight: 18,
  },

  cardBody: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },

  chevron: {
    marginLeft: 2,
  },
});
