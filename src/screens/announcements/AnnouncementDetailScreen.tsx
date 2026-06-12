// Matches design screens-a.jsx — AnnouncementDetail
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Linking, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import type { Announcement } from '../../types/database';

const PRI_COLOR: Record<string, string> = { Urgent: '#e2483d', Important: '#b9760a', General: '#5b6b86' };
const PRI_BG: Record<string, string>    = { Urgent: '#fbe7e5', Important: '#fbefdb', General: '#f0f2f6' };

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function AnnouncementDetailScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const { announcementId } = route.params;
  const id = announcementId;
  const [item, setItem] = useState<Announcement | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .single();
      if (error) { console.error('announcement detail fetch:', error.message); return; }
      if (data) setItem(data as Announcement);
      // Read tracking (web parity) — opening counts as read
      if (data && user) {
        await supabase
          .from('announcement_reads')
          .upsert({ announcement_id: id, user_id: user.id }, { onConflict: 'announcement_id,user_id' });
      }
    })();
  }, [id, user?.id]);

  if (!item) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Announcements" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

  const fg = PRI_COLOR[item.priority] ?? '#888888';
  const bg = PRI_BG[item.priority] ?? '#f0f2f6';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Announcements" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Priority + pinned pills */}
        <View style={styles.pills}>
          <View style={[styles.priPill, { backgroundColor: bg }]}>
            <View style={[styles.priDot, { backgroundColor: fg }]} />
            <Text style={[styles.priText, { color: fg, fontFamily: FontFamily.jakartaBold }]}>{item.priority}</Text>
          </View>
          {item.pinned && (
            <View style={[styles.priPill, { backgroundColor: '#eef3ff' }]}>
              <View style={[styles.priDot, { backgroundColor: '#2b5be3' }]} />
              <Text style={[styles.priText, { color: '#2b5be3', fontFamily: FontFamily.jakartaBold }]}>Pinned</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
          {item.title}
        </Text>

        {/* Meta */}
        <Text style={[styles.meta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          {item.department} · {timeAgo(item.created_at)}
        </Text>

        {/* Body */}
        <Text style={[styles.body, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
          {item.body}
        </Text>

        {/* Attachment */}
        {item.attachment_url && (
          <TouchableOpacity
            style={[styles.attachCard, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => Linking.openURL(item.attachment_url!)}
            activeOpacity={0.75}
          >
            <View style={[styles.attachIcon, { backgroundColor: '#fbe7e5' }]}>
              <Icon name="mail" size={18} color="#d63d35" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.attachName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {item.attachment_name ?? 'Attachment.pdf'}
              </Text>
              <Text style={[styles.attachMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                PDF · Tap to open
              </Text>
            </View>
            <Icon name="chevR" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}

        <View style={{ height: 26 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  content: { paddingTop: 16, paddingBottom: 20 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' } as ViewStyle,
  priPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 } as ViewStyle,
  priDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  priText: { fontSize: 12 } as any,
  title: { fontSize: 21, letterSpacing: -0.4, marginTop: 14, lineHeight: 28 } as any,
  meta: { fontSize: 12.5, marginTop: 6 } as any,
  body: { fontSize: 14.5, lineHeight: 24, marginTop: 16 } as any,
  attachCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 18 } as ViewStyle,
  attachIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  attachName: { fontSize: 13.5 } as any,
  attachMeta: { fontSize: 11.5, marginTop: 2 } as any,
});
