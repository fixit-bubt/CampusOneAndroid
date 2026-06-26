import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet,
  type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { SectorIcon } from '../../components/ui/SectorIcon';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent } from '../../theme';
import type { SectorKey } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';

const SECTORS: { id: SectorKey; label: string; desc: string }[] = [
  { id: 'reports',   label: 'Reports',       desc: 'Campus maintenance issues' },
  { id: 'lostfound', label: 'Lost & Found',   desc: 'Lost and found items'      },
  { id: 'clubs',     label: 'Clubs',          desc: 'Club activities and posts' },
  { id: 'events',    label: 'Events',         desc: 'Campus events and seminars'},
  { id: 'jobs',      label: 'Jobs',           desc: 'Job and internship listings'},
  { id: 'announce',  label: 'Announcements',  desc: 'Official university notices'},
  { id: 'study',     label: 'Study Hub',      desc: 'New materials and resources'},
  { id: 'bus',       label: 'Bus',            desc: 'Schedule changes'           },
  { id: 'medical',   label: 'Medical',        desc: 'Doctor availability updates'},
  { id: 'market',    label: 'Marketplace',    desc: 'New listings near you'      },
  { id: 'ride',      label: 'Ride Share',     desc: 'New ride offers'            },
  { id: 'blood',     label: 'Blood',          desc: 'Urgent blood requests'      },
  { id: 'directory', label: 'Directory',      desc: 'Connection requests'        },
  { id: 'prayer',    label: 'Prayer Times',   desc: 'Daily prayer time updates'  },
  { id: 'faculty',   label: 'Faculty',        desc: 'Faculty announcements'      },
  { id: 'calendar',  label: 'Academic Calendar', desc: 'Academic dates and holidays'},
  { id: 'routines',  label: 'Class Routines', desc: 'Class and exam schedules'   },
  { id: 'coverpage', label: 'Cover Page',     desc: 'Assignment cover pages'     },
];

type SectorPref = { enabled: boolean; push: boolean; email: boolean; inapp: boolean };
type ChanKey = 'push' | 'email' | 'inapp';

function defaultPref(): SectorPref {
  return { enabled: true, push: true, email: false, inapp: true };
}

