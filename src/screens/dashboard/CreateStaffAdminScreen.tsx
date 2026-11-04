import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { useToast } from '../../components/ui/Toast';
import { FontFamily, Layout } from '../../theme';
import { createUserAsAdmin } from '../../services/adminService';
import { useAuth } from '../../store/authStore';

type CreatableRole = 'staff' | 'admin';

interface TradeOption {
  id: string | null;
  name: string;
  icon: string;
  desc: string;
}

const TRADE_OPTIONS: TradeOption[] = [
  {
    id: 'Electrical',
    name: 'Electrical',
    icon: 'zap',
    desc: 'Wiring, switches, lighting, generators',
  },
  {
    id: 'Plumbing',
    name: 'Plumbing',
    icon: 'droplets',
    desc: 'Pipes, water supply, sanitation, faucets',
  },
  {
    id: 'Cleanliness',
    name: 'Cleanliness',
    icon: 'sparkles',
    desc: 'Campus housekeeping and waste disposal',
  },
  {
    id: 'IT / Network',
    name: 'IT / Network',
    icon: 'wifi',
    desc: 'Wi-Fi, routers, lab PCs, network jacks',
  },
  {
    id: 'Furniture',
    name: 'Furniture',
    icon: 'box',
    desc: 'Desks, chairs, whiteboards, doors, locks',
  },
  {
    id: 'Safety / Security',
    name: 'Safety / Security',
    icon: 'shield',
    desc: 'Fire equipment, emergency exits, surveillance',
  },
  {
    id: 'Other',
    name: 'Other',
    icon: 'wrench',
    desc: 'General facility maintenance and repairs',
  },
  {
    id: null,
    name: 'General Maintenance',
    icon: 'sliders',
    desc: 'No specific trade (all campus maintenance)',
  },
];

