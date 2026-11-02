import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../ui/Toast';
import { Avatar } from '../ui/Avatar';
import { LogoMark } from '../ui/Logo';
import { TactileSwitch } from '../ui/TactileSwitch';
import { SegmentedTabs, type TabItem } from '../ui/SegmentedTabs';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { uploadPhoto } from '../../utils/storage';
import type { Profile } from '../../types/database';
import type { TablesUpdate } from '../../types/supabase';
import type { User } from '@supabase/supabase-js';

type EditTab = 'academic' | 'contact' | 'privacy';
type PickerType = 'dept' | 'program' | 'blood' | null;

interface PickerOption {
  code: string;
  name: string;
  icon: keyof typeof Feather.glyphMap;
}

const DEPARTMENTS: PickerOption[] = [
  { code: 'CSE', name: 'Computer Science & Engineering', icon: 'cpu' },
  { code: 'EEE', name: 'Electrical & Electronic Engineering', icon: 'zap' },
  { code: 'BBA', name: 'Business Administration', icon: 'briefcase' },
  { code: 'Civil', name: 'Civil Engineering', icon: 'compass' },
  { code: 'Textile', name: 'Textile Engineering', icon: 'layers' },
  { code: 'Law', name: 'Department of Law', icon: 'shield' },
  { code: 'English', name: 'Department of English', icon: 'book-open' },
  { code: 'Economics', name: 'Department of Economics', icon: 'trending-up' },
  { code: 'Mathematics', name: 'Department of Mathematics', icon: 'hash' },
];

