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
  sub?: string;
  icon?: keyof typeof Feather.glyphMap;
}

const DEPARTMENTS: PickerOption[] = [
  { code: 'CSE', name: 'Computer Science & Engineering', sub: 'Dept. of CSE', icon: 'cpu' },
  { code: 'EEE', name: 'Electrical & Electronic Engineering', sub: 'Dept. of EEE', icon: 'zap' },
  { code: 'BBA', name: 'Business Administration', sub: 'Faculty of Business', icon: 'briefcase' },
  { code: 'Civil', name: 'Civil Engineering', sub: 'Dept. of Civil', icon: 'compass' },
  { code: 'Textile', name: 'Textile Engineering', sub: 'Dept. of Textile', icon: 'layers' },
  { code: 'Law', name: 'Department of Law', sub: 'Faculty of Law', icon: 'shield' },
  { code: 'English', name: 'Department of English', sub: 'Arts & Humanities', icon: 'book-open' },
  { code: 'Economics', name: 'Department of Economics', sub: 'Social Sciences', icon: 'trending-up' },
  { code: 'Mathematics', name: 'Department of Mathematics', sub: 'Science & Math', icon: 'hash' },
];

const PROGRAMS: PickerOption[] = [
  // Undergraduate
  { code: 'B.Sc. in CSE', name: 'B.Sc. in CSE', sub: 'Undergraduate · 4 Years', icon: 'cpu' },
  { code: 'B.Sc. in EEE', name: 'B.Sc. in EEE', sub: 'Undergraduate · 4 Years', icon: 'zap' },
  { code: 'B.Sc. in Civil Engineering', name: 'B.Sc. in Civil Engineering', sub: 'Undergraduate · 4 Years', icon: 'compass' },
  { code: 'B.Sc. in Textile Engineering', name: 'B.Sc. in Textile Engineering', sub: 'Undergraduate · 4 Years', icon: 'layers' },
  { code: 'BBA', name: 'Bachelor of Business Administration', sub: 'Undergraduate · 4 Years', icon: 'briefcase' },
  { code: 'LL.B (Hons)', name: 'LL.B (Hons)', sub: 'Undergraduate · 4 Years', icon: 'shield' },
  { code: 'B.A. (Hons) in English', name: 'B.A. (Hons) in English', sub: 'Undergraduate · 4 Years', icon: 'book-open' },
  { code: 'B.Sc. (Hons) in Economics', name: 'B.Sc. (Hons) in Economics', sub: 'Undergraduate · 4 Years', icon: 'trending-up' },
  // Postgraduate
  { code: 'M.Sc. in CSE', name: 'M.Sc. in CSE', sub: 'Postgraduate · Master Program', icon: 'cpu' },
  { code: 'MBA', name: 'Master of Business Administration', sub: 'Postgraduate · Master Program', icon: 'briefcase' },
  { code: 'EMBA', name: 'Executive MBA', sub: 'Postgraduate · Executive Program', icon: 'briefcase' },
  { code: 'LL.M', name: 'Master of Laws', sub: 'Postgraduate · Master Program', icon: 'shield' },
  { code: 'M.A. in English', name: 'M.A. in English', sub: 'Postgraduate · Master Program', icon: 'book-open' },
  { code: 'M.Sc. in Mathematics', name: 'M.Sc. in Mathematics', sub: 'Postgraduate · Master Program', icon: 'hash' },
];

