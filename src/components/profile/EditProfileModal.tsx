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
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../ui/Toast';
import { Avatar } from '../ui/Avatar';
import { TactileSwitch } from '../ui/TactileSwitch';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { uploadPhoto } from '../../utils/storage';
import type { Profile } from '../../types/database';
import type { TablesUpdate } from '../../types/supabase';
import type { User } from '@supabase/supabase-js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

type EditTab = 'academic' | 'contact' | 'privacy';

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
  const { C, isDark } = useTheme();
  const t = useT();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<EditTab>('academic');
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: C.surface, borderColor: C.border }]}>
          {/* Default Sheet Handle */}
          <View style={[styles.handle, { backgroundColor: C.border }]} />

          {/* Modal Header Bar */}
          <View style={styles.headerBar}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {t.common.edit ? `${t.common.edit} Profile` : 'Edit Profile'}
              </Text>
              <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Update your academic credentials & reachability
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
              onPress={onClose}
              hitSlop={8}
              activeOpacity={0.75}
            >
              <Feather name="x" size={18} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tabs */}
          <View style={[styles.tabBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === 'academic' && [styles.tabItemActive, { backgroundColor: C.surface }],
              ]}
              onPress={() => setActiveTab('academic')}
              activeOpacity={0.8}
            >
              <Feather
                name="award"
                size={14}
                color={activeTab === 'academic' ? C.brand : C.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: activeTab === 'academic' ? C.text : C.textMuted,
                    fontFamily: activeTab === 'academic' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                Academic
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === 'contact' && [styles.tabItemActive, { backgroundColor: C.surface }],
              ]}
              onPress={() => setActiveTab('contact')}
              activeOpacity={0.8}
            >
              <Feather
                name="phone"
                size={14}
                color={activeTab === 'contact' ? C.brand : C.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: activeTab === 'contact' ? C.text : C.textMuted,
                    fontFamily: activeTab === 'contact' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                Contact
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === 'privacy' && [styles.tabItemActive, { backgroundColor: C.surface }],
              ]}
              onPress={() => setActiveTab('privacy')}
              activeOpacity={0.8}
            >
              <Feather
                name="shield"
                size={14}
                color={activeTab === 'privacy' ? C.brand : C.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: activeTab === 'privacy' ? C.text : C.textMuted,
                    fontFamily: activeTab === 'privacy' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                Privacy
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Form Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formScroll}
          >
            {activeTab === 'academic' && (
              <View>
                {/* Photo & Avatar Picker Row */}
                <View style={[styles.avatarPickCard, { backgroundColor: C.surface2, borderColor: C.border }]}>
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

                {/* Full Name Input */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  FULL NAME
                </Text>
                <View style={[styles.inputBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
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
                    {/* Student ID */}
                    <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      STUDENT ID (BUBT ANNEX NUMBER)
                    </Text>
                    <View style={[styles.inputBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
                      <TextInput
                        style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                        value={studentId}
                        onChangeText={setStudentId}
                        placeholder="e.g. 21225103112"
                        placeholderTextColor={C.textMuted}
                        keyboardType="number-pad"
                      />
                    </View>

                    {/* Department & Program */}
                    <View style={styles.halfRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                          DEPARTMENT
                        </Text>
                        <View style={[styles.inputBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
                          <TextInput
                            style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                            value={department}
                            onChangeText={setDepartment}
                            placeholder="e.g. CSE"
                            placeholderTextColor={C.textMuted}
                            autoCapitalize="characters"
                          />
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                          PROGRAM
                        </Text>
                        <View style={[styles.inputBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
                          <TextInput
                            style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                            value={program}
                            onChangeText={setProgram}
                            placeholder="e.g. B.Sc. in CSE"
                            placeholderTextColor={C.textMuted}
                          />
                        </View>
                      </View>
                    </View>

                    {/* Intake & Section */}
                    <View style={styles.halfRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                          INTAKE
                        </Text>
                        <View style={[styles.inputBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
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
                        <View style={[styles.inputBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
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

                    {/* Blood Group Chips */}
                    <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      BLOOD GROUP (DONOR ELIGIBILITY)
                    </Text>
                    <View style={styles.bloodChipsWrap}>
                      {BLOOD_GROUPS.map((bg) => {
                        const isSelected = bloodGroup.trim().toUpperCase() === bg;
                        return (
                          <TouchableOpacity
                            key={bg}
                            style={[
                              styles.bloodChip,
                              {
                                backgroundColor: isSelected
                                  ? isDark ? 'rgba(248, 113, 113, 0.2)' : '#fee2e2'
                                  : C.surface2,
                                borderColor: isSelected
                                  ? isDark ? '#f87171' : '#dc2626'
                                  : C.border,
                              },
                            ]}
                            onPress={() => setBloodGroup(isSelected ? '' : bg)}
                            activeOpacity={0.75}
                          >
                            <Text
                              style={[
                                styles.bloodChipTxt,
                                {
                                  color: isSelected
                                    ? isDark ? '#f87171' : '#dc2626'
                                    : C.text2,
                                  fontFamily: FontFamily.jakartaBold,
                                },
                              ]}
                            >
                              {bg}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
            )}

            {activeTab === 'contact' && (
              <View>
                {/* Phone */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  CONTACT PHONE
                </Text>
                <View style={[styles.inputBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
                  <TextInput
                    style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. +880 1712-345678"
                    placeholderTextColor={C.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>

                {/* WhatsApp */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  WHATSAPP NUMBER
                </Text>
                <View style={[styles.inputBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
                  <TextInput
                    style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    value={whatsapp}
                    onChangeText={setWhatsapp}
                    placeholder="e.g. 01712345678"
                    placeholderTextColor={C.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Present Address */}
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  CAMPUS / PRESENT ADDRESS
                </Text>
                <View style={[styles.inputBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
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
                <View style={[styles.privacyCard, { backgroundColor: C.surface2, borderColor: C.border }]}>
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

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Fixed Bottom Action Row */}
          <View style={[styles.bottomBar, { borderTopColor: C.border }]}>
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
                  <Feather name="check" size={17} color="#ffffff" />
                  <Text style={[styles.primaryBtnTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                    Save Changes
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: C.border }]}
              onPress={onClose}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  backdrop: {
    ...StyleSheet.absoluteFill,
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    paddingTop: 12,
  } as ViewStyle,
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  } as ViewStyle,
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    marginBottom: 12,
  } as ViewStyle,
  sheetTitle: {
    fontSize: 18.5,
    letterSpacing: -0.2,
    lineHeight: 24,
  } as TextStyle,
  sheetSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  } as TextStyle,
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Layout.screenPadding,
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
  } as ViewStyle,
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  } as ViewStyle,
  tabItemActive: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,
  tabLabel: {
    fontSize: 12.5,
  } as TextStyle,

  formScroll: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 6,
    paddingBottom: 20,
  } as ViewStyle,

  avatarPickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
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
    paddingVertical: 8,
    borderRadius: 10,
  } as ViewStyle,
  pickBtnTxt: {
    fontSize: 12,
  } as TextStyle,

  inputLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 10,
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
  textInput: {
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,

  halfRow: {
    flexDirection: 'row',
    gap: 10,
  } as ViewStyle,

  bloodChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  } as ViewStyle,
  bloodChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  bloodChipTxt: {
    fontSize: 13,
  } as TextStyle,

  privacyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
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
    marginVertical: 12,
  } as ViewStyle,

  bottomBar: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  cancelBtnTxt: {
    fontSize: 13.5,
  } as TextStyle,
});
