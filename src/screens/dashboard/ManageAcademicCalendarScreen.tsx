import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Share,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { CampusPdfViewerModal } from '../../components/pdf/CampusPdfViewerModal';
import { FontFamily, Radius } from '../../theme';
import { formatRelativeTime } from '../../utils/format';
import {
  fetchAcademicCalendars,
  uploadAcademicCalendar,
  deleteAcademicCalendar,
  triggerCalendarSync,
  getLastCalendarSyncTime,
  type CalendarFileType,
} from '../../services/academicCalendarService';
import type { AcademicCalendarDoc } from '../../constants/academicCalendar';

interface SelectedFile {
  uri: string;
  name: string;
  size?: number;
  type: CalendarFileType;
}

// 72dp Published Calendar Bar
const CalendarBar72 = memo(function CalendarBar72({
  item,
  onOpen,
  onDelete,
  C,
}: {
  item: AcademicCalendarDoc;
  onOpen: (item: AcademicCalendarDoc) => void;
  onDelete: (item: AcademicCalendarDoc) => void;
  C: any;
}) {
  const isImage = item.file_type === 'image';
  const iconName = isImage ? 'image' : 'file-text';
  const fileBadge = isImage ? 'PHOTO' : 'PDF';

  return (
    <TouchableOpacity
      style={[
        styles.bar72,
        {
          backgroundColor: C.surface,
          borderColor: C.border,
        },
      ]}
      onPress={() => onOpen(item)}
      activeOpacity={0.75}
    >
      {/* 32dp Monochrome Leading Icon */}
      <View style={styles.iconSlot32}>
        <Feather name={iconName} size={32} color={C.text} />
      </View>

      {/* Middle Title & Term Metadata */}
      <View style={styles.barTextCol}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {item.is_active && (
            <View style={[styles.activeBadge, { backgroundColor: C.brand + '20', borderColor: C.brand + '50' }]}>
              <Text style={[styles.activeBadgeTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                ACTIVE
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}
          numberOfLines={1}
        >
          {item.semester || 'Official BUBT Term'} · {fileBadge}
        </Text>
      </View>

      {/* Action Controls */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          onPress={() => onOpen(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          accessibilityLabel="Preview document"
        >
          <Feather name="eye" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          onPress={() => onDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          accessibilityLabel="Delete document"
        >
          <Feather name="trash-2" size={18} color={C.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

export function ManageAcademicCalendarScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [calendars, setCalendars] = useState<AcademicCalendarDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Form states
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [calendarTitle, setCalendarTitle] = useState('');
  const [filePickerModalVisible, setFilePickerModalVisible] = useState(false);

  // Viewer state
  const [viewingDoc, setViewingDoc] = useState<AcademicCalendarDoc | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [docs, syncTime] = await Promise.all([
        fetchAcademicCalendars(),
        getLastCalendarSyncTime(),
      ]);
      setCalendars(docs);
      if (syncTime) {
        setLastSyncTime(formatRelativeTime(syncTime));
      }
    } catch {
      toast({ type: 'error', title: 'Error', message: 'Failed to load published calendars' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Crawler Sync Trigger
  const handleSyncCrawler = async () => {
    if (syncing) return;
    setSyncing(true);
    toast({
      type: 'info',
      title: 'Crawler Syncing',
      message: 'Checking BUBT website for latest academic calendar circulars...',
    });

    try {
      const res = await triggerCalendarSync(true);
      if (res.success) {
        toast({
          type: 'success',
          title: 'Sync Complete',
          message: res.message || 'Academic calendars synchronized successfully.',
        });
        await loadData();
      } else {
        toast({ type: 'error', title: 'Sync Failed', message: res.error || 'Could not reach BUBT website' });
      }
    } finally {
      setSyncing(false);
    }
  };

  // Pick PDF via document picker
  const handlePickPdf = async () => {
    setFilePickerModalVisible(false);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name || 'BUBT_Academic_Calendar.pdf',
          size: asset.size,
          type: 'pdf',
        });

        // Auto pre-fill title if empty
        if (!calendarTitle.trim()) {
          const autoName = (asset.name || '')
            .replace(/\.pdf$/i, '')
            .replace(/[-_]/g, ' ')
            .trim();
          setCalendarTitle(autoName || 'Academic Calendar');
        }
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Document Error', message: err.message || 'Could not select document' });
    }
  };

  // Pick Photo via image library
  const handlePickPhoto = async () => {
    setFilePickerModalVisible(false);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const fileName = asset.fileName || `BUBT_Calendar_${Date.now()}.jpg`;
        setSelectedFile({
          uri: asset.uri,
          name: fileName,
          size: asset.fileSize,
          type: 'image',
        });

        if (!calendarTitle.trim()) {
          setCalendarTitle('Academic Calendar Notice');
        }
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Image Error', message: err.message || 'Could not select image' });
    }
  };

  // Submit / Publish calendar
  const handlePublish = async () => {
    if (!selectedFile) {
      Alert.alert('File Required', 'Please tap the upload bar to select a PDF or Photo first.');
      return;
    }
    const cleanTitle = calendarTitle.trim();
    if (!cleanTitle) {
      Alert.alert('Title Required', 'Please enter a name for this academic calendar.');
      return;
    }

    setUploading(true);
    try {
      const res = await uploadAcademicCalendar({
        title: cleanTitle,
        fileUri: selectedFile.uri,
        fileType: selectedFile.type,
        fileName: selectedFile.name,
        userId: profile?.id,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Upload failed');
      }

      toast({ type: 'success', title: 'Success', message: 'Academic calendar published successfully' });
      setSelectedFile(null);
      setCalendarTitle('');
      loadData();
    } catch (err: any) {
      Alert.alert('Publish Error', err.message || 'Failed to publish academic calendar.');
    } finally {
      setUploading(false);
    }
  };

  // Open Document
  const handleOpenDoc = (doc: AcademicCalendarDoc) => {
    if (doc.file_type === 'image') {
      setViewingDoc(doc);
      setPhotoViewerVisible(true);
    } else {
      setViewingDoc(doc);
    }
  };

  // Delete Calendar
  const handleDeleteDoc = (doc: AcademicCalendarDoc) => {
    Alert.alert(
      'Delete Academic Calendar',
      `Are you sure you want to remove "${doc.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteAcademicCalendar(doc.id, doc.file_url);
            if (!res.success) {
              Alert.alert('Delete Failed', res.error || 'Could not delete calendar.');
              return;
            }
            toast({ type: 'success', title: 'Deleted', message: 'Calendar deleted' });
            loadData();
          },
        },
      ]
    );
  };

  const handleShareDoc = async (doc: AcademicCalendarDoc) => {
    try {
      await Share.share({
        title: doc.title,
        message: `${doc.title} (${doc.semester}): ${doc.file_url}`,
        url: doc.file_url,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top', 'left', 'right']}>
      {/* SubBar with Back Navigation */}
      <SubBar
        title="Manage Academic Calendar"
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={calendars}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.brand}
              colors={[C.brand]}
            />
          }
          ListHeaderComponent={
            <View style={styles.formContainer}>
              <Text
                style={[
                  styles.sectionHeader,
                  { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold },
                ]}
              >
                ADD NEW ACADEMIC CALENDAR
              </Text>

              {/* Bar 1: File Selection Bar (Upload PDF or Photo) - 72dp Height */}
              <TouchableOpacity
                style={[
                  styles.fileUploadBar72,
                  {
                    backgroundColor: C.surface,
                    borderColor: selectedFile ? C.brand : C.border,
                    borderWidth: selectedFile ? 1.5 : 1,
                  },
                ]}
                onPress={() => setFilePickerModalVisible(true)}
                activeOpacity={0.75}
              >
                <View style={styles.iconSlot32}>
                  <Feather
                    name={selectedFile ? (selectedFile.type === 'image' ? 'image' : 'file-text') : 'upload-cloud'}
                    size={32}
                    color={selectedFile ? C.brand : C.text}
                  />
                </View>

                <View style={styles.uploadInfoCol}>
                  <Text
                    style={[
                      styles.uploadTitle,
                      {
                        color: C.text,
                        fontFamily: FontFamily.jakartaBold,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedFile ? selectedFile.name : 'Tap to select PDF or Photo'}
                  </Text>
                  <Text
                    style={[
                      styles.uploadSub,
                      { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedFile
                      ? `${selectedFile.type.toUpperCase()} · Ready to upload`
                      : 'Choose official circular from device files or gallery'}
                  </Text>
                </View>

                {selectedFile ? (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => setSelectedFile(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <Feather name="chevron-right" size={20} color={C.textMuted} />
                )}
              </TouchableOpacity>

              {/* Bar 2: Calendar Name Input Bar - 60dp Height */}
              <View
                style={[
                  styles.inputBar60,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                  },
                ]}
              >
                <View style={styles.inputLeadingIcon}>
                  <Feather name="calendar" size={22} color={C.textMuted} />
                </View>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: C.text,
                      fontFamily: FontFamily.jakartaSemiBold,
                    },
                  ]}
                  value={calendarTitle}
                  onChangeText={setCalendarTitle}
                  placeholder="Calendar Title (e.g. Fall 2026 Academic Calendar)"
                  placeholderTextColor={C.textMuted}
                  editable={!uploading}
                />
              </View>

              {/* Bar 3: Primary Publish Action Button */}
              <TouchableOpacity
                style={[
                  styles.publishBtn52,
                  {
                    backgroundColor: C.brand,
                    opacity: uploading ? 0.7 : 1,
                  },
                ]}
                onPress={handlePublish}
                disabled={uploading}
                activeOpacity={0.8}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View style={styles.publishBtnRow}>
                    <Feather name="upload" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text
                      style={[
                        styles.publishBtnTxt,
                        { color: '#ffffff', fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      Publish Academic Calendar
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Crawler Sync Card (Matches Study Hub & Notice Board Design) */}
              <View style={[styles.syncCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.syncCardTop}>
                  <View style={styles.syncIconWrap}>
                    <Feather name="refresh-cw" size={28} color={C.text} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                    <Text style={[styles.syncTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      BUBT Calendar Sync
                    </Text>
                    <Text style={[styles.syncSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                      {lastSyncTime
                        ? `Last sync: ${lastSyncTime}`
                        : 'Sync latest official academic calendars from BUBT'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.syncActionBtn, { backgroundColor: C.brand }]}
                  onPress={handleSyncCrawler}
                  disabled={syncing}
                  activeOpacity={0.85}
                >
                  {syncing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name="globe" size={18} color="#fff" />
                      <Text style={[styles.syncActionTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                        Sync from BUBT Website
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Section Divider & Header for List */}
              <View style={styles.listSectionHeaderRow}>
                <Text
                  style={[
                    styles.sectionHeader,
                    { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold },
                  ]}
                >
                  PUBLISHED CALENDARS ({calendars.length})
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <CalendarBar72
              item={item}
              onOpen={handleOpenDoc}
              onDelete={handleDeleteDoc}
              C={C}
            />
          )}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={C.brand} />
              </View>
            ) : (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: C.surface, borderColor: C.border },
                ]}
              >
                <Feather name="calendar" size={36} color={C.textMuted} />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: C.text, fontFamily: FontFamily.jakartaBold },
                  ]}
                >
                  No Academic Calendars
                </Text>
                <Text
                  style={[
                    styles.emptySub,
                    { color: C.textMuted, fontFamily: FontFamily.jakartaMedium },
                  ]}
                >
                  Upload the official BUBT semester circular PDF or photo above.
                </Text>
              </View>
            )
          }
        />
      </KeyboardAvoidingView>

      {/* File Type Selection Sheet Modal */}
      <Modal
        visible={filePickerModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setFilePickerModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setFilePickerModalVisible(false)}
        >
          <View style={[styles.pickerSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text
              style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
            >
              Select Calendar Source
            </Text>

            <TouchableOpacity
              style={[styles.sheetOptionBar72, { borderColor: C.border }]}
              onPress={handlePickPdf}
              activeOpacity={0.75}
            >
              <View style={styles.iconSlot32}>
                <Feather name="file-text" size={32} color={C.text} />
              </View>
              <View style={styles.barTextCol}>
                <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Upload PDF Document
                </Text>
                <Text style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Official multi-page circular document
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={C.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetOptionBar72, { borderColor: C.border }]}
              onPress={handlePickPhoto}
              activeOpacity={0.75}
            >
              <View style={styles.iconSlot32}>
                <Feather name="image" size={32} color={C.text} />
              </View>
              <View style={styles.barTextCol}>
                <Text style={[styles.barTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Upload Photo from Gallery
                </Text>
                <Text style={[styles.barSubtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Notice photo, flyer, or scanned graphic
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={C.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: C.surface2 }]}
              onPress={() => setFilePickerModalVisible(false)}
            >
              <Text style={[styles.cancelBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* PDF Document Viewer Modal */}
      {viewingDoc && viewingDoc.file_type === 'pdf' && (
        <CampusPdfViewerModal
          visible={Boolean(viewingDoc)}
          onClose={() => setViewingDoc(null)}
          title={viewingDoc.title}
          subtitle={viewingDoc.semester || 'Official BUBT Academic Calendar'}
          fileUrl={viewingDoc.file_url}
        />
      )}

      {/* Fullscreen Photo Viewer Modal */}
      {viewingDoc && viewingDoc.file_type === 'image' && (
        <Modal
          visible={photoViewerVisible}
          animationType="fade"
          transparent
          onRequestClose={() => {
            setPhotoViewerVisible(false);
            setViewingDoc(null);
          }}
        >
          <View style={styles.photoViewerContainer}>
            <View style={[styles.photoHeader, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity
                style={styles.photoCloseBtn}
                onPress={() => {
                  setPhotoViewerVisible(false);
                  setViewingDoc(null);
                }}
              >
                <Feather name="x" size={24} color="#ffffff" />
              </TouchableOpacity>
              <Text
                style={[styles.photoTitle, { fontFamily: FontFamily.jakartaBold }]}
                numberOfLines={1}
              >
                {viewingDoc.title}
              </Text>
              <TouchableOpacity
                style={styles.photoShareBtn}
                onPress={() => handleShareDoc(viewingDoc)}
              >
                <Feather name="share-2" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.photoBody}>
              <Image
                source={{ uri: viewingDoc.file_url }}
                style={styles.photoImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  } as ViewStyle,
  formContainer: {
    marginBottom: 8,
  } as ViewStyle,
  sectionHeader: {
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  } as TextStyle,

  // Bar 1: File Upload Bar (72dp Height)
  fileUploadBar72: {
    height: 72,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  } as ViewStyle,
  iconSlot32: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as ViewStyle,
  uploadInfoCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  } as ViewStyle,
  uploadTitle: {
    fontSize: 14.5,
    lineHeight: 20,
  } as TextStyle,
  uploadSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  } as TextStyle,
  clearBtn: {
    padding: 6,
  } as ViewStyle,

  // Bar 2: Name Input Bar (60dp Height)
  inputBar60: {
    height: 60,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
  } as ViewStyle,
  inputLeadingIcon: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  } as ViewStyle,
  textInput: {
    flex: 1,
    fontSize: 14.5,
    padding: 0,
  } as TextStyle,

  // Bar 3: Primary Publish Button (52dp Height)
  publishBtn52: {
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  } as ViewStyle,
  publishBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  publishBtnTxt: {
    fontSize: 14.5,
  } as TextStyle,

  // BUBT Crawler Sync Card (Matches ManageAnnouncementsScreen)
  syncCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  } as ViewStyle,
  syncCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  } as ViewStyle,
  syncIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  syncTitle: {
    fontSize: 14.5,
  } as TextStyle,
  syncSub: {
    fontSize: 12,
    marginTop: 2,
  } as TextStyle,
  syncActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 48,
    borderRadius: Radius.md,
  } as ViewStyle,
  syncActionTxt: {
    fontSize: 14,
  } as TextStyle,

  listSectionHeaderRow: {
    marginTop: 6,
    marginBottom: 4,
  } as ViewStyle,

  // 72dp Bar Component (Standardized 72dp Height)
  bar72: {
    height: 72,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  } as ViewStyle,
  barTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingRight: 8,
  } as ViewStyle,
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  barTitle: {
    flexShrink: 1,
    fontSize: 14.5,
    lineHeight: 20,
  } as TextStyle,
  barSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  } as TextStyle,
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  } as ViewStyle,
  activeBadgeTxt: {
    fontSize: 9.5,
    letterSpacing: 0.4,
  } as TextStyle,
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  } as ViewStyle,
  emptyCard: {
    padding: 32,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 15,
    marginTop: 4,
  } as TextStyle,
  emptySub: {
    fontSize: 12.5,
    textAlign: 'center',
  } as TextStyle,

  // Modal Sheet Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  } as ViewStyle,
  sheetTitle: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  sheetOptionBar72: {
    height: 72,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  } as ViewStyle,
  cancelBtn: {
    height: 50,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  } as ViewStyle,
  cancelBtnTxt: {
    fontSize: 14.5,
  } as TextStyle,

  // Photo Viewer Fullscreen
  photoViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  } as ViewStyle,
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  } as ViewStyle,
  photoCloseBtn: {
    padding: 8,
  } as ViewStyle,
  photoShareBtn: {
    padding: 8,
  } as ViewStyle,
  photoTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    textAlign: 'center',
    marginHorizontal: 8,
  } as TextStyle,
  photoBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  photoImage: {
    width: '100%',
    height: '100%',
  } as any,
});