const BLOOD_GROUPS: { code: string; name: string; sub: string }[] = [
  { code: 'A+', name: 'A Positive (A+)', sub: 'Can give to A+, AB+ · Can receive from A+, A-, O+, O-' },
  { code: 'A-', name: 'A Negative (A-)', sub: 'Can give to A-, A+, AB-, AB+ · Can receive from A-, O-' },
  { code: 'B+', name: 'B Positive (B+)', sub: 'Can give to B+, AB+ · Can receive from B+, B-, O+, O-' },
  { code: 'B-', name: 'B Negative (B-)', sub: 'Can give to B-, B+, AB-, AB+ · Can receive from B-, O-' },
  { code: 'O+', name: 'O Positive (O+)', sub: 'Most common · Can give to O+, A+, B+, AB+' },
  { code: 'O-', name: 'O Negative (O-)', sub: 'Universal Red Cell Donor · Can give to all blood groups' },
  { code: 'AB+', name: 'AB Positive (AB+)', sub: 'Universal Plasma Donor · Can receive from all groups' },
  { code: 'AB-', name: 'AB Negative (AB-)', sub: 'Rare group · Can receive from AB-, A-, B-, O-' },
];

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
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<EditTab>('academic');
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [studentId, setStudentId] = useState('');
  const [program, setProgram] = useState('');
  const [intake, setIntake] = useState('');
  const [section, setSection] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dirVisible, setDirVisible] = useState(true);
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [pickedAvatar, setPickedAvatar] = useState<string | null>(null);

  const isStudent = (profile?.role ?? 'student') === 'student';

  useEffect(() => {
    if (visible && profile) {
      setFullName(profile.full_name ?? '');
      setDepartment(profile.department ?? '');
      setStudentId(profile.student_id ?? '');
      setProgram(profile.program ?? '');
      setIntake(profile.intake ?? '');
      setSection(profile.section ?? '');
      setBloodGroup(profile.blood_group ?? '');
      setWhatsapp(profile.whatsapp ?? '');
      setPhone(profile.phone ?? '');
      setAddress(profile.address ?? '');
      setDirVisible(profile.directory_visible ?? true);
      setShowWhatsapp(profile.show_whatsapp ?? false);
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
      const payload: TablesUpdate<'profiles'> = {
        full_name: fullName.trim(),
        department: department.trim(),
        whatsapp: whatsapp.trim(),
        phone: phone.trim(),
        address: address.trim(),
        updated_at: new Date().toISOString(),
      };

      if (isStudent) {
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
        {/* Full-Bleed Top Bar */}
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
            style={[styles.backBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
            onPress={onClose}
            hitSlop={8}
            activeOpacity={0.75}
            accessibilityLabel="Close"
          >
            <Feather name="arrow-left" size={20} color={C.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]} numberOfLines={1}>
              {t.common.edit ? `${t.common.edit} Profile` : 'Edit Profile'}
            </Text>
            <Text style={[styles.headerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
              Update academic credentials & contact info
            </Text>
          </View>

          <View style={styles.headerRightBox}>
            <TouchableOpacity
              style={[styles.saveHeaderBtn, { backgroundColor: C.brand, opacity: saving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={[styles.saveHeaderTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 58dp Segmented Tabs Switcher with Smooth Animation */}
        <View style={styles.tabContainer}>
          <SegmentedTabs<EditTab>
            tabs={EDIT_TABS}
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
                    <Text style={[styles.pickSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      Square photo (JPG, PNG) up to 5MB
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.pickBtn, { backgroundColor: C.brand }]}
                    onPress={handlePickAvatar}
                    activeOpacity={0.8}
                  >
                    <Feather name="camera" size={14} color="#ffffff" />
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

                {isStudent && (
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
                          size={18}
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
                          {department ? `${department} · Academic Dept` : 'Select Department (e.g. CSE)'}
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
                          size={18}
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
                          borderColor: bloodGroup ? (isDark ? '#f87171' : '#dc2626') : C.border,
                        },
                      ]}
                      onPress={() => setActivePicker('blood')}
                      activeOpacity={0.75}
                    >
                      <View style={styles.barLeftContent}>
                        <Feather
                          name="droplet"
                          size={18}
                          color={bloodGroup ? (isDark ? '#f87171' : '#dc2626') : C.textMuted}
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

            {activeTab === 'contact' && (
              <View>
                {/* Contact Phone (58dp) */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  CONTACT PHONE
                </Text>
                <View style={[styles.inputBar, { backgroundColor: C.surface, borderColor: C.border }]}>
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
                <View style={[styles.inputBar, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <TextInput
                    style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={whatsapp}
                    onChangeText={setWhatsapp}
                    placeholder="e.g. 01712345678"
                    placeholderTextColor={C.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Present Address (58dp) */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  CAMPUS / PRESENT ADDRESS
                </Text>
                <View style={[styles.inputBar, { backgroundColor: C.surface, borderColor: C.border }]}>
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

            {activeTab === 'privacy' && (
              <View>
                <View style={[styles.privacyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={[styles.toggleTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        Show in Student Directory
                      </Text>
                      <Text style={[styles.toggleSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        Allow enrolled BUBT students to discover and connect with your profile
                      </Text>
                    </View>
                    <TactileSwitch value={dirVisible} onValueChange={setDirVisible} />
                  </View>

                  <View style={[styles.toggleDivider, { backgroundColor: C.border }]} />

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={[styles.toggleTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        Show WhatsApp to Connected Students
                      </Text>
                      <Text style={[styles.toggleSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        Reveals your WhatsApp direct button to mutual peers for academic collaboration
                      </Text>
                    </View>
                    <TactileSwitch value={showWhatsapp} onValueChange={setShowWhatsapp} />
                  </View>
                </View>
              </View>
            )}

            <View style={{ height: 28 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Fixed Bottom Action Row (58dp Bars) */}
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
            style={[styles.primaryBtn, { backgroundColor: C.brand, opacity: saving ? 0.7 : 1 }]}
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

          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: C.border, backgroundColor: C.surface2 }]}
            onPress={onClose}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── DROPDOWN SELECTION MODAL OVERLAY (58dp Option Bars) ── */}
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
                  <Text style={[styles.pickerSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {activePicker === 'dept'
                      ? 'Choose your academic department at BUBT'
                      : activePicker === 'program'
                      ? 'Choose your degree programme at BUBT'
                      : 'Helps peers find blood donors in medical emergencies'}
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
                {activePicker === 'dept' &&
                  DEPARTMENTS.map((d) => {
                    const active = department.trim().toUpperCase() === d.code.toUpperCase();
                    return (
                      <TouchableOpacity
                        key={d.code}
                        style={[
                          styles.modalRow58,
                          {
                            backgroundColor: active ? C.brand + '15' : C.surface2,
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
                            name={d.icon ?? 'briefcase'}
                            size={18}
                            color={active ? C.brand : C.textMuted}
                            style={{ marginRight: 12 }}
                          />
                          <View>
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
                            {d.sub && (
                              <Text
                                style={[
                                  styles.modalRowDesc,
                                  {
                                    color: C.textMuted,
                                    fontFamily: FontFamily.jakartaMedium,
                                  },
                                ]}
                              >
                                {d.sub}
                              </Text>
                            )}
                          </View>
                        </View>
                        {active && <Feather name="check" size={18} color={C.brand} />}
                      </TouchableOpacity>
                    );
                  })}

                {activePicker === 'program' &&
                  PROGRAMS.map((p) => {
                    const active = program.trim().toLowerCase() === p.code.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={p.code}
                        style={[
                          styles.modalRow58,
                          {
                            backgroundColor: active ? C.brand + '15' : C.surface2,
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
                            name={p.icon ?? 'book-open'}
                            size={18}
                            color={active ? C.brand : C.textMuted}
                            style={{ marginRight: 12 }}
                          />
                          <View>
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
                            {p.sub && (
                              <Text
                                style={[
                                  styles.modalRowDesc,
                                  {
                                    color: C.textMuted,
                                    fontFamily: FontFamily.jakartaMedium,
                                  },
                                ]}
                              >
                                {p.sub}
                              </Text>
                            )}
                          </View>
                        </View>
                        {active && <Feather name="check" size={18} color={C.brand} />}
                      </TouchableOpacity>
                    );
                  })}

                {activePicker === 'blood' && (
                  <>
                    {BLOOD_GROUPS.map((bg) => {
                      const active = bloodGroup.trim().toUpperCase() === bg.code;
                      return (
                        <TouchableOpacity
                          key={bg.code}
                          style={[
                            styles.modalRow58,
                            {
                              backgroundColor: active
                                ? isDark ? 'rgba(248, 113, 113, 0.16)' : '#fee2e2'
                                : C.surface2,
                              borderColor: active
                                ? isDark ? '#f87171' : '#dc2626'
                                : C.border,
                            },
                          ]}
                          onPress={() => {
                            setBloodGroup(bg.code);
                            setActivePicker(null);
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={styles.modalRowLeft}>
                            <View
                              style={[
                                styles.bloodBadgeSlot,
                                {
                                  backgroundColor: active
                                    ? isDark ? '#f87171' : '#dc2626'
                                    : C.surface,
                                  borderColor: active
                                    ? isDark ? '#f87171' : '#dc2626'
                                    : C.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.bloodBadgeTxt,
                                  {
                                    color: active
                                      ? '#ffffff'
                                      : isDark ? '#f87171' : '#dc2626',
                                    fontFamily: FontFamily.jakartaExtraBold,
                                  },
                                ]}
                              >
                                {bg.code}
                              </Text>
                            </View>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text
                                style={[
                                  styles.modalRowLabel,
                                  {
                                    color: active ? C.text : C.text2,
                                    fontFamily: FontFamily.jakartaBold,
                                  },
                                ]}
                              >
                                {bg.name}
                              </Text>
                              <Text
                                style={[
                                  styles.modalRowDesc,
                                  {
                                    color: C.textMuted,
                                    fontFamily: FontFamily.jakartaMedium,
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {bg.sub}
                              </Text>
                            </View>
                          </View>
                          {active && (
                            <Feather
                              name="check"
                              size={18}
                              color={isDark ? '#f87171' : '#dc2626'}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}

                    {/* Option to Clear Blood Group */}
                    <TouchableOpacity
                      style={[
                        styles.modalRow58,
                        {
                          backgroundColor: !bloodGroup ? C.brand + '15' : C.surface2,
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
                          size={18}
                          color={!bloodGroup ? C.brand : C.textMuted}
                          style={{ marginRight: 12 }}
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
                      {!bloodGroup && <Feather name="check" size={18} color={C.brand} />}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  } as ViewStyle,
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as ViewStyle,
  headerTitleWrap: {
    flex: 1,
  } as ViewStyle,
  headerTitle: {
    fontSize: 18,
    letterSpacing: -0.2,
    lineHeight: 23,
  } as TextStyle,
  headerSub: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  } as TextStyle,
  headerRightBox: {
    marginLeft: 8,
  } as ViewStyle,
  saveHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  } as ViewStyle,
  saveHeaderTxt: {
    fontSize: 13,
  } as TextStyle,

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
    fontSize: 14,
    lineHeight: 18,
  } as TextStyle,
  pickSub: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
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
  barLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  } as ViewStyle,
  barIcon: {
    marginRight: 10,
  } as TextStyle,
  barText: {
    fontSize: 14.5,
  } as TextStyle,
  textInput: {
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,

  halfRow: {
    flexDirection: 'row',
    gap: 10,
  } as ViewStyle,

  privacyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 6,
  } as ViewStyle,
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  toggleTitle: {
    fontSize: 13.5,
    lineHeight: 18,
  } as TextStyle,
  toggleSub: {
    fontSize: 11.5,
    marginTop: 3,
    lineHeight: 16,
  } as TextStyle,
  toggleDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  } as ViewStyle,

  bottomBar: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  } as ViewStyle,
  primaryBtn: {
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  primaryBtnTxt: {
    fontSize: 15,
  } as TextStyle,
  cancelBtn: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  cancelBtnTxt: {
    fontSize: 14,
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
  pickerSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
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
  } as ViewStyle,
  modalRowLabel: {
    fontSize: 14,
    lineHeight: 18,
  } as TextStyle,
  modalRowDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  } as TextStyle,
  bloodBadgeSlot: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as ViewStyle,
  bloodBadgeTxt: {
    fontSize: 13,
  } as TextStyle,
});
