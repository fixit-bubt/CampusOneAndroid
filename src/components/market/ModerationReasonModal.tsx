import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, Layout } from '../../theme';
import { useT } from '../../i18n';

interface ModerationReasonModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
  listingTitle?: string;
}

export function ModerationReasonModal({
  visible,
  onClose,
  onConfirm,
  loading = false,
  listingTitle,
}: ModerationReasonModalProps) {
  const { C, isDark } = useTheme();
  const t = useT();

  const REASONS = [
    { id: 'prohibited', label: t.market2.reasonProhibited ?? 'Prohibited item / Policy violation', icon: 'slash' as const },
    { id: 'scam',       label: t.market2.reasonScam ?? 'Misleading pricing / Suspicious item',     icon: 'dollar-sign' as const },
    { id: 'photo',      label: t.market2.reasonInappropriate ?? 'Inappropriate photos or language', icon: 'image' as const },
    { id: 'spam',       label: t.market2.reasonSpam ?? 'Duplicate or spam listing',                 icon: 'copy' as const },
    { id: 'other',      label: t.market2.reasonOther ?? 'Other violation',                         icon: 'edit-3' as const },
  ];

  const [selectedId, setSelectedId] = useState<string>('prohibited');
  const [customReason, setCustomReason] = useState<string>('');

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleConfirm = async () => {
    const selected = REASONS.find(r => r.id === selectedId);
    let finalReason = selected ? selected.label : 'Policy violation';
    if (selectedId === 'other' && customReason.trim().length > 0) {
      finalReason = customReason.trim();
    }
    await onConfirm(finalReason);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: C.surface, borderColor: C.border }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {t.market2.takeDownTitle ?? 'Take Down Listing'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                {listingTitle ? `"${listingTitle}"` : (t.market2.takeDownPrompt ?? 'Select removal reason')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={[styles.closeBtn, { backgroundColor: C.surface2 }]}
              hitSlop={8}
            >
              <Feather name="x" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionHeading, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.market2.takeDownPrompt ?? 'Select reason for taking down this listing. The seller will be notified.'}
            </Text>

            {/* 58dp Preset Reason Bars */}
            <View style={styles.barsContainer}>
              {REASONS.map((r) => {
                const isSelected = selectedId === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.bar58,
                      {
                        backgroundColor: isSelected ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : C.surface,
                        borderColor: isSelected ? C.text : C.border,
                      },
                    ]}
                    onPress={() => handleSelect(r.id)}
                    activeOpacity={0.75}
                    disabled={loading}
                  >
                    <View style={styles.iconSlot32}>
                      <Feather name={r.icon} size={24} color={C.text} />
                    </View>
                    <Text
                      style={[
                        styles.barTitleTxt,
                        {
                          color: C.text,
                          fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {r.label}
                    </Text>
                    <View style={[styles.radioOutline, { borderColor: isSelected ? C.text : C.border }]}>
                      {isSelected && <View style={[styles.radioDot, { backgroundColor: C.text }]} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* 58dp Custom Note Input (if 'other' selected) */}
              {selectedId === 'other' && (
                <View style={[styles.bar58, { backgroundColor: C.surface2, borderColor: C.border, marginTop: 4 }]}>
                  <View style={styles.iconSlot32}>
                    <Feather name="message-square" size={22} color={C.textMuted} />
                  </View>
                  <TextInput
                    style={[styles.inputTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    placeholder={t.market2.customReasonPlaceholder ?? 'Specify reason for the seller...'}
                    placeholderTextColor={C.textMuted}
                    value={customReason}
                    onChangeText={setCustomReason}
                    maxLength={140}
                    editable={!loading}
                  />
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Action Strip */}
          <View style={[styles.footer, { borderTopColor: C.border }]}>
            <TouchableOpacity
              style={[styles.confirmBtn58, { backgroundColor: C.danger, opacity: loading ? 0.7 : 1 }]}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="shield-off" size={18} color="#fff" />
                  <Text style={[styles.confirmBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    {t.market2.confirmTakeDown ?? 'Confirm Removal & Notify Seller'}
                  </Text>
                </>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
  } as ViewStyle,

  container: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  } as ViewStyle,

  modalTitle: {
    fontSize: 17,
  } as any,

  modalSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  } as any,

  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  } as ViewStyle,

  contentScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  } as ViewStyle,

  sectionHeading: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  } as any,

  barsContainer: {
    gap: 8,
    paddingBottom: 16,
  } as ViewStyle,

  // Universal 58dp Bar Standard (Strict 58dp height & centered layout)
  bar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  } as ViewStyle,

  iconSlot32: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,

  barTitleTxt: {
    flex: 1,
    fontSize: 14,
  } as any,

  radioOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  } as ViewStyle,

  inputTxt: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  } as any,

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  } as ViewStyle,

  confirmBtn58: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  } as ViewStyle,

  confirmBtnTxt: {
    fontSize: 14.5,
  } as any,
});
