import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { CampusPdfViewerModal } from '../../components/pdf/CampusPdfViewerModal';
import {
  prepareViewerEnvironment,
  prepareDocumentForViewer,
  shareDownloadedPdf,
} from '../../services/pdf/pdfViewerService';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../utils/storage';
import { isImageFile } from '../../utils/imageCompress';
import { MAX_FILE_SIZE_MB } from '../../constants/app';
import { FontFamily, FontSize, Layout, Radius, SectorColors } from '../../theme';

const DEPARTMENTS = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'EEE', name: 'Electrical & Electronic Engineering' },
  { code: 'BBA', name: 'Business Administration' },
  { code: 'English', name: 'English' },
  { code: 'Law', name: 'Law & Justice' },
  { code: 'Civil', name: 'Civil Engineering' },
  { code: 'Textile', name: 'Textile Engineering' },
  { code: 'Economics', name: 'Economics' },
];

const SEMESTERS = ['Fall 2026', 'Summer 2026', 'Spring 2026'];

export function isValidDocUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  return /^https?:\/\/.+/i.test(clean);
}

export function normalizeDeptCode(dept: string): string {
  const d = (dept || '').toLowerCase();
  if (d.includes('computer') || d.includes('cse')) return 'CSE';
  if (d.includes('electrical') || d.includes('eee')) return 'EEE';
  if (d.includes('business') || d.includes('bba')) return 'BBA';
  if (d.includes('law')) return 'Law';
  if (d.includes('english')) return 'English';
  if (d.includes('civil')) return 'Civil';
  if (d.includes('textile')) return 'Textile';
  if (d.includes('economics')) return 'Economics';
  return dept.trim() || 'CSE';
}

interface OfficialRoutine {
  id: string;
  type: 'class' | 'exam';
  title: string;
  department: string | null;
  semester: string | null;
  intake: string | null;
  section: string | null;
  file_url: string | null;
  image_url: string | null;
  created_at: string;
}

