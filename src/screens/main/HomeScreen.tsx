import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { TopBar } from '../../components/layout/TopBar';
import { CampusToday } from '../../components/CampusToday';
import { HomeHeroBanner } from '../../components/home/HomeHeroBanner';
import { HomeStatusStrips } from '../../components/home/HomeStatusStrips';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { getMyNotifications } from '../../services/notificationsService';

export function HomeScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile, user } = useAuth();

  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    if (!user || (profile && profile.role !== 'student')) return;
    const nRes = await getMyNotifications(20);
    if (nRes.ok) {
      setUnread(nRes.data.filter((n) => !n.read).length);
    }
  }, [user, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
  }

  if (profile && profile.role !== 'student') {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        <ActivityIndicator color={C.brand} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <TopBar
        profile={profile}
        unread={unread}
        onBell={() => navigation.navigate('Notifications')}
        onAvatar={() => navigation.navigate('Profile')}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />
        }
      >
        {/* 1. Hero Auto-Changing Announcement & Event Banner */}
        <HomeHeroBanner key={`banner-${refreshKey}`} />

        {/* 2. Three Luxury Status Strips (Reports, Bus, Prayer) */}
        <HomeStatusStrips key={`strips-${refreshKey}`} />

        {/* 3. Browse Lost & Found Action Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('LostFoundBrowse')}
          style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.border }]}
        >
          <View style={[styles.actionIconBox, { backgroundColor: C.surface2 }]}>
            <Icon name="lostfound" size={20} color={C.text} />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={[styles.actionTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Browse Lost & Found
            </Text>
            <Text
              style={[styles.actionSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}
            >
              Find a lost item or post one you found.
            </Text>
          </View>
          <Feather name="arrow-right" size={17} color={C.textMuted} />
        </TouchableOpacity>

        {/* 4. Campus Today Highlights (Jobs, Blood requests, campus updates) */}
        <CampusToday navigation={navigation} hide={['bus', 'prayer']} />

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  scroll: {
    paddingBottom: 20,
  } as ViewStyle,

  // Action card (Browse Lost & Found)
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: 10,
    gap: 12,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  actionSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
});