export function NotifSettingsScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const [paused, setPaused] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Record<string, SectorPref>>(
    Object.fromEntries(SECTORS.map(s => [s.id, defaultPref()]))
  );

  const load = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await supabase
      .from('notif_prefs')
      .select('*')
      .eq('user_id', user?.id ?? '');
    if (error) {
      setLoadError(error.message);
      return;
    }
    if (data) {
      const rows = data as any[];
      // Master toggles persisted as special rows — pull them out first.
      const pausedRow = rows.find(p => p.sector === '_paused');
      const quietRow  = rows.find(p => p.sector === '_quiet');
      if (pausedRow) setPaused(pausedRow.enabled);
      if (quietRow)  setQuiet(quietRow.enabled);
      // Merge into existing prefs via a functional updater so `prefs` does NOT
      // need to be a dependency — depending on it here recreates `load`, which
      // re-fires useFocusEffect and refetches forever while the screen is open.
      setPrefs(prev => {
        const updated = { ...prev };
        rows.forEach(p => {
          if (p.sector === '_paused' || p.sector === '_quiet') return;
          updated[p.sector] = { enabled: p.enabled, push: p.push, email: p.email, inapp: p.inapp };
        });
        return updated;
      });
    }
  }, [user?.id]);

  async function saveMaster(sector: '_paused' | '_quiet', on: boolean) {
    if (!user?.id) return;
    const { error } = await supabase.from('notif_prefs').upsert(
      { user_id: user.id, sector, enabled: on },
      { onConflict: 'user_id,sector' },
    );
    if (error) load(); // failed write → re-sync UI to DB truth
  }

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function savePref(sectorId: string, update: Partial<SectorPref>) {
    if (!user?.id) return;
    const next = { ...prefs[sectorId], ...update };
    setPrefs(prev => ({ ...prev, [sectorId]: next }));
    const { error } = await supabase.from('notif_prefs').upsert(
      { user_id: user.id, sector: sectorId, ...next },
      { onConflict: 'user_id,sector' },
    );
    if (error) load(); // failed write → re-sync UI to DB truth
  }

  const onCount = SECTORS.filter(s => prefs[s.id]?.enabled).length;
  const allOn = onCount === SECTORS.length;

  async function toggleAll(on: boolean) {
    const next: Record<string, SectorPref> = {};
    SECTORS.forEach(s => { next[s.id] = { ...prefs[s.id], enabled: on }; });
    setPrefs(next);
    const results = await Promise.all(SECTORS.map(s =>
      supabase.from('notif_prefs').upsert(
        { user_id: user?.id, sector: s.id, enabled: on },
        { onConflict: 'user_id,sector' },
      )
    ));
    if (results.some(r => r.error)) load(); // any failed write → re-sync
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.notif.settingsTitle} onBack={() => navigation.goBack()} />
      {loadError ? (
        <Text style={[styles.errorText, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>
          Failed to load preferences: {loadError}
        </Text>
      ) : null}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Master pause */}
        <View style={[styles.settingCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, {
              backgroundColor: paused ? C.dangerBg : C.surface2,
            }]}>
              <Icon name={paused ? 'bellOff' : 'bell'} size={22} color={paused ? C.danger : C.brand} />
            </View>
            <View style={styles.settingBody}>
              <Text style={[styles.settingTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Pause all</Text>
              <Text style={[styles.settingSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>Stop all notifications temporarily</Text>
            </View>
            <Switch
              value={paused}
              onValueChange={v => { setPaused(v); saveMaster('_paused', v); }}
              trackColor={{ false: C.border, true: C.brand }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Quiet hours */}
        <View style={[styles.settingCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.settingRow, { opacity: paused ? 0.4 : 1 }]}>
            <View style={[styles.settingIcon, { backgroundColor: `${Accent.purple}${isDark ? '2e' : '12'}` }]}>
              <Icon name="clock" size={22} color={Accent.purple} />
            </View>
            <View style={styles.settingBody}>
              <Text style={[styles.settingTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Quiet hours</Text>
              <Text style={[styles.settingSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>Silence notifications 10PM – 7AM</Text>
            </View>
            <Switch
              value={quiet}
              onValueChange={v => { setQuiet(v); saveMaster('_quiet', v); }}
              disabled={paused}
              trackColor={{ false: C.border, true: C.brand }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Categories header */}
        <View style={styles.catsHeader}>
          <View>
            <Text style={[styles.catsTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>CATEGORIES</Text>
            <Text style={[styles.catsSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {onCount} on · tap to expand channels
            </Text>
          </View>
          <TouchableOpacity onPress={() => toggleAll(!allOn)} style={{ padding: 4 }} activeOpacity={0.75}>
            <Text style={[styles.toggleAll, { color: C.brand, fontFamily: FontFamily.jakartaBold, opacity: paused ? 0.4 : 1 }]}>
              {allOn ? t.notif.turnAllOff : t.notif.turnAllOn}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sector list */}
        <View style={[styles.sectorsCard, { backgroundColor: C.surface, borderColor: C.border, opacity: paused ? 0.5 : 1 }]}>
          {SECTORS.map((s, i) => {
            const p = prefs[s.id] ?? defaultPref();
            const isOpen = expanded === s.id;
            return (
              <View key={s.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <View style={[styles.sectorRow, { paddingBottom: isOpen ? 4 : 13 }]}>
                  <TouchableOpacity
                    style={styles.sectorMain}
                    onPress={() => setExpanded(isOpen ? null : s.id)}
                    activeOpacity={0.75}
                  >
                    <SectorIcon sector={s.id} size="sm" />
                    <View style={styles.sectorBody}>
                      <Text style={[styles.sectorTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{s.label}</Text>
                      <Text style={[styles.sectorDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{s.desc}</Text>
                    </View>
                  </TouchableOpacity>
                  <Switch
                    value={p.enabled}
                    onValueChange={val => savePref(s.id, { enabled: val })}
                    disabled={paused}
                    trackColor={{ false: C.border, true: C.brand }}
                    thumbColor="#fff"
                  />
                </View>

                {isOpen && p.enabled && (
                  <View style={styles.chanRow}>
                    {(['push', 'email', 'inapp'] as ChanKey[]).map(ch => (
                      <TouchableOpacity
                        key={ch}
                        style={[styles.chanPill, p[ch]
                          ? { backgroundColor: C.brand, borderColor: C.brand }
                          : { backgroundColor: 'transparent', borderColor: C.border }]}
                        onPress={() => savePref(s.id, { [ch]: !p[ch] })}
                        activeOpacity={0.75}
                      >
                        <Feather name={ch === 'push' ? 'smartphone' : ch === 'email' ? 'mail' : 'bell'} size={15} color={p[ch] ? '#fff' : C.textMuted} />
                        <Text style={[styles.chanTxt, { color: p[ch] ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                          {ch === 'push' ? t.notif.chanPush : ch === 'email' ? t.notif.chanEmail : t.notif.chanInapp}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,
  errorText: { fontSize: 13, marginHorizontal: 20, marginTop: 8 } as any,
  settingCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 10 } as ViewStyle,
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 } as ViewStyle,
  settingIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  settingBody: { flex: 1 } as ViewStyle,
  settingTitle: { fontSize: 14.5 } as any,
  settingSub: { fontSize: 12, marginTop: 2 } as any,
  catsHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 16, marginBottom: 9 } as ViewStyle,
  catsTitle: { fontSize: 11, letterSpacing: 0.6 } as any,
  catsSub: { fontSize: 12.5, marginTop: 3 } as any,
  toggleAll: { fontSize: 13 } as any,
  sectorsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  sectorRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingTop: 13, gap: 14 } as ViewStyle,
  sectorMain: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 } as ViewStyle,
  sectorBody: { flex: 1 } as ViewStyle,
  sectorTitle: { fontSize: 14 } as any,
  sectorDesc: { fontSize: 12, marginTop: 1 } as any,
  chanRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 14, paddingLeft: 64 } as ViewStyle,
  chanPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1 } as ViewStyle,
  chanTxt: { fontSize: 13 } as any,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
});
