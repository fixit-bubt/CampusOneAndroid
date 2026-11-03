import { useState } from 'react';
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
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { useToast } from '../../components/ui/Toast';
import { FontFamily, Layout } from '../../theme';
import { createUserAsAdmin } from '../../services/adminService';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';

type CreatableRole = 'staff' | 'admin';

const TRADES = [
  'Electrical',
  'Plumbing',
  'Cleanliness',
  'IT / Network',
  'Furniture',
  'Safety / Security',
  'Other',
] as const;

export function CreateStaffAdminScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const t = useT();
  const showToast = useToast();

  const [role, setRole] = useState<CreatableRole>('staff');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trade, setTrade] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const roleTabs: TabItem<CreatableRole>[] = [
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
  ];

  const isValidEmail = /\S+@\S+\.\S+/.test(email.trim());
  const isValidPassword = password.length >= 6;
  const isValidName = name.trim().length >= 2;
  const isFormValid = isValidName && isValidEmail && isValidPassword;

  async function handleCreate() {
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
        'Account Created',
        `The ${role === 'admin' ? 'Admin' : 'Staff'} account for ${name.trim()} has been created successfully.`,
        [
          {
            text: 'Manage Users',
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
  }

  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Create Account" onBack={() => navigation.goBack()} />
        <View style={styles.accessDeniedWrap}>
          <Icon name="shield" size={40} color={C.danger} />
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
          {/* Header Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.infoIconWrap}>
              <Icon name="shield" size={24} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoBannerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Administrative Provisioning
              </Text>
              <Text style={[styles.infoBannerDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                Create university staff or administrator credentials. Students register independently.
              </Text>
            </View>
          </View>

          {/* Role Selector: 58dp SegmentedTabs */}
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
            <Icon name="user" size={20} color={C.textMuted} />
            <TextInput
              style={[styles.inputTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Engr. Tanvir Ahmed"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
            />
          </View>

          {/* Email Input (58dp) */}
          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            UNIVERSITY EMAIL
          </Text>
          <View style={[styles.inputBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Icon name="mail" size={20} color={C.textMuted} />
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

          {/* Password Input (58dp) */}
          <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            PASSWORD (MIN. 6 CHARACTERS)
          </Text>
          <View style={[styles.inputBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Icon name="key" size={20} color={C.textMuted} />
            <PasswordInput
              style={[styles.inputTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={C.textMuted}
            />
          </View>

          {/* If Staff: Trade Specialty Selector */}
          {role === 'staff' && (
            <View style={{ marginTop: 6 }}>
              <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                ASSIGNED TRADE / SPECIALTY (OPTIONAL)
              </Text>
              <View style={styles.tradeWrap}>
                {TRADES.map((t) => {
                  const isSelected = trade === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.tradeChip,
                        {
                          backgroundColor: isSelected ? C.brand : C.surface,
                          borderColor: isSelected ? C.brand : C.border,
                        },
                      ]}
                      onPress={() => setTrade(isSelected ? null : t)}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.chipDot,
                          { backgroundColor: isSelected ? '#ffffff' : C.textMuted },
                        ]}
                      />
                      <Text
                        style={[
                          styles.tradeChipTxt,
                          {
                            color: isSelected ? '#ffffff' : C.text,
                            fontFamily: FontFamily.jakartaBold,
                          },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Submit Button (58dp) */}
          <TouchableOpacity
            style={[
              styles.submitBtn58,
              {
                backgroundColor: isFormValid ? C.brand : (isDark ? '#262626' : '#e4e4e7'),
                opacity: isFormValid && !submitting ? 1 : 0.6,
              },
            ]}
            disabled={!isFormValid || submitting}
            onPress={handleCreate}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Feather name="user-plus" size={18} color={isFormValid ? '#ffffff' : C.textMuted} />
                <Text
                  style={[
                    styles.submitBtnTxt,
                    {
                      color: isFormValid ? '#ffffff' : C.textMuted,
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 40,
  } as ViewStyle,

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    marginBottom: 20,
  } as ViewStyle,
  infoIconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  infoBannerTitle: {
    fontSize: 14.5,
    marginBottom: 2,
  } as any,
  infoBannerDesc: {
    fontSize: 12,
    lineHeight: 17,
  } as any,

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

  inputBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  } as ViewStyle,
  inputTxt: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
  } as any,

  tradeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  } as ViewStyle,
  tradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  } as ViewStyle,
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  tradeChipTxt: {
    fontSize: 12.5,
  } as any,

  submitBtn58: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
  } as ViewStyle,
  submitBtnTxt: {
    fontSize: 15,
  } as any,

  accessDeniedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
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
});

