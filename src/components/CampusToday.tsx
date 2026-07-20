// Campus Today — at-a-glance strip shown on every role's Home. Mini-widgets in
// a 2-column grid; each hides when it has nothing to show and links into its feature.
import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SectorIcon } from './ui/SectorIcon';
import { FontFamily, type SectorKey } from '../theme';
import { supabase } from '../lib/supabase';
import { localToday } from '../utils/format';

interface WidgetData {
  sector: SectorKey;
  title: string;
  sub: string;
  route: string;
}

function toMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fmtTime(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function CampusToday({ navigation, hide }: { navigation: any; hide?: string[] }) {
  const { C, isDark } = useTheme();
  const [widgets, setWidgets] = useState<WidgetData[]>([]);

  const load = useCallback(async () => {
    const todayISO = localToday();
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();

    const [busRes, prayerRes, annRes, evRes, jobsRes, bloodRes] = await Promise.all([
      supabase.from('bus_routes').select('name, to_departures').eq('active', true),
      supabase.from('prayer_times').select('en, azan').order('sort'),
      supabase.from('announcements').select('title').is('deleted_at', null).order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(1),
      supabase.from('events').select('title, date').gte('date', todayISO).order('date').limit(1),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('deadline', todayISO),
      supabase.from('blood_requests').select('id', { count: 'exact', head: true }).eq('urgency', 'Urgent'),
    ]);

    const out: WidgetData[] = [];

    // Next bus departure across active routes
    let bestBus: { name: string; mins: number } | null = null;
    (busRes.data ?? []).forEach((r: any) => {
      (r.to_departures ?? []).forEach((t: string) => {
        const m = toMinutes(t);
        if (m >= nowMins && (!bestBus || m < bestBus.mins)) bestBus = { name: r.name, mins: m };
      });
    });
    if (bestBus !== null) {
      const b = bestBus as { name: string; mins: number };
      out.push({
        sector: 'bus',
        title: `${fmtTime(`${Math.floor(b.mins / 60)}:${b.mins % 60}`)} to campus`,
        sub: b.name,
        route: 'Bus',
      });
    }

    // Next prayer
    const nextPrayer = (prayerRes.data ?? []).find((p: any) => toMinutes(p.azan) >= nowMins) ?? (prayerRes.data ?? [])[0];
    if (nextPrayer) {
      out.push({ sector: 'prayer', title: nextPrayer.en, sub: `Azan ${fmtTime(nextPrayer.azan)}`, route: 'Prayer' });
    }

    // Latest announcement
    const ann = annRes.data?.[0];
    if (ann) out.push({ sector: 'announce', title: ann.title, sub: 'Latest notice', route: 'Announcements' });

    // Next event
    const ev = evRes.data?.[0];
    if (ev) out.push({ sector: 'events', title: ev.title, sub: ev.date, route: 'EventsBrowse' });

    // Open jobs
    if ((jobsRes.count ?? 0) > 0) {
      out.push({ sector: 'jobs', title: `${jobsRes.count} open positions`, sub: 'Jobs & internships', route: 'JobsBrowse' });
    }

    // Urgent blood requests
    if ((bloodRes.count ?? 0) > 0) {
      out.push({ sector: 'blood', title: `${bloodRes.count} urgent request${(bloodRes.count ?? 0) === 1 ? '' : 's'}`, sub: 'Blood donation', route: 'Blood' });
    }

    setWidgets(out);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Some roles (e.g. maintenance staff) hide sectors they no longer have access to.
  const shown = hide?.length ? widgets.filter(w => !hide.includes(w.sector)) : widgets;
  if (shown.length === 0) return null;

  return (
    <View>
      <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>
        CAMPUS TODAY
      </Text>
      <View style={styles.grid}>
        {shown.map(w => (
          <TouchableOpacity
            key={w.sector}
            style={[styles.cell, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => navigation.navigate(w.route)}
            activeOpacity={0.75}
          >
            <SectorIcon sector={w.sector} size="sm" dark={isDark} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {w.title}
              </Text>
              <Text style={[styles.sub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                {w.sub}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, letterSpacing: 0.8, marginTop: 24, marginBottom: 9 } as any,
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as ViewStyle,
  cell: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  title: { fontSize: 12.5 } as any,
  sub: { fontSize: 10.5, marginTop: 1 } as any,
});
