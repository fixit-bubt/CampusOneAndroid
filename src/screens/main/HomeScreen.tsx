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
import { SafeAreaView } from 'react-native-safe-area-context';
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

        {/* 2. Luxury Status Strips (Reports, Bus, Prayer, Blood) */}
        <HomeStatusStrips key={`strips-${refreshKey}`} />

        {/* 3. Frequently Used Academic Tools */}
        <HomeFrequentTools />

        {/* 4. Community Updates Feed */}
        <HomeCommunityUpdates key={`news-${refreshKey}`} />

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,

  scroll: {
    paddingBottom: 20,
  } as ViewStyle,
});

