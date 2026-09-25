import React from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from './Avatar';
import { useToast } from './Toast';
import { FontFamily, FontSize, Radius, Layout } from '../../theme';
import { callPhone, openWhatsApp, openUrl } from '../../utils/link';

interface ContactSheetProps {
  visible: boolean;
  name: string;
  title?: string;
  roleSubtitle?: string;
  avatarUri?: string | null;
  phone?: string | null;
  email?: string | null;
  inAppChatAction?: () => void;
  onClose: () => void;
}

export function ContactSheet({
  visible,
  name,
  title,
  roleSubtitle,
  avatarUri,
  phone,
  email,
  inAppChatAction,
  onClose,
}: ContactSheetProps) {
  const { C, isDark } = useTheme();
  const toast = useToast();

  if (!visible) return null;

  const cleanPhone = phone?.trim();

  async function handleCopy() {
    if (!cleanPhone) return;
    await Clipboard.setStringAsync(cleanPhone);
    toast({ type: 'success', title: 'Copied', message: 'Phone number copied to clipboard' });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.sheet, { backgroundColor: C.surface, borderColor: C.border }]}>
          {/* Grab handle */}
          <View style={[styles.handle, { backgroundColor: C.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <Avatar uri={avatarUri} name={name} size="lg" />
            <View style={styles.headerText}>
              <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {name}
              </Text>
              {!!(roleSubtitle ?? title) && (
                <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {roleSubtitle ?? title}
                </Text>
              )}
            </View>
          </View>

          {/* Phone Display Card */}
          {cleanPhone ? (
            <View style={[styles.phoneCard, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <View style={styles.phoneLeft}>
                <Feather name="phone" size={16} color={C.brand} />
                <Text style={[styles.phoneText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {cleanPhone}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCopy}
                style={[styles.copyBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <Feather name="copy" size={14} color={C.text2} />
                <Text style={[styles.copyTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  Copy
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.phoneCard, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                No phone number provided
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {cleanPhone ? (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.callBtn, { backgroundColor: C.success }]}
                  onPress={() => {
                    callPhone(cleanPhone);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="phone-call" size={18} color="#fff" />
                  <Text style={[styles.btnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    Call Phone
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.waBtn, { backgroundColor: '#25D366' }]}
                  onPress={() => {
                    openWhatsApp(cleanPhone);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="message-circle" size={18} color="#fff" />
                  <Text style={[styles.btnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    Chat on WhatsApp
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            {inAppChatAction && (
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                onPress={() => {
                  onClose();
                  inAppChatAction();
                }}
                activeOpacity={0.8}
              >
                <Feather name="message-square" size={18} color={C.text} />
                <Text style={[styles.btnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Message in CampusOne
                </Text>
              </TouchableOpacity>
            )}

            {email && (
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                onPress={() => {
                  onClose();
                  openUrl(`mailto:${email}`);
                }}
                activeOpacity={0.8}
              >
                <Feather name="mail" size={18} color={C.text} />
                <Text style={[styles.btnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Send Email
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: C.border }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    flex: 1,
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  } as ViewStyle,
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  } as ViewStyle,
  headerText: {
    flex: 1,
  } as ViewStyle,
  name: {
    fontSize: 17,
  } as any,
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  } as any,
  phoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  } as ViewStyle,
  phoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  phoneText: {
    fontSize: 16,
    letterSpacing: 0.5,
  } as any,
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  copyTxt: {
    fontSize: 12,
  } as any,
  actions: {
    gap: 10,
  } as ViewStyle,
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 48,
    borderRadius: 13,
  } as ViewStyle,
  callBtn: {},
  waBtn: {},
  btnTxt: {
    fontSize: 15,
  } as any,
  cancelBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  } as ViewStyle,
  cancelTxt: {
    fontSize: 14,
  } as any,
});