export function RoutinesBrowseScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const canPost = profile?.role === 'admin' || profile?.role === 'staff';

  // 1. Core Selection State
  const [department, setDepartment] = useState(() => normalizeDeptCode(profile?.department || 'CSE'));
  const [intake, setIntake] = useState(() => profile?.intake?.trim() || '51');
  const [section, setSection] = useState(() => profile?.section?.trim() || '1');
  const [routineType, setRoutineType] = useState<'class' | 'exam'>('class');
  const [semester, setSemester] = useState('Fall 2026');

  // 2. Data State
  const [routinesList, setRoutinesList] = useState<OfficialRoutine[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // 3. Sheet Viewer State
  const webRef = useRef<WebView>(null);
  const webViewReadyRef = useRef(false);
  const docPayloadRef = useRef<{ base64?: string; fileUri?: string } | null>(null);

  const [htmlUri, setHtmlUri] = useState<string | null>(null);
  const [localFileUri, setLocalFileUri] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerMessage, setViewerMessage] = useState('Locating section routine…');
  const [matchedPage, setMatchedPage] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [sharing, setSharing] = useState(false);

  // 4. Modals
  const [deptPickerVisible, setDeptPickerVisible] = useState(false);
  const [intakeSecPickerVisible, setIntakeSecPickerVisible] = useState(false);
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [fullscreenModalVisible, setFullscreenModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [allCircularsModalVisible, setAllCircularsModalVisible] = useState(false);
  const [selectedCircularDoc, setSelectedCircularDoc] = useState<OfficialRoutine | null>(null);

  // Temp draft state for Intake & Section Popup
  const [draftIntake, setDraftIntake] = useState(intake);
  const [draftSection, setDraftSection] = useState(section);

  // Upload Form State
  const [fTitle, setFTitle] = useState('');
  const [fDept, setFDept] = useState('');
  const [fSemester, setFSemester] = useState('');
  const [fIntake, setFIntake] = useState('');
  const [fSection, setFSection] = useState('');
  const [fType, setFType] = useState<'class' | 'exam'>('class');
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [postingPdf, setPostingPdf] = useState(false);

  // Reset custom circular override when user changes primary filters
  const handleDepartmentChange = useCallback((dept: string) => {
    setDepartment(dept);
    setSelectedCircularDoc(null);
    setViewerError(null);
  }, []);

  const handleSemesterChange = useCallback((sem: string) => {
    setSemester(sem);
    setSelectedCircularDoc(null);
    setViewerError(null);
  }, []);

  const handleTypeChange = useCallback((type: 'class' | 'exam') => {
    setRoutineType(type);
    setSelectedCircularDoc(null);
    setViewerError(null);
  }, []);

  // Load all routines from Supabase
  const loadRoutines = useCallback(async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoutinesList((data as OfficialRoutine[]) || []);
    } catch (err: any) {
      console.warn('loadRoutines error:', err?.message);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [loadRoutines])
  );

  // Filter only routines with valid HTTP/HTTPS URLs
  const validRoutines = useMemo(() => {
    return routinesList.filter(
      (r) => isValidDocUrl(r.file_url) || isValidDocUrl(r.image_url)
    );
  }, [routinesList]);

  // Find the best matching routine document for current selections
  const activeDocument = useMemo(() => {
    if (selectedCircularDoc) {
      return selectedCircularDoc;
    }
    if (validRoutines.length === 0) return null;

    const typeRoutines = validRoutines.filter((r) => r.type === routineType);

    // 1. Strict match: exact section routine (Type + Department + Semester + Intake + Section)
    const exactSection = typeRoutines.find((r) => {
      const matchDept = r.department ? normalizeDeptCode(r.department) === department : false;
      const matchSem = r.semester ? r.semester.toLowerCase().includes(semester.toLowerCase()) : false;
      return matchDept && matchSem && r.intake === intake && r.section === section;
    });
    if (exactSection) return exactSection;

    // 2. Departmental master PDF for this exact semester
    const deptSemester = typeRoutines.find((r) => {
      const matchDept = r.department ? normalizeDeptCode(r.department) === department : false;
      const matchSem = r.semester ? r.semester.toLowerCase().includes(semester.toLowerCase()) : false;
      return matchDept && matchSem;
    });
    if (deptSemester) return deptSemester;

    // 3. University-Wide master PDF for this exact semester (applies to all departments)
    const univSemester = typeRoutines.find((r) => {
      const isUnivWide = !r.department || r.department.toLowerCase().includes('university');
      const matchSem = r.semester ? r.semester.toLowerCase().includes(semester.toLowerCase()) : false;
      return isUnivWide && matchSem;
    });
    if (univSemester) return univSemester;

    // Strict constraint: Never silently fall back across departments or semesters!
    return null;
  }, [selectedCircularDoc, validRoutines, routineType, department, semester, intake, section]);

  // Find latest available routine for this department or university-wide (for quick switch prompt)
  const latestAvailableRoutine = useMemo(() => {
    if (validRoutines.length === 0) return null;
    const typeRoutines = validRoutines.filter((r) => r.type === routineType);
    return (
      typeRoutines.find((r) => {
        const matchDept = !r.department || normalizeDeptCode(r.department) === department;
        return matchDept;
      }) || null
    );
  }, [validRoutines, routineType, department]);

  const activeDocUrl = activeDocument?.file_url || activeDocument?.image_url || null;
  const isImageDoc = activeDocUrl ? isImageFile(activeDocUrl) : false;

  const searchQuery = useMemo(() => {
    return `Intake ${intake} Section ${section}`;
  }, [intake, section]);

  // Synchronize document loading to the embedded WebView
  const sendDocumentToWebView = useCallback(() => {
    if (!docPayloadRef.current) return;
    const payload = docPayloadRef.current;
    if (payload.base64) {
      webRef.current?.injectJavaScript(
        `if (typeof window.loadPdfData === 'function') { window.loadPdfData(${JSON.stringify(payload.base64)}); } true;`
      );
    } else if (payload.fileUri) {
      webRef.current?.injectJavaScript(
        `if (typeof window.loadPdfDoc === 'function') { window.loadPdfDoc(${JSON.stringify(payload.fileUri)}); } true;`
      );
    }
  }, []);

  // Initialize and load the PDF document on-device
  const initSheetViewer = useCallback(async () => {
    setViewerError(null);
    if (!activeDocUrl || isImageDoc) {
      setViewerLoading(false);
      return;
    }

    try {
      setViewerLoading(true);
      setViewerMessage(`Locating ${department} Intake ${intake}-${section}…`);
      setMatchedPage(null);

      // 1. Prepare engine HTML
      const env = await prepareViewerEnvironment(isDark);
      setHtmlUri(env.htmlUri);

      // 2. Download and prepare document file
      const doc = await prepareDocumentForViewer(activeDocUrl, `${department}_${routineType}_${semester}`);
      setLocalFileUri(doc.localFileUri);

      docPayloadRef.current = {
        base64: doc.base64Data,
        fileUri: doc.engineFileUri,
      };

      if (webViewReadyRef.current) {
        sendDocumentToWebView();
      }
    } catch (err: any) {
      console.warn('initSheetViewer error:', err?.message);
      setViewerError(err?.message || 'Could not load PDF document.');
      setViewerLoading(false);
    }
  }, [activeDocUrl, isImageDoc, department, routineType, semester, intake, section, isDark, sendDocumentToWebView]);

  useEffect(() => {
    docPayloadRef.current = null;
    initSheetViewer();
  }, [initSheetViewer]);

  // Handle messages from the embedded WebView
  const handleWebViewMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'viewerReady') {
          webViewReadyRef.current = true;
          sendDocumentToWebView();
        } else if (data.type === 'docOpened') {
          setTotalPages(data.totalPages || 1);
          setViewerLoading(false);
          // Auto-trigger Section Search across pages
          webRef.current?.injectJavaScript(
            `if (typeof window.findSectionPage === 'function') { window.findSectionPage(${JSON.stringify(searchQuery)}); } true;`
          );
        } else if (data.type === 'pageMatched') {
          if (data.page > 0) {
            setMatchedPage(data.page);
            toast({
              type: 'success',
              title: 'Section Located',
              message: `Page ${data.page} of ${data.totalPages || totalPages} · Intake ${intake}-${section}`,
            });
          } else {
            setMatchedPage(1);
          }
        } else if (data.type === 'pageChange') {
          if (data.page) setMatchedPage(data.page);
        } else if (data.type === 'error') {
          console.warn('WebView viewer error:', data.message);
          setViewerLoading(false);
          setViewerError(data.message || 'Error rendering PDF document');
        }
      } catch (err: any) {
        console.warn('handleWebViewMessage parse error:', err);
      }
    },
    [sendDocumentToWebView, searchQuery, totalPages, intake, section, toast]
  );

  // Share handler
  const handleShare = useCallback(async () => {
    if (sharing || !activeDocUrl) return;
    try {
      setSharing(true);
      if (localFileUri) {
        await shareDownloadedPdf(localFileUri, `${department}_Intake_${intake}_Sec_${section}`);
      } else {
        await shareDownloadedPdf(activeDocUrl, `${department}_Intake_${intake}_Sec_${section}`);
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Could not share routine', message: err.message });
    } finally {
      setSharing(false);
    }
  }, [sharing, activeDocUrl, localFileUri, department, intake, section, toast]);

  // Intake & Section Popup handlers
  function openIntakeSecPopup() {
    setDraftIntake(intake);
    setDraftSection(section);
    setIntakeSecPickerVisible(true);
  }

  function applyIntakeSec() {
    setIntake(draftIntake.trim() || '51');
    setSection(draftSection.trim() || '1');
    setSelectedCircularDoc(null);
    setIntakeSecPickerVisible(false);
  }

  // Upload PDF Handler (Admin/Staff)
  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const isImg = isImageFile(asset.name ?? '', asset.mimeType);
    const size = asset.size ?? 0;
    if (!isImg && size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ type: 'error', title: 'File too large', message: `Exceeds ${MAX_FILE_SIZE_MB}MB limit.` });
      return;
    }
    setPickedFile({ uri: asset.uri, name: asset.name ?? 'file', mimeType: asset.mimeType ?? 'application/octet-stream' });
  }

  async function handlePostPdf() {
    if (!fTitle.trim() || !user) return;
    setPostingPdf(true);
    try {
      let fileUrl: string | null = null;
      let imageUrl: string | null = null;

      if (pickedFile) {
        const isImg = isImageFile(pickedFile.name, pickedFile.mimeType);
        const ext = isImg ? 'jpg' : (pickedFile.name.split('.').pop() ?? 'bin');
        const safeName = fTitle.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        const storagePath = `routines/${user.id}/${Date.now()}_${safeName}.${ext}`;
        const up = await uploadFile(
          'photos',
          pickedFile.uri,
          storagePath,
          isImg ? 'image/jpeg' : pickedFile.mimeType,
          true,
          isImg ? { preset: 'document' } : undefined
        );
        if (!up.success) throw new Error(up.error);
        if (isImg) imageUrl = up.url;
        else fileUrl = up.url;
      }

      const { error } = await supabase.from('routines').insert({
        type: fType,
        title: fTitle.trim(),
        department: fDept.trim() || null,
        semester: fSemester.trim() || null,
        intake: fIntake.trim() || null,
        section: fSection.trim() || null,
        file_url: fileUrl,
        image_url: imageUrl,
        published_by: user.id,
      });

      if (error) throw error;
      setUploadModalVisible(false);
      loadRoutines();
      toast({ type: 'success', title: 'Routine Uploaded', message: 'Official circular posted successfully.' });
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Could not post routine.');
    } finally {
      setPostingPdf(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 1. Header SubBar */}
      <SubBar
        title="Class & Exam Routines"
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => {
                loadRoutines();
                toast({ type: 'info', title: 'Refreshing', message: 'Checking campus servers for new routines…' });
              }}
              hitSlop={8}
              disabled={loadingData}
            >
              <Feather name="rotate-cw" size={18} color={loadingData ? C.textMuted : C.text} />
            </TouchableOpacity>
            {canPost && (
              <TouchableOpacity onPress={() => setUploadModalVisible(true)} hitSlop={8}>
                <Icon name="plus" size={22} color={C.brand} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* 2. Top Control Row: 3 Primary Buttons */}
      <View style={[styles.controlRow, { paddingHorizontal: Layout.screenPadding }]}>
        {/* Button 1: Department */}
        <TouchableOpacity
          style={[styles.topSelectorBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => setDeptPickerVisible(true)}
          activeOpacity={0.75}
        >
          <View style={[styles.btnIconBox, { backgroundColor: C.brand + '18' }]}>
            <Feather name="book-open" size={14} color={C.brand} />
          </View>
          <Text style={[styles.topSelectorBtnText, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {department}
          </Text>
          <Feather name="chevron-down" size={13} color={C.textMuted} />
        </TouchableOpacity>

        {/* Button 2: Intake & Section */}
        <TouchableOpacity
          style={[styles.topSelectorBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={openIntakeSecPopup}
          activeOpacity={0.75}
        >
          <View style={[styles.btnIconBox, { backgroundColor: SectorColors.routines + '18' }]}>
            <Feather name="users" size={14} color={SectorColors.routines} />
          </View>
          <Text style={[styles.topSelectorBtnText, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {`Intake ${intake} · Sec ${section}`}
          </Text>
          <Feather name="chevron-down" size={13} color={C.textMuted} />
        </TouchableOpacity>

        {/* Button 3: Routine Type */}
        <TouchableOpacity
          style={[styles.topSelectorBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => setTypePickerVisible(true)}
          activeOpacity={0.75}
        >
          <View style={[styles.btnIconBox, { backgroundColor: (routineType === 'class' ? SectorColors.routines : '#ec4899') + '18' }]}>
            <Feather
              name={routineType === 'class' ? 'calendar' : 'file-text'}
              size={14}
              color={routineType === 'class' ? SectorColors.routines : '#ec4899'}
            />
          </View>
          <Text style={[styles.topSelectorBtnText, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {routineType === 'class' ? 'Class' : 'Exam'}
          </Text>
          <Feather name="chevron-down" size={13} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* 3. Semester Selector Bar */}
      <View style={styles.semesterBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.semesterBarScroll}>
          {SEMESTERS.map((sem) => {
            const isSelected = semester === sem;
            return (
              <TouchableOpacity
                key={sem}
                style={[
                  styles.semesterChip,
                  {
                    backgroundColor: isSelected ? C.brand : C.surface,
                    borderColor: isSelected ? C.brand : C.border,
                  },
                ]}
                onPress={() => handleSemesterChange(sem)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.semesterChipText,
                    {
                      color: isSelected ? '#ffffff' : C.text,
                      fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                >
                  {sem}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Sheet Info Strip */}
      <View style={[styles.sheetStatusStrip, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={styles.sheetStatusLeft}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: matchedPage ? C.success : (activeDocUrl ? C.brand : C.textMuted) },
            ]}
          />
          <Text style={[styles.sheetStatusTitle, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]} numberOfLines={1}>
            {activeDocument
              ? (matchedPage
                  ? `Page ${matchedPage} of ${totalPages} · Intake ${intake}-${section}`
                  : (activeDocument.title || `${department} Routine`))
              : `No ${routineType === 'class' ? 'Class' : 'Exam'} Sheet Published`}
          </Text>
        </View>

        <View style={styles.sheetStatusRight}>
          <TouchableOpacity
            style={[styles.stripActionBtn, { backgroundColor: C.surface2 }]}
            onPress={() => setAllCircularsModalVisible(true)}
            hitSlop={8}
          >
            <Feather name="list" size={14} color={C.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stripActionBtn, { backgroundColor: C.surface2, opacity: activeDocUrl ? 1 : 0.4 }]}
            onPress={handleShare}
            hitSlop={8}
            disabled={sharing || !activeDocUrl}
          >
            <Feather name="share-2" size={14} color={C.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stripActionBtn, { backgroundColor: C.surface2, opacity: activeDocUrl ? 1 : 0.4 }]}
            onPress={() => setFullscreenModalVisible(true)}
            hitSlop={8}
            disabled={!activeDocUrl}
          >
            <Feather name="maximize-2" size={14} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 5. The Real Routine Sheet Canvas (Option A) */}
      <View style={styles.canvasContainer}>
        {!activeDocUrl ? (
          <View style={styles.emptyCanvas}>
            <View style={[styles.emptyIconCircle, { backgroundColor: SectorColors.routines + '18' }]}>
              <Feather name={routineType === 'class' ? 'calendar' : 'file-text'} size={38} color={SectorColors.routines} />
            </View>
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              No Routine Sheet Published
            </Text>
            <Text style={[styles.emptySub, { color: C.textMuted }]}>
              {`BUBT has not published an official ${routineType === 'class' ? 'Class' : 'Exam'} routine for ${department} in ${semester} on the notice board yet.`}
            </Text>

            {latestAvailableRoutine && latestAvailableRoutine.semester && latestAvailableRoutine.semester !== semester && (
              <TouchableOpacity
                style={[styles.switchSemBtn, { backgroundColor: C.brand + '15', borderColor: C.brand }]}
                onPress={() => {
                  setSelectedCircularDoc(null);
                  if (latestAvailableRoutine.semester) {
                    setSemester(latestAvailableRoutine.semester);
                  }
                }}
                activeOpacity={0.8}
              >
                <Feather name="arrow-right-circle" size={16} color={C.brand} />
                <Text style={[styles.switchSemBtnText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {`View ${latestAvailableRoutine.semester} Routine (Latest)`}
                </Text>
              </TouchableOpacity>
            )}

            {validRoutines.length > 0 && (
              <TouchableOpacity
                style={[styles.browseAllBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setAllCircularsModalVisible(true)}
                activeOpacity={0.8}
              >
                <Feather name="list" size={15} color={C.text} />
                <Text style={[styles.browseAllBtnText, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                  {`Browse All Official Circulars (${validRoutines.length})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : isImageDoc ? (
          <ScrollView
            maximumZoomScale={4.0}
            minimumZoomScale={1.0}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.imageScrollContainer}
          >
            <Image source={{ uri: activeDocUrl }} style={styles.routineImage} resizeMode="contain" />
          </ScrollView>
        ) : (
          <View style={StyleSheet.absoluteFill}>
            {htmlUri && (
              <WebView
                ref={webRef}
                source={{ uri: htmlUri }}
                style={[styles.webView, { backgroundColor: isDark ? '#000000' : '#f1f5f9' }]}
                originWhitelist={['file://*']}
                allowFileAccess={true}
                allowFileAccessFromFileURLs={true}
                allowUniversalAccessFromFileURLs={true}
                setSupportMultipleWindows={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onLoadEnd={() => {
                  webRef.current?.injectJavaScript(`
                    if (window.__viewerShellReady && window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'viewerReady' }));
                    }
                    true;
                  `);
                }}
                onMessage={handleWebViewMessage}
                onError={(e) => {
                  console.warn('WebView error:', e.nativeEvent);
                  setViewerLoading(false);
                  setViewerError('Could not load PDF display engine.');
                }}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              />
            )}

            {/* Error Overlay */}
            {viewerError && (
              <View style={[styles.emptyCanvas, StyleSheet.absoluteFill, { backgroundColor: C.bg }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: (C.danger || '#ef4444') + '18' }]}>
                  <Feather name="alert-triangle" size={36} color={C.danger || '#ef4444'} />
                </View>
                <Text style={[styles.emptyTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Could Not Load Document
                </Text>
                <Text style={[styles.emptySub, { color: C.textMuted }]}>
                  {viewerError}
                </Text>
                <TouchableOpacity
                  style={[styles.switchSemBtn, { backgroundColor: C.brand, borderColor: C.brand, marginTop: 14 }]}
                  onPress={() => initSheetViewer()}
                  activeOpacity={0.8}
                >
                  <Feather name="rotate-cw" size={15} color="#fff" />
                  <Text style={[styles.switchSemBtnText, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    Retry Loading
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Loading Overlay */}
            {(loadingData || viewerLoading) && (
              <View style={[styles.loadingBox, StyleSheet.absoluteFill, { backgroundColor: C.bg }]}>
                <ActivityIndicator size="large" color={C.brand} />
                <Text style={[styles.loadingText, { color: C.textMuted }]}>{viewerMessage}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* MODAL 1: Department Selector Bottom Sheet */}
      <Modal visible={deptPickerVisible} transparent animationType="slide" onRequestClose={() => setDeptPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.bottomSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Select Department
              </Text>
              <TouchableOpacity onPress={() => setDeptPickerVisible(false)} hitSlop={8}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {DEPARTMENTS.map((d) => {
                const isSelected = department === d.code;
                return (
                  <TouchableOpacity
                    key={d.code}
                    style={[
                      styles.deptRowItem,
                      {
                        backgroundColor: isSelected ? C.brand + '15' : 'transparent',
                        borderColor: isSelected ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => {
                      handleDepartmentChange(d.code);
                      setDeptPickerVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.deptCodeText, { color: isSelected ? C.brand : C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {d.code}
                      </Text>
                      <Text style={[styles.deptNameText, { color: C.textMuted }]}>{d.name}</Text>
                    </View>
                    {isSelected && <Feather name="check" size={18} color={C.brand} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Intake & Section Popup Bar */}
      <Modal visible={intakeSecPickerVisible} transparent animationType="slide" onRequestClose={() => setIntakeSecPickerVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={[styles.bottomSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Select Intake & Section
              </Text>
              <TouchableOpacity onPress={() => setIntakeSecPickerVisible(false)} hitSlop={8}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Intake Number Input */}
            <Text style={[styles.fieldLabel, { color: C.text3 }]}>INTAKE NUMBER</Text>
            <TextInput
              style={[styles.textInput58, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              value={draftIntake}
              onChangeText={setDraftIntake}
              keyboardType="numeric"
              placeholder="e.g. 51"
              placeholderTextColor={C.textMuted}
            />

            {/* Quick Section Pills */}
            <Text style={[styles.fieldLabel, { color: C.text3, marginTop: 16 }]}>SECTION</Text>
            <View style={styles.quickSecRow}>
              {['1', '2', '3', '4', '5'].map((sec) => {
                const isSelected = draftSection === sec;
                return (
                  <TouchableOpacity
                    key={sec}
                    style={[
                      styles.quickSecChip,
                      {
                        backgroundColor: isSelected ? C.brand : C.surface2,
                        borderColor: isSelected ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => setDraftSection(sec)}
                  >
                    <Text
                      style={[
                        styles.quickSecChipText,
                        {
                          color: isSelected ? '#ffffff' : C.text,
                          fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                    >
                      Sec {sec}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Apply Button */}
            <TouchableOpacity style={[styles.primaryBtn58, { backgroundColor: C.brand }]} onPress={applyIntakeSec}>
              <Text style={styles.primaryBtnText}>Apply & Find Section Sheet</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 3: Routine Type Picker (Class vs Exam) */}
      <Modal visible={typePickerVisible} transparent animationType="fade" onRequestClose={() => setTypePickerVisible(false)}>
        <View style={styles.modalBackdropCenter}>
          <View style={[styles.dialogCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold, marginBottom: 14 }]}>
              Select Schedule Type
            </Text>

            <TouchableOpacity
              style={[
                styles.typeOptionCard,
                {
                  backgroundColor: routineType === 'class' ? SectorColors.routines + '15' : C.bg,
                  borderColor: routineType === 'class' ? SectorColors.routines : C.border,
                },
              ]}
              onPress={() => {
                handleTypeChange('class');
                setTypePickerVisible(false);
              }}
            >
              <View style={[styles.typeIconBox, { backgroundColor: SectorColors.routines + '20' }]}>
                <Feather name="calendar" size={20} color={SectorColors.routines} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.typeTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Class Routine
                </Text>
                <Text style={[styles.typeDesc, { color: C.textMuted }]}>
                  Official weekly class timetable & room assignments
                </Text>
              </View>
              {routineType === 'class' && <Feather name="check-circle" size={20} color={SectorColors.routines} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOptionCard,
                {
                  backgroundColor: routineType === 'exam' ? '#ec489915' : C.bg,
                  borderColor: routineType === 'exam' ? '#ec4899' : C.border,
                  marginTop: 10,
                },
              ]}
              onPress={() => {
                handleTypeChange('exam');
                setTypePickerVisible(false);
              }}
            >
              <View style={[styles.typeIconBox, { backgroundColor: '#ec489920' }]}>
                <Feather name="file-text" size={20} color="#ec4899" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.typeTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Exam Routine
                </Text>
                <Text style={[styles.typeDesc, { color: C.textMuted }]}>
                  Midterm & Final exam schedules with roll seat plan
                </Text>
              </View>
              {routineType === 'exam' && <Feather name="check-circle" size={20} color="#ec4899" />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Fullscreen In-App Viewer Modal */}
      <CampusPdfViewerModal
        visible={fullscreenModalVisible}
        onClose={() => setFullscreenModalVisible(false)}
        title={activeDocument?.title || `${department} Routine`}
        subtitle={`Intake ${intake} · Section ${section}`}
        category={routineType === 'class' ? 'Class Routine' : 'Exam Routine'}
        fileUrl={activeDocUrl}
        initialSearchQuery={searchQuery}
      />

      {/* MODAL 5: Upload Routine PDF (Admin/Staff) */}
      <Modal visible={uploadModalVisible} transparent animationType="slide" onRequestClose={() => setUploadModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={[styles.bottomSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Post Official Routine
              </Text>
              <TouchableOpacity onPress={() => setUploadModalVisible(false)} hitSlop={8}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={[styles.fieldLabel, { color: C.text3 }]}>TITLE</Text>
              <TextInput
                style={[styles.textInput58, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                value={fTitle}
                onChangeText={setFTitle}
                placeholder="e.g. CSE Fall 2026 Routine"
                placeholderTextColor={C.textMuted}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.fieldLabel, { color: C.text3 }]}>DEPARTMENT</Text>
                  <TextInput
                    style={[styles.textInput58, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    value={fDept}
                    onChangeText={setFDept}
                    placeholder="e.g. CSE"
                    placeholderTextColor={C.textMuted}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.fieldLabel, { color: C.text3 }]}>SEMESTER</Text>
                  <TextInput
                    style={[styles.textInput58, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    value={fSemester}
                    onChangeText={setFSemester}
                    placeholder="e.g. Fall 2026"
                    placeholderTextColor={C.textMuted}
                  />
                </View>
              </View>

              <TouchableOpacity style={[styles.pickFileBtn58, { borderColor: C.border }]} onPress={pickFile}>
                <Feather name="upload" size={18} color={C.brand} />
                <Text style={[styles.pickFileText, { color: C.text }]}>
                  {pickedFile ? pickedFile.name : 'Choose PDF File'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn58, { backgroundColor: C.brand, marginTop: 16 }]}
                onPress={handlePostPdf}
                disabled={postingPdf}
              >
                {postingPdf ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Post Routine Document</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 6: All Official Circulars List */}
      <Modal
        visible={allCircularsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAllCircularsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.bottomSheet, { backgroundColor: C.surface, borderColor: C.border, maxHeight: '82%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Official BUBT Circulars
                </Text>
                <Text style={[styles.deptNameText, { color: C.textMuted }]}>
                  {`${validRoutines.length} active schedule documents from BUBT server`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAllCircularsModalVisible(false)} hitSlop={8}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {validRoutines.map((item) => {
                const isItemActive = activeDocument?.id === item.id;
                const isExamItem = item.type === 'exam';
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.circularCard,
                      {
                        backgroundColor: isItemActive ? C.brand + '15' : C.bg,
                        borderColor: isItemActive ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedCircularDoc(item);
                      if (item.department) setDepartment(normalizeDeptCode(item.department));
                      if (item.semester) setSemester(item.semester);
                      setRoutineType(item.type);
                      setAllCircularsModalVisible(false);
                      toast({
                        type: 'info',
                        title: 'Document Selected',
                        message: `Opened "${item.title}"`,
                      });
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.circularIconBox, { backgroundColor: (isExamItem ? '#ec4899' : SectorColors.routines) + '18' }]}>
                      <Feather
                        name={isExamItem ? 'file-text' : 'calendar'}
                        size={18}
                        color={isExamItem ? '#ec4899' : SectorColors.routines}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={[styles.circularTitleText, { color: isItemActive ? C.brand : C.text, fontFamily: FontFamily.jakartaBold }]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      <View style={styles.circularMetaRow}>
                        <View style={[styles.miniBadge, { backgroundColor: C.surface2 }]}>
                          <Text style={[styles.miniBadgeText, { color: C.textMuted }]}>
                            {item.semester || 'All Semesters'}
                          </Text>
                        </View>
                        <View style={[styles.miniBadge, { backgroundColor: C.surface2, marginLeft: 6 }]}>
                          <Text style={[styles.miniBadgeText, { color: C.textMuted }]}>
                            {item.department ? normalizeDeptCode(item.department) : 'Univ-Wide'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={16} color={isItemActive ? C.brand : C.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  // Top Control Row
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  topSelectorBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  btnIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSelectorBtnText: {
    flex: 1,
    fontSize: 12,
  },
  // Semester Bar
  semesterBarWrapper: {
    paddingBottom: 8,
  },
  semesterBarScroll: {
    paddingHorizontal: Layout.screenPadding,
    gap: 8,
  },
  semesterChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semesterChipText: {
    fontSize: 12,
  },
  // Sheet Status Strip
  sheetStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sheetStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sheetStatusTitle: {
    fontSize: 12,
  },
  sheetStatusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stripActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Main Canvas
  canvasContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  imageScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  routineImage: {
    width: Dimensions.get('window').width - 20,
    height: Dimensions.get('window').height * 0.65,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FontSize.xs,
    marginTop: 10,
    fontFamily: FontFamily.jakartaMedium,
  },
  emptyCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
  },
  emptySub: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  // Bottom Sheets & Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: FontSize.lg,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.jakartaBold,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  textInput58: {
    height: Layout.controlHeight,
    borderRadius: Layout.controlRadius,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    fontSize: FontSize.base,
    fontFamily: FontFamily.jakartaRegular,
  },
  primaryBtn58: {
    height: Layout.controlHeight,
    borderRadius: Layout.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryBtnText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.jakartaBold,
    color: '#ffffff',
  },
  quickSecRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickSecChip: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSecChipText: {
    fontSize: FontSize.sm,
  },
  deptRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  deptCodeText: {
    fontSize: FontSize.base,
  },
  deptNameText: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  dialogCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 20,
  },
  typeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTitle: {
    fontSize: FontSize.base,
  },
  typeDesc: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  rowInputs: {
    flexDirection: 'row',
    marginTop: 12,
  },
  pickFileBtn58: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Layout.controlHeight,
    borderRadius: Layout.controlRadius,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    marginTop: 14,
    gap: 8,
  },
  pickFileText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.jakartaMedium,
  },
  switchSemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1.2,
    marginTop: 18,
  },
  switchSemBtnText: {
    fontSize: FontSize.sm,
  },
  browseAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: 10,
  },
  browseAllBtnText: {
    fontSize: FontSize.sm,
  },
  circularCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  circularIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularTitleText: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  circularMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.jakartaMedium,
  },
});
