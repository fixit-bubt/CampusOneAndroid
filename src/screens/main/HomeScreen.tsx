import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { TopBar } from '../../components/layout/TopBar';
import { HomeHeroBanner } from '../../components/home/HomeHeroBanner';
import { HomeStatusStrips } from '../../components/home/HomeStatusStrips';
import { HomeFrequentTools } from '../../components/home/HomeFrequentTools';
import { HomeCommunityUpdates } from '../../components/home/HomeCommunityUpdates';
import { Layout } from '../../theme';
import { getMyNotifications } from '../../services/notificationsService';

export function HomeScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile, user } = useAuth();
  const insets = useSafeAreaInsets();

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
      <View
        style={[
          styles.safe,
          { backgroundColor: C.bg, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        <ActivityIndicator color={C.brand} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <TopBar
        profile={profile}
        unread={unread}
        onBell={() => navigation.navigate('Notifications')}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />
        }
      >
        {/* 1. Hero Auto-Changing Announcement & Event Banner */}
        <HomeHeroBanner refreshTrigger={refreshKey} />

        {/* 2. Luxury Status Strips (Reports, Bus, Prayer, Blood) */}
        <HomeStatusStrips refreshTrigger={refreshKey} />

        {/* 3. Frequently Used Academic Tools */}
        <HomeFrequentTools refreshTrigger={refreshKey} />

        {/* 4. Community Updates Feed */}
        <HomeCommunityUpdates refreshTrigger={refreshKey} />

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  scroll: {
    paddingBottom: 20,
  } as ViewStyle,
});