export function CreateStaffAdminScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const showToast = useToast();

  const [role, setRole] = useState<CreatableRole>('staff');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [trade, setTrade] = useState<string | null>(null);
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const roleTabs = useMemo<TabItem<CreatableRole>[]>(() => [
    {
      id: 'staff',
      label: 'Staff Account',
      icon: 'briefcase',
    },
    {
      id: 'admin',
      label: 'Admin Account',
      icon: 'shield',
    },
  ], []);

  const selectedTradeOption = useMemo(
    () => TRADE_OPTIONS.find((t) => t.id === trade) ?? TRADE_OPTIONS[TRADE_OPTIONS.length - 1],
    [trade]
  );

  const isValidEmail = /\S+@\S+\.\S+/.test(email.trim());
  const isValidPassword = password.length >= 6;
  const isValidName = name.trim().length >= 2;
  const isFormValid = isValidName && isValidEmail && isValidPassword;

  const handleCreate = useCallback(async () => {
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      const res = await createUserAsAdmin({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        expertise: role === 'staff' ? trade : null,
      });

      if (!res.ok) {
        showToast({
          type: 'error',
          title: 'Account Creation Failed',
          message: res.error ?? 'Could not create account.',
        });
        return;
      }

      showToast({
        type: 'success',
        title: 'Account Created',
        message: `${name.trim()} added as ${role === 'admin' ? 'Administrator' : 'Staff'}.`,
      });

      Alert.alert(
        'Account Created Successfully',
        `The ${role === 'admin' ? 'Administrator' : 'Staff'} account for ${name.trim()} has been provisioned and is ready to sign in.`,
        [
          {
            text: 'Go to User Directory',
            onPress: () => {
              navigation.replace('ManageUsers');
            },
          },
          {
            text: 'Create Another',
            style: 'cancel',
            onPress: () => {
              setName('');
              setEmail('');
              setPassword('');
              setTrade(null);
            },
          },
        ]
      );
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err?.message ?? 'An unexpected error occurred.',
      });
    } finally {
      setSubmitting(false);
    }
  }, [isFormValid, submitting, name, email, password, role, trade, showToast, navigation]);

  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Create Account" onBack={() => navigation.goBack()} />
        <View style={styles.accessDeniedWrap}>
          <Icon name="shield" size={44} color={C.danger} />
          <Text style={[styles.accessDeniedTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            Access Denied
          </Text>
          <Text style={[styles.accessDeniedSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            Only administrators are authorized to create staff and admin accounts.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Create Account" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Account Type Selector (58dp SegmentedTabs) */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            ACCOUNT TYPE
          </Text>
          <SegmentedTabs<CreatableRole>
            tabs={roleTabs}
            activeTab={role}
            onTabChange={(newRole) => {
              setRole(newRole);
              if (newRole !== 'staff') setTrade(null);
            }}
            size="md"
          />

          {/* Full Name Input (58dp) */}
          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            FULL NAME
          </Text>
          <View style={[styles.inputBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Icon name="user" size={26} color={C.textMuted} />
            <TextInput
              style={[styles.inputTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
            />
          </View>

          {/* Email Input (58dp) */}
          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            UNIVERSITY EMAIL
          </Text>
          <View style={[styles.inputBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Icon name="mail" size={26} color={C.textMuted} />
            <TextInput
              style={[styles.inputTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={email}
              onChangeText={setEmail}
              placeholder="name@bubt.edu.bd"
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password Input (58dp) with Bug-Free Centered Eye Toggle */}
          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            PASSWORD (MIN. 6 CHARACTERS)
          </Text>
          <View style={[styles.inputBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Icon name="key" size={26} color={C.textMuted} />
            <TextInput
              style={[styles.inputTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Assigned Trade Dropdown Bar (Staff Role Only) */}
          {role === 'staff' && (
            <View style={{ marginTop: 2 }}>
              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                ASSIGNED TRADE / SPECIALTY
              </Text>
              <TouchableOpacity
                style={[
                  styles.dropdownBar58,
                  {
                    backgroundColor: C.surface,
                    borderColor: trade ? C.brand : C.border,
                  },
                ]}
                onPress={() => setTradeModalVisible(true)}
                activeOpacity={0.75}
              >
                <View style={styles.dropdownLeading}>
                  <Icon
                    name={selectedTradeOption.icon}
                    size={32}
                    color={trade ? C.brand : C.text}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        styles.dropdownTitle,
                        {
                          color: trade ? C.text : C.textMuted,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {trade ?? 'Select Assigned Trade'}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-down" size={20} color={trade ? C.brand : C.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Submit Button (58dp) */}
          <TouchableOpacity
            style={[
              styles.submitBtn58,
              {
                backgroundColor: isFormValid ? C.brand : C.surface2,
                opacity: isFormValid && !submitting ? 1 : 0.6,
              },
            ]}
            disabled={!isFormValid || submitting}
            onPress={handleCreate}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <>
                <Feather name="user-plus" size={20} color={isFormValid ? C.white : C.textMuted} />
                <Text
                  style={[
                    styles.submitBtnTxt,
                    {
                      color: isFormValid ? C.white : C.textMuted,
                      fontFamily: FontFamily.jakartaBold,
                    },
                  ]}
                >
                  Create {role === 'admin' ? 'Admin' : 'Staff'} Account
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Trade Picker Bottom Sheet Modal */}
      <Modal
        visible={tradeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTradeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTradeModalVisible(false)}
        />
        <View
          style={[
            styles.tradeSheet,
            {
              backgroundColor: C.surface,
              paddingBottom: Math.max(28, insets.bottom + 12),
            },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: C.border2 }]} />

          <View style={styles.sheetHeaderRow}>
            <View>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                Select Assigned Trade
              </Text>
              <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Assign a campus maintenance specialty
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.sheetCloseBtn, { backgroundColor: C.surface2 }]}
              onPress={() => setTradeModalVisible(false)}
            >
              <Feather name="x" size={18} color={C.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={TRADE_OPTIONS}
            keyExtractor={(item) => item.name}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 440 }}
            renderItem={({ item: opt }) => {
              const isSelected = trade === opt.id;

              return (
                <TouchableOpacity
                  style={[
                    styles.tradeModalRow58,
                    {
                      backgroundColor: isSelected ? C.surface2 : 'transparent',
                      borderColor: isSelected ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => {
                    setTrade(opt.id);
                    setTradeModalVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.tradeModalLeading}>
                    <Icon name={opt.icon} size={32} color={isSelected ? C.brand : C.text} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          styles.tradeModalName,
                          {
                            color: isSelected ? C.brand : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {opt.name}
                      </Text>
                      <Text
                        style={[styles.tradeModalDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}
                        numberOfLines={1}
                      >
                        {opt.desc}
                      </Text>
                    </View>
                  </View>

                  {isSelected && <Feather name="check" size={18} color={C.brand} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  } as ViewStyle,

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  } as any,

  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 2,
  } as any,

  /* 58dp Input Bar with Large Icons */
  inputBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 14,
  } as ViewStyle,
  inputTxt: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  } as any,
  eyeBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  /* 58dp Dropdown Bar */
  dropdownBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  } as ViewStyle,
  dropdownLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginRight: 12,
  } as ViewStyle,
  dropdownTitle: {
    fontSize: 15,
  } as any,

  /* 58dp Submit Button */
  submitBtn58: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 28,
  } as ViewStyle,
  submitBtnTxt: {
    fontSize: 15.5,
  } as any,

  /* Access Denied */
  accessDeniedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  } as ViewStyle,
  accessDeniedTitle: {
    fontSize: 18,
    marginTop: 6,
  } as any,
  accessDeniedSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  } as any,

  /* Modal Sheets */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  } as ViewStyle,
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  } as ViewStyle,
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  } as ViewStyle,
  sheetTitle: {
    fontSize: 18,
  } as any,
  sheetSub: {
    fontSize: 12.5,
    marginTop: 2,
  } as any,
  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  /* Trade Picker Modal */
  tradeSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 14,
  } as ViewStyle,
  tradeModalRow58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  } as ViewStyle,
  tradeModalLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginRight: 12,
  } as ViewStyle,
  tradeModalName: {
    fontSize: 14.5,
  } as any,
  tradeModalDesc: {
    fontSize: 11.5,
    marginTop: 1,
  } as any,
});
