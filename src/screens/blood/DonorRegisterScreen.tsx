import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getMyDonor } from '../../services/bloodService';
import { removeCache, CacheKeys } from '../../services/cacheService';
import { isValidDate, localToday } from '../../utils/format';
import { scheduleRechargedReminder, cancelRechargedReminder } from '../../utils/bloodReminder';
import { AreaPickerModal } from '../../components/blood/AreaPickerModal';
import type { BloodRequest } from '../../types/database';

const GROUPS: BloodRequest['blood_group'][] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function DonorRegisterScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const t = useT();
  const toast = useToast();

  const [group, setGroup] = useState<BloodRequest['blood_group'] | null>(null);
  const [area, setArea] = useState('');
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [phone, setPhone] = useState('');
  const [lastDonated, setLastDonated] = useState('');
  const [alertUrgency, setAlertUrgency] = useState<'urgent_only' | 'today_plus' | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadCurrent() {
      if (!user) {
        if (active) setInitialLoading(false);
        return;
      }
      try {
        const res = await getMyDonor(user.id);
        if (active) {
          if (res.ok && res.data) {
            if (res.data.donor) {
              setIsRegistered(true);
              setGroup(res.data.donor.blood_group);
              setArea(res.data.donor.area || '');
              setLastDonated(res.data.donor.last_donated || '');
              if (res.data.donor.alert_urgency) {
                setAlertUrgency(res.data.donor.alert_urgency as any);
              }
            }
            if (res.data.phone) {
              setPhone(res.data.phone);
            }
          }
        }
      } finally {
        if (active) setInitialLoading(false);
      }
    }
    loadCurrent();
    return () => { active = false; };
  }, [user]);

  const canSubmit = group !== null && area.trim();

  async function handleSubmit() {
    if (!user) {
      toast({ type: 'info', title: t.blood2.signInRequired, message: t.blood2.signInToRespond });
      return;
    }
    if (!canSubmit) return;
    setLoading(true);
    try {
      // last_donated is a DATE column - validate valid past/today YYYY-MM-DD
      const ld = lastDonated.trim();
      let lastDonatedDate: string | null = null;
      if (ld) {
        if (!isValidDate(ld, true) || ld > localToday()) {
          toast({ type: 'error', title: t.common.error, message: `${t.blood2.lastDonatedOptional}: YYYY-MM-DD (today or past)` });
          setLoading(false);
          return;
        }
        lastDonatedDate = ld;
      }
      // Registering as a donor is consent to be reached. donor_contact only
      // reveals the number when show_whatsapp is true, so opt in here.
      const profilePatch: { show_whatsapp: boolean; whatsapp: string | null; blood_group: string } = {
        show_whatsapp: true,
        blood_group: group,
        whatsapp: phone.trim() || null,
      };
      const [donorRes, profileRes] = await Promise.all([
        (supabase.from('donors') as any).upsert({
          user_id:       user.id,
          blood_group:   group,
          area:          area.trim(),
          last_donated:  lastDonatedDate,
          alert_urgency: alertUrgency,
        }, { onConflict: 'user_id' }),
        supabase.from('profiles').update(profilePatch).eq('id', user.id),
      ]);
      if (donorRes.error) throw donorRes.error;
      if (profileRes.error) throw profileRes.error;

      if (lastDonatedDate) {
        await scheduleRechargedReminder(
          lastDonatedDate,
          (profile as any)?.gender ?? 'male',
          t.blood2.rechargedNotificationTitle,
          t.blood2.rechargedNotificationBody,
        );
      } else {
        await cancelRechargedReminder();
      }

      await Promise.all([
        removeCache(CacheKeys.BLOOD_FEED(user.id)),
        removeCache(CacheKeys.HOME_STATUS(user.id)),
        refreshProfile(),
      ]);
      toast({ type: 'success', title: isRegistered ? t.blood2.updateDonorBtn : t.blood2.registerAsDonorBtnFull, message: 'Donor information saved successfully.' });
      navigation.goBack();
    } catch {
      toast({ type: 'error', title: t.common.error, message: t.blood2.registerError });
    } finally {
      setLoading(false);
    }
  }

  const screenTitle = isRegistered ? t.blood2.updateDonorTitle : t.blood2.registerAsDonorTitle;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={screenTitle} onBack={() => navigation.goBack()} />

      {initialLoading ? (
        <View style={styles.centerLoad}>
          <ActivityIndicator size="small" color={C.brand} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
        {isRegistered ? (
          <View style={[styles.lockedCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.lockedBadge, { backgroundColor: SectorColors.blood + '20' }]}>
              <Text style={[styles.lockedGroupTxt, { color: SectorColors.blood, fontFamily: FontFamily.jakartaExtraBold }]}>
                {group}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.lockedTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  Blood Group: {group}
                </Text>
                <View style={[styles.permPill, { backgroundColor: C.successBg }]}>
                  <Text style={[styles.permTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                    Verified
                  </Text>
                </View>
              </View>
              <Text style={[styles.lockedNote, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                {t.blood2.bloodGroupLockedNote}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.blood2.yourBloodGroup}</Text>
            <View style={styles.groupGrid}>
              {GROUPS.map(g => {
                const on = group === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.groupBtn, {
                      backgroundColor: on ? SectorColors.blood : 'transparent',
                      borderColor: on ? 'transparent' : C.border,
                    }]}
                    onPress={() => setGroup(g)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.groupTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaExtraBold }]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.consent, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.blood2.bloodGroupPermanent}
            </Text>
          </>
        )}

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.blood2.area}</Text>
        <TouchableOpacity
          style={[
            styles.selectorCard,
            {
              backgroundColor: C.surface,
              borderColor: area ? SectorColors.blood : C.border,
            },
          ]}
          onPress={() => setAreaModalVisible(true)}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.selectorIconBox,
              {
                backgroundColor: area ? `${SectorColors.blood}16` : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2),
              },
            ]}
          >
            <Icon name="pin" size={15} color={area ? SectorColors.blood : C.textMuted} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                styles.selectorValueTxt,
                {
                  color: area ? C.text : C.textMuted,
                  fontFamily: FontFamily.jakartaBold,
                },
              ]}
              numberOfLines={1}
            >
              {area || t.blood2.areaPlaceholder}
            </Text>
            <Text
              style={[
                styles.selectorSubTxt,
                { color: C.textMuted, fontFamily: FontFamily.jakartaRegular },
              ]}
            >
              {area ? 'Tap to change area' : 'Select from 152 Dhaka areas'}
            </Text>
          </View>
          <Feather name="chevron-down" size={16} color={C.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.blood2.phoneWhatsapp}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={phone}
          onChangeText={setPhone}
          placeholder="+880 1700-000000"
          placeholderTextColor={C.textMuted}
          keyboardType="phone-pad"
        />
        <Text style={[styles.consent, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          {t.blood2.whatsappConsent}
        </Text>

        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>
            {t.blood2.lastDonatedOptional}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={[styles.quickDateBtn, { backgroundColor: C.surface2 }]}
              onPress={() => setLastDonated(localToday())}
              activeOpacity={0.75}
            >
              <Text style={[styles.quickDateTxt, { color: SectorColors.blood, fontFamily: FontFamily.jakartaBold }]}>
                Today
              </Text>
            </TouchableOpacity>
            {lastDonated.length > 0 && (
              <TouchableOpacity
                style={[styles.quickDateBtn, { backgroundColor: C.surface2 }]}
                onPress={() => setLastDonated('')}
                activeOpacity={0.75}
              >
                <Text style={[styles.quickDateTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  Clear
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={lastDonated}
          onChangeText={setLastDonated}
          placeholder={t.blood2.lastDonatedPlaceholder}
          placeholderTextColor={C.textMuted}
        />

        {/* Notification Sensitivity */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
          Notification Sensitivity
        </Text>
        <Text style={[styles.consent, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium, marginBottom: 8 }]}>
          Choose which blood requests should alert your device.
        </Text>
        <View style={styles.urgencyPrefGrid}>
          {[
            { id: 'urgent_only', label: 'Urgent Only', icon: 'alert-triangle' as const, fg: C.danger, desc: 'Critical emergencies, trauma & ICU only' },
            { id: 'today_plus',  label: 'Urgent & Today', icon: 'clock' as const, fg: C.warn, desc: 'Emergencies and requests needed within today' },
            { id: 'all',         label: 'All Requests', icon: 'calendar' as const, fg: C.brand, desc: 'All matching requests including this week' },
          ].map(opt => {
            const on = alertUrgency === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.urgencyPrefCard,
                  {
                    backgroundColor: on ? (isDark ? 'rgba(214, 61, 53, 0.14)' : 'rgba(214, 61, 53, 0.08)') : C.surface,
                    borderColor: on ? SectorColors.blood : C.border,
                    borderWidth: on ? 1.5 : 1,
                  },
                ]}
                onPress={() => setAlertUrgency(opt.id as any)}
                activeOpacity={0.75}
              >
                <View style={styles.urgencyRadioRow}>
                  <View style={[styles.urgencyRadioDot, { borderColor: on ? SectorColors.blood : C.textMuted }]}>
                    {on && <View style={[styles.urgencyRadioInner, { backgroundColor: SectorColors.blood }]} />}
                  </View>
                  <Feather
                    name={opt.icon}
                    size={14}
                    color={on ? SectorColors.blood : opt.fg}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.urgencyPrefTitle, { color: on ? SectorColors.blood : C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {opt.label}
                  </Text>
                </View>
                <Text style={[styles.urgencyPrefDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {opt.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? SectorColors.blood : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <AnimatedIcon family="feather" name="droplet" size={18} color={canSubmit ? '#fff' : C.textMuted} animation="entrance" />
          <Text style={[styles.submitText, { color: canSubmit ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isRegistered ? t.blood2.updateDonorBtn : t.blood2.registerAsDonorBtnFull}
          </Text>
        </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      )}
      <AreaPickerModal
        visible={areaModalVisible}
        onClose={() => setAreaModalVisible(false)}
        selectedArea={area}
        onSelectArea={selected => setArea(selected === 'All' ? '' : selected)}
        allowAll={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  centerLoad: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 4,
  } as ViewStyle,
  lockedBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  lockedGroupTxt: { fontSize: 16 } as any,
  lockedTitle: { fontSize: 14 } as any,
  lockedNote: { fontSize: 11.5, marginTop: 2 } as any,
  permPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  } as ViewStyle,
  permTxt: { fontSize: 10 } as any,

  label: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 18,
    marginLeft: 2,
  } as any,

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 2,
  } as ViewStyle,

  selectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  } as ViewStyle,
  selectorIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  selectorValueTxt: {
    fontSize: 13.5,
  } as TextStyle,
  selectorSubTxt: {
    fontSize: 11,
    marginTop: 1,
  } as TextStyle,

  quickDateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  } as ViewStyle,
  quickDateTxt: {
    fontSize: 11,
  } as TextStyle,

  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,

  groupBtn: {
    width: '22%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
  } as ViewStyle,

  groupTxt: { fontSize: 15 } as any,

  consent: { fontSize: 11.5, lineHeight: 16, marginTop: 8, marginLeft: 2 } as any,

  input: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14.5,
  } as any,

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 58,
    borderRadius: 16,
    marginTop: 22,
  } as ViewStyle,

  submitText: { fontSize: 15 } as any,
  urgencyPrefGrid: {
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  } as ViewStyle,
  urgencyPrefCard: {
    borderRadius: 16,
    padding: 14,
  } as ViewStyle,
  urgencyRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  } as ViewStyle,
  urgencyRadioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  urgencyRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  } as ViewStyle,
  urgencyPrefTitle: {
    fontSize: 13.5,
  } as TextStyle,
  urgencyPrefDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginLeft: 28,
  } as TextStyle,
});