const PROGRAMS: PickerOption[] = [
  // Undergraduate
  { code: 'B.Sc. in CSE', name: 'B.Sc. in Computer Science & Engineering', icon: 'cpu' },
  { code: 'B.Sc. in EEE', name: 'B.Sc. in Electrical & Electronic Engineering', icon: 'zap' },
  { code: 'B.Sc. in Civil Engineering', name: 'B.Sc. in Civil Engineering', icon: 'compass' },
  { code: 'B.Sc. in Textile Engineering', name: 'B.Sc. in Textile Engineering', icon: 'layers' },
  { code: 'BBA', name: 'Bachelor of Business Administration', icon: 'briefcase' },
  { code: 'LL.B (Hons)', name: 'Bachelor of Laws (LL.B Hons)', icon: 'shield' },
  { code: 'B.A. (Hons) in English', name: 'B.A. (Hons) in English', icon: 'book-open' },
  { code: 'B.Sc. (Hons) in Economics', name: 'B.Sc. (Hons) in Economics', icon: 'trending-up' },
  // Postgraduate
  { code: 'M.Sc. in CSE', name: 'M.Sc. in Computer Science & Engineering', icon: 'cpu' },
  { code: 'MBA', name: 'Master of Business Administration', icon: 'briefcase' },
  { code: 'EMBA', name: 'Executive MBA', icon: 'briefcase' },
  { code: 'LL.M', name: 'Master of Laws (LL.M)', icon: 'shield' },
  { code: 'M.A. in English', name: 'M.A. in English', icon: 'book-open' },
  { code: 'M.Sc. in Mathematics', name: 'M.Sc. in Mathematics', icon: 'hash' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

function getDefaultProgramForDept(code: string): string {
  switch (code.toUpperCase()) {
    case 'CSE': return 'B.Sc. in CSE';
    case 'EEE': return 'B.Sc. in EEE';
    case 'BBA': return 'BBA';
    case 'CIVIL': return 'B.Sc. in Civil Engineering';
    case 'TEXTILE': return 'B.Sc. in Textile Engineering';
    case 'LAW': return 'LL.B (Hons)';
    case 'ENGLISH': return 'B.A. (Hons) in English';
    case 'ECONOMICS': return 'B.Sc. (Hons) in Economics';
    case 'MATHEMATICS': return 'M.Sc. in Mathematics';
    default: return '';
  }
}

function getDefaultDeptForProgram(prog: string): string {
  const p = prog.toLowerCase();
  if (p.includes('cse')) return 'CSE';
  if (p.includes('eee')) return 'EEE';
  if (p.includes('civil')) return 'Civil';
  if (p.includes('textile')) return 'Textile';
  if (p.includes('bba') || p.includes('mba')) return 'BBA';
  if (p.includes('law') || p.includes('ll.b') || p.includes('ll.m')) return 'Law';
  if (p.includes('english')) return 'English';
  if (p.includes('economics')) return 'Economics';
  if (p.includes('math')) return 'Mathematics';
  return '';
}

const EDIT_TABS: TabItem<EditTab>[] = [
  { id: 'academic', label: 'Academic', icon: 'award' },
  { id: 'contact',  label: 'Contact',  icon: 'phone' },
  { id: 'privacy',  label: 'Privacy',  icon: 'shield' },
];

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profile: Profile | null;
  user: User | null;
  onSaved: () => Promise<void> | void;
}

export function EditProfileModal({
  visible,
  onClose,
  profile,
  user,
  onSaved,
}: EditProfileModalProps) {
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<EditTab>('academic');
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // Form states - Academic
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [studentId, setStudentId] = useState('');
  const [program, setProgram] = useState('');
  const [intake, setIntake] = useState('');
  const [section, setSection] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  // Form states - Contact
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [telegram, setTelegram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [address, setAddress] = useState('');

  // Form states - Privacy
  const [dirVisible, setDirVisible] = useState(true);
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [showPhone, setShowPhone] = useState(true);
  const [showSocials, setShowSocials] = useState(true);
  const [allowDms, setAllowDms] = useState(true);

  const [pickedAvatar, setPickedAvatar] = useState<string | null>(null);

  const isStudent = (profile?.role ?? 'student') === 'student';
  const editTabs: TabItem<EditTab>[] = React.useMemo(() => isStudent ? EDIT_TABS : [
    { id: 'academic', label: 'Profile', icon: 'user' },
    { id: 'contact',  label: 'Contact', icon: 'phone' },
    { id: 'privacy',  label: 'Privacy', icon: 'shield' },
  ], [isStudent]);

  useEffect(() => {
    if (visible && profile) {
      setFullName(profile.full_name ?? '');
      setDepartment(profile.department ?? '');
      setStudentId(profile.student_id ?? '');
      setProgram(profile.program ?? '');
      setIntake(profile.intake ?? '');
      setSection(profile.section ?? '');
      setBloodGroup(profile.blood_group ?? '');
      setPhone(profile.phone ?? '');
      setWhatsapp(profile.whatsapp ?? '');
      setAddress(profile.address ?? '');
      setDirVisible(profile.directory_visible ?? true);
      setShowWhatsapp(profile.show_whatsapp ?? false);
      setAllowDms((profile as any).allow_dms ?? true);

      // Parse social links and privacy options from expertise json
      if (profile.expertise) {
        try {
          const parsed = JSON.parse(profile.expertise);
          if (typeof parsed === 'object' && parsed !== null) {
            setFacebook(parsed.facebook || '');
            setInstagram(parsed.instagram || '');
            setTelegram(parsed.telegram || '');
            setLinkedin(parsed.linkedin || '');
            setShowPhone(parsed.show_phone ?? true);
            setShowSocials(parsed.show_socials ?? true);
          }
        } catch {
          // If plain text was stored
        }
      } else {
        setFacebook('');
        setInstagram('');
        setTelegram('');
        setLinkedin('');
        setShowPhone(true);
        setShowSocials(true);
      }

      setPickedAvatar(null);
      setActiveTab('academic');
      setActivePicker(null);
    }
  }, [visible, profile]);

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast({
        type: 'info',
        title: t.mainx.permissionRequired ?? 'Permission Required',
        message: t.mainx.mediaPermissionBody ?? 'Allow photo library access to change your profile picture.',
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPickedAvatar(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!user || savingRef.current) return;
    if (!fullName.trim()) {
      toast({ type: 'error', title: t.common.error ?? 'Error', message: 'Full name is required.' });
      return;
    }
    savingRef.current = true;
    setSaving(true);

    try {
      const socialAndPrivacyPayload = JSON.stringify({
        facebook: facebook.trim(),
        instagram: instagram.trim(),
        telegram: telegram.trim(),
        linkedin: linkedin.trim(),
        show_phone: showPhone,
        show_socials: showSocials,
      });

      const payload: TablesUpdate<'profiles'> = {
        full_name: fullName.trim(),
        department: department.trim(),
        whatsapp: whatsapp.trim(),
        phone: phone.trim(),
        address: address.trim(),
        allow_dms: allowDms,
        updated_at: new Date().toISOString(),
      };

      if (isStudent) {
        payload.expertise = socialAndPrivacyPayload;
        payload.student_id = studentId.trim();
        payload.program = program.trim();
        payload.intake = intake.trim();
        payload.section = section.trim();
        payload.blood_group = bloodGroup.trim();
        payload.directory_visible = dirVisible;
        payload.show_whatsapp = showWhatsapp;
      }

      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (error) {
        toast({ type: 'error', title: t.common.error ?? 'Error', message: error.message });
        return;
      }

      if (pickedAvatar) {
        const up = await uploadPhoto(pickedAvatar, 'avatars', user.id);
        if (up.success) {
          await supabase.from('profiles').update({ avatar_url: up.url }).eq('id', user.id);
        } else {
          toast({
            type: 'info',
            title: 'Saved',
            message: 'Profile updated, but photo upload failed. You can retry anytime.',
          });
        }
      }

      await onSaved();
      toast({ type: 'success', title: t.common.done ?? 'Saved', message: 'Profile updated successfully.' });
      onClose();
    } catch (err: any) {
      toast({ type: 'error', title: t.common.error ?? 'Error', message: err?.message || 'Failed to update profile.' });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { backgroundColor: C.bg }]}>
        {/* Full-Bleed Top Bar with LogoMark */}
        <View
          style={[
            styles.headerBar,
            {
              backgroundColor: C.surface,
              borderBottomColor: C.border,
              paddingTop: Math.max(insets.top, 16) + 4,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onClose}
            hitSlop={8}
            activeOpacity={0.75}
            accessibilityLabel="Close"
          >
            <Feather name="arrow-left" size={24} color={C.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={1}>
              {t.common.edit ? `${t.common.edit} Profile` : 'Edit Profile'}
            </Text>
          </View>

          <View style={styles.headerRightBox}>
            <LogoMark size={28} shadow={false} />
          </View>
        </View>

        {/* 58dp Segmented Tabs Switcher with Smooth Animation */}
        <View style={styles.tabContainer}>
          <SegmentedTabs<EditTab>
            tabs={editTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            size="md"
          />
        </View>

        {/* Scrollable Form Body */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formScroll}
          >
            {/* ═══════════ TAB 1: ACADEMIC ═══════════ */}
            {activeTab === 'academic' && (
              <View>
                {/* Photo & Avatar Picker Row */}
                <View style={[styles.avatarPickCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.avatarWrap}>
                    <Avatar
                      uri={pickedAvatar ?? profile?.avatar_url}
                      name={fullName || profile?.full_name}
                      size="lg"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Profile Picture
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.pickBtn, { backgroundColor: C.brand }]}
                    onPress={handlePickAvatar}
                    activeOpacity={0.8}
                  >
                    <Feather name="camera" size={15} color="#ffffff" />
                    <Text style={[styles.pickBtnTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                      {pickedAvatar ? 'Change' : 'Upload'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Full Name Input (58dp) */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  FULL NAME
                </Text>
                <View style={[styles.inputBar, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <TextInput
                    style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="e.g. Shahriar Rahman"
                    placeholderTextColor={C.textMuted}
                  />
                </View>

                {!isStudent ? (
                  <>
                    {profile?.expertise ? (
                      <>
                        <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                          STAFF TRADE
                        </Text>
                        <View style={[styles.inputBar58, { backgroundColor: C.surface2, borderColor: C.border }]}>
                          <Text style={[styles.barText, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                            {profile.expertise}
                          </Text>
                        </View>
                      </>
                    ) : null}
                    <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      DEPARTMENT
                    </Text>
                    <View style={[styles.inputBar, { backgroundColor: C.surface, borderColor: C.border }]}>
                      <TextInput
                        style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                        value={department}
                        onChangeText={setDepartment}
                        placeholder="e.g. Facilities & Maintenance"
                        placeholderTextColor={C.textMuted}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    {/* Student ID (58dp) */}
                    <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      STUDENT ID (BUBT ANNEX NUMBER)
                    </Text>
                    <View style={[styles.inputBar, { backgroundColor: C.surface, borderColor: C.border }]}>
                      <TextInput
                        style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                        value={studentId}
                        onChangeText={setStudentId}
                        placeholder="e.g. 21225103112"
                        placeholderTextColor={C.textMuted}
                        keyboardType="number-pad"
                      />
                    </View>

                    {/* Department Dropdown Bar (58dp) */}
                    <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      DEPARTMENT
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.inputBar58,
                        {
                          backgroundColor: C.surface,
                          borderColor: department ? C.brand : C.border,
                        },
                      ]}
                      onPress={() => setActivePicker('dept')}
                      activeOpacity={0.75}
                    >
                      <View style={styles.barLeftContent}>
                        <Feather
                          name="briefcase"
                          size={24}
                          color={department ? C.brand : C.textMuted}
                          style={styles.barIcon}
                        />
                        <Text
                          style={[
                            styles.barText,
                            {
                              color: department ? C.text : C.textMuted,
                              fontFamily: department ? FontFamily.jakartaSemiBold : FontFamily.jakartaMedium,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {department ? `${department} · Department` : 'Select Department (e.g. CSE)'}
                        </Text>
                      </View>
                      <Feather name="chevron-down" size={18} color={C.textMuted} />
                    </TouchableOpacity>

                    {/* Program Dropdown Bar (58dp) */}
                    <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      PROGRAM
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.inputBar58,
                        {
                          backgroundColor: C.surface,
                          borderColor: program ? C.brand : C.border,
                        },
                      ]}
                      onPress={() => setActivePicker('program')}
                      activeOpacity={0.75}
                    >
                      <View style={styles.barLeftContent}>
                        <Feather
                          name="book-open"
                          size={24}
                          color={program ? C.brand : C.textMuted}
                          style={styles.barIcon}
                        />
                        <Text
                          style={[
                            styles.barText,
                            {
                              color: program ? C.text : C.textMuted,
                              fontFamily: program ? FontFamily.jakartaSemiBold : FontFamily.jakartaMedium,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {program || 'Select Academic Program (e.g. B.Sc. in CSE)'}
                        </Text>
                      </View>
                      <Feather name="chevron-down" size={18} color={C.textMuted} />
                    </TouchableOpacity>

                    {/* Intake & Section in 58dp Bars */}
                    <View style={styles.halfRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                          INTAKE
                        </Text>
                        <View style={[styles.inputBar, { backgroundColor: C.surface, borderColor: C.border }]}>
                          <TextInput
                            style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                            value={intake}
                            onChangeText={setIntake}
                            placeholder="e.g. 48"
                            placeholderTextColor={C.textMuted}
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                          SECTION
                        </Text>
                        <View style={[styles.inputBar, { backgroundColor: C.surface, borderColor: C.border }]}>
                          <TextInput
                            style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                            value={section}
                            onChangeText={setSection}
                            placeholder="e.g. 3"
                            placeholderTextColor={C.textMuted}
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>
                    </View>

                    {/* Blood Donation Dropdown Bar (58dp) */}
                    <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      BLOOD GROUP (DONOR ELIGIBILITY)
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.inputBar58,
                        {
                          backgroundColor: C.surface,
                          borderColor: bloodGroup ? C.brand : C.border,
                        },
                      ]}
                      onPress={() => setActivePicker('blood')}
                      activeOpacity={0.75}
                    >
                      <View style={styles.barLeftContent}>
                        <Feather
                          name="droplet"
                          size={24}
                          color={bloodGroup ? C.brand : C.textMuted}
                          style={styles.barIcon}
                        />
                        <Text
                          style={[
                            styles.barText,
                            {
                              color: bloodGroup ? C.text : C.textMuted,
                              fontFamily: bloodGroup ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {bloodGroup ? `${bloodGroup} Blood Group` : 'Select Blood Type (e.g. O+)'}
                        </Text>
                      </View>
                      <Feather name="chevron-down" size={18} color={C.textMuted} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* ═══════════ TAB 2: CONTACT ═══════════ */}
            {activeTab === 'contact' && (
              <View>
                {/* Contact Phone (58dp) */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  CONTACT PHONE
                </Text>
                <View style={[styles.inputBarWithIcon, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="phone" size={24} color={phone ? C.brand : C.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. +880 1712-345678"
                    placeholderTextColor={C.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>

                {/* WhatsApp (58dp) */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  WHATSAPP NUMBER
                </Text>
                <View style={[styles.inputBarWithIcon, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="message-circle" size={24} color={whatsapp ? C.brand : C.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={whatsapp}
                    onChangeText={setWhatsapp}
                    placeholder="e.g. 01712345678"
                    placeholderTextColor={C.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Facebook (58dp) */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  FACEBOOK PROFILE
                </Text>
                <View style={[styles.inputBarWithIcon, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="facebook" size={24} color={facebook ? C.brand : C.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={facebook}
                    onChangeText={setFacebook}
                    placeholder="e.g. fb.com/username or username"
                    placeholderTextColor={C.textMuted}
                    autoCapitalize="none"
                  />
                </View>

                {/* Instagram (58dp) */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  INSTAGRAM HANDLE
                </Text>
                <View style={[styles.inputBarWithIcon, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="instagram" size={24} color={instagram ? C.brand : C.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={instagram}
                    onChangeText={setInstagram}
                    placeholder="e.g. @yourhandle"
                    placeholderTextColor={C.textMuted}
                    autoCapitalize="none"
                  />
                </View>

                {/* Telegram (58dp) */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  TELEGRAM USERNAME
                </Text>
                <View style={[styles.inputBarWithIcon, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="send" size={24} color={telegram ? C.brand : C.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={telegram}
                    onChangeText={setTelegram}
                    placeholder="e.g. @telegram_user"
                    placeholderTextColor={C.textMuted}
                    autoCapitalize="none"
                  />
                </View>

                {/* LinkedIn / Portfolio (58dp) */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  LINKEDIN / PORTFOLIO
                </Text>
                <View style={[styles.inputBarWithIcon, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="globe" size={24} color={linkedin ? C.brand : C.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={linkedin}
                    onChangeText={setLinkedin}
                    placeholder="e.g. linkedin.com/in/username"
                    placeholderTextColor={C.textMuted}
                    autoCapitalize="none"
                  />
                </View>

                {/* Present Address (58dp) */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  CAMPUS / PRESENT ADDRESS
                </Text>
                <View style={[styles.inputBarWithIcon, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="map-pin" size={24} color={address ? C.brand : C.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="e.g. Mirpur-2, Dhaka"
                    placeholderTextColor={C.textMuted}
                  />
                </View>
              </View>
            )}

            {/* ═══════════ TAB 3: PRIVACY ═══════════ */}
            {activeTab === 'privacy' && (
              <View style={{ gap: 10, marginTop: 4 }}>
                {/* 1. Student Directory (58dp) */}
                <View style={[styles.privacyBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.privacyBarLeft}>
                    <Feather name="users" size={24} color={dirVisible ? C.brand : C.textMuted} style={{ marginRight: 12 }} />
                    <Text style={[styles.privacyBarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Show in Student Directory
                    </Text>
                  </View>
                  <TactileSwitch value={dirVisible} onValueChange={setDirVisible} />
                </View>

                {/* 2. WhatsApp Direct (58dp) */}
                <View style={[styles.privacyBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.privacyBarLeft}>
                    <Feather name="message-circle" size={24} color={showWhatsapp ? C.brand : C.textMuted} style={{ marginRight: 12 }} />
                    <Text style={[styles.privacyBarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Show WhatsApp to Peers
                    </Text>
                  </View>
                  <TactileSwitch value={showWhatsapp} onValueChange={setShowWhatsapp} />
                </View>

                {/* 3. Phone Number (58dp) */}
                <View style={[styles.privacyBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.privacyBarLeft}>
                    <Feather name="phone" size={24} color={showPhone ? C.brand : C.textMuted} style={{ marginRight: 12 }} />
                    <Text style={[styles.privacyBarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Show Phone Number
                    </Text>
                  </View>
                  <TactileSwitch value={showPhone} onValueChange={setShowPhone} />
                </View>

                {/* 4. Social Media Links (58dp) */}
                <View style={[styles.privacyBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.privacyBarLeft}>
                    <Feather name="share-2" size={24} color={showSocials ? C.brand : C.textMuted} style={{ marginRight: 12 }} />
                    <Text style={[styles.privacyBarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Show Social Media Links
                    </Text>
                  </View>
                  <TactileSwitch value={showSocials} onValueChange={setShowSocials} />
                </View>

                {/* 5. Allow Direct Messages (58dp) */}
                <View style={[styles.privacyBar58, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.privacyBarLeft}>
                    <Feather name="mail" size={24} color={allowDms ? C.brand : C.textMuted} style={{ marginRight: 12 }} />
                    <Text style={[styles.privacyBarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Allow Direct Messages
                    </Text>
                  </View>
                  <TactileSwitch value={allowDms} onValueChange={setAllowDms} />
                </View>
              </View>
            )}

            <View style={{ height: 28 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Fixed Bottom Action Row: 2 Same-Size Buttons in 1 Bar */}
        <View
          style={[
            styles.bottomBar,
            {
              borderTopColor: C.border,
              backgroundColor: C.surface,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.bottomBtn, styles.cancelBtn, { borderColor: C.border, backgroundColor: C.surface2 }]}
            onPress={onClose}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomBtn, styles.primaryBtn, { backgroundColor: C.brand, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.82}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={styles.btnContentRow}>
                <Feather name="check" size={18} color="#ffffff" />
                <Text style={[styles.primaryBtnTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                  Save Changes
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── DROPDOWN SELECTION MODAL OVERLAY (Big 32dp Icons, No Boxes, No Red, No Subtext) ── */}
        {activePicker !== null && (
          <View style={styles.pickerOverlay}>
            <TouchableOpacity
              style={styles.pickerBackdrop}
              activeOpacity={1}
              onPress={() => setActivePicker(null)}
            />
            <View
              style={[
                styles.pickerSheet,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  paddingBottom: Math.max(insets.bottom, 20),
                },
              ]}
            >
              <View style={[styles.pickerHandle, { backgroundColor: C.border }]} />

              <View style={styles.pickerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                    {activePicker === 'dept'
                      ? 'Select Department'
                      : activePicker === 'program'
                      ? 'Select Academic Program'
                      : 'Select Blood Group'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.pickerCloseBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={() => setActivePicker(null)}
                  hitSlop={8}
                >
                  <Feather name="x" size={18} color={C.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 380 }}
                contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
              >
                {/* Department Options (Big 32dp Icons, No Below Text) */}
                {activePicker === 'dept' &&
                  DEPARTMENTS.map((d) => {
                    const active = department.trim().toUpperCase() === d.code.toUpperCase();
                    return (
                      <TouchableOpacity
                        key={d.code}
                        style={[
                          styles.modalRow58,
                          {
                            backgroundColor: active ? (C.brand + '15') : C.surface2,
                            borderColor: active ? C.brand : C.border,
                          },
                        ]}
                        onPress={() => {
                          setDepartment(d.code);
                          if (!program) {
                            const defaultProg = getDefaultProgramForDept(d.code);
                            if (defaultProg) setProgram(defaultProg);
                          }
                          setActivePicker(null);
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={styles.modalRowLeft}>
                          <Feather
                            name={d.icon}
                            size={32}
                            color={active ? C.brand : C.text}
                            style={{ marginRight: 14 }}
                          />
                          <Text
                            style={[
                              styles.modalRowLabel,
                              {
                                color: active ? C.text : C.text2,
                                fontFamily: FontFamily.jakartaBold,
                              },
                            ]}
                          >
                            {d.code} · {d.name}
                          </Text>
                        </View>
                        {active && <Feather name="check" size={20} color={C.brand} />}
                      </TouchableOpacity>
                    );
                  })}

                {/* Program Options (Big 32dp Icons, No Below Text) */}
                {activePicker === 'program' &&
                  PROGRAMS.map((p) => {
                    const active = program.trim().toLowerCase() === p.code.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={p.code}
                        style={[
                          styles.modalRow58,
                          {
                            backgroundColor: active ? (C.brand + '15') : C.surface2,
                            borderColor: active ? C.brand : C.border,
                          },
                        ]}
                        onPress={() => {
                          setProgram(p.code);
                          if (!department) {
                            const defaultDept = getDefaultDeptForProgram(p.code);
                            if (defaultDept) setDepartment(defaultDept);
                          }
                          setActivePicker(null);
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={styles.modalRowLeft}>
                          <Feather
                            name={p.icon}
                            size={32}
                            color={active ? C.brand : C.text}
                            style={{ marginRight: 14 }}
                          />
                          <Text
                            style={[
                              styles.modalRowLabel,
                              {
                                color: active ? C.text : C.text2,
                                fontFamily: FontFamily.jakartaBold,
                              },
                            ]}
                          >
                            {p.name}
                          </Text>
                        </View>
                        {active && <Feather name="check" size={20} color={C.brand} />}
                      </TouchableOpacity>
                    );
                  })}

                {/* Blood Group Options (Big 32dp Droplet Icons, No Box, No Red, No Below Text) */}
                {activePicker === 'blood' && (
                  <>
                    {BLOOD_GROUPS.map((bg) => {
                      const active = bloodGroup.trim().toUpperCase() === bg;
                      return (
                        <TouchableOpacity
                          key={bg}
                          style={[
                            styles.modalRow58,
                            {
                              backgroundColor: active ? (C.brand + '15') : C.surface2,
                              borderColor: active ? C.brand : C.border,
                            },
                          ]}
                          onPress={() => {
                            setBloodGroup(bg);
                            setActivePicker(null);
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={styles.modalRowLeft}>
                            <Feather
                              name="droplet"
                              size={32}
                              color={active ? C.brand : C.text}
                              style={{ marginRight: 14 }}
                            />
                            <Text
                              style={[
                                styles.modalRowLabel,
                                {
                                  color: active ? C.text : C.text2,
                                  fontFamily: FontFamily.jakartaBold,
                                },
                              ]}
                            >
                              {bg} Blood Group
                            </Text>
                          </View>
                          {active && <Feather name="check" size={20} color={C.brand} />}
                        </TouchableOpacity>
                      );
                    })}

                    {/* Option to Clear Blood Group */}
                    <TouchableOpacity
                      style={[
                        styles.modalRow58,
                        {
                          backgroundColor: !bloodGroup ? (C.brand + '15') : C.surface2,
                          borderColor: !bloodGroup ? C.brand : C.border,
                          marginTop: 4,
                        },
                      ]}
                      onPress={() => {
                        setBloodGroup('');
                        setActivePicker(null);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.modalRowLeft}>
                        <Feather
                          name="slash"
                          size={32}
                          color={!bloodGroup ? C.brand : C.textMuted}
                          style={{ marginRight: 14 }}
                        />
                        <Text
                          style={[
                            styles.modalRowLabel,
                            {
                              color: !bloodGroup ? C.text : C.text2,
                              fontFamily: FontFamily.jakartaSemiBold,
                            },
                          ]}
                        >
                          Clear / Not Specified
                        </Text>
                      </View>
                      {!bloodGroup && <Feather name="check" size={20} color={C.brand} />}
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  } as ViewStyle,

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 14,
    borderBottomWidth: 1,
  } as ViewStyle,
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as ViewStyle,
  headerTitleWrap: {
    flex: 1,
  } as ViewStyle,
  headerTitle: {
    fontSize: 18.5,
    letterSpacing: -0.2,
    lineHeight: 24,
  } as TextStyle,
  headerRightBox: {
    marginLeft: 8,
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  } as ViewStyle,

  tabContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 10,
    paddingBottom: 4,
  } as ViewStyle,

  formScroll: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 8,
    paddingBottom: 24,
  } as ViewStyle,

  avatarPickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  avatarWrap: {
    borderRadius: 30,
  } as ViewStyle,
  pickTitle: {
    fontSize: 14.5,
    lineHeight: 19,
  } as TextStyle,
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
  } as ViewStyle,
  pickBtnTxt: {
    fontSize: 12,
  } as TextStyle,

  inputLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 12,
    marginLeft: 2,
  } as TextStyle,
  inputBar: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginBottom: 4,
  } as ViewStyle,
  inputBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  } as ViewStyle,
  inputBarWithIcon: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  } as ViewStyle,
  inputIcon: {
    marginRight: 12,
  } as TextStyle,
  barLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  } as ViewStyle,
  barIcon: {
    marginRight: 12,
  } as TextStyle,
  barText: {
    fontSize: 14.5,
  } as TextStyle,
  textInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,

  halfRow: {
    flexDirection: 'row',
    gap: 10,
  } as ViewStyle,

  privacyBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  privacyBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  } as ViewStyle,
  privacyBarTitle: {
    fontSize: 14,
  } as TextStyle,

  bottomBar: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  bottomBtn: {
    flex: 1,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  primaryBtn: {
    // inherits from bottomBtn
  } as ViewStyle,
  cancelBtn: {
    borderWidth: 1,
  } as ViewStyle,
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  primaryBtnTxt: {
    fontSize: 15,
  } as TextStyle,
  cancelBtnTxt: {
    fontSize: 14.5,
  } as TextStyle,

  // Dropdown Picker Overlay Styles
  pickerOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    justifyContent: 'flex-end',
  } as ViewStyle,
  pickerBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
  } as ViewStyle,
  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: Layout.screenPadding,
  } as ViewStyle,
  pickerHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  } as ViewStyle,
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  } as ViewStyle,
  pickerTitle: {
    fontSize: 17,
    letterSpacing: -0.2,
    lineHeight: 22,
  } as TextStyle,
  pickerCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalRow58: {
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  modalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  } as ViewStyle,
  modalRowLabel: {
    fontSize: 14.5,
    lineHeight: 19,
  } as TextStyle,
});
