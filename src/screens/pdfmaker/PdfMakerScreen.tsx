// PDF Maker landing: four tools for getting an assignment ready to submit.
// Nothing here talks to the network, and no file leaves the phone.
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { smokeTestPdfLib } from '../../services/pdf/smokeTest';
import { PrivacyNote } from './components';

const TOOLS = [
  { key: 'images',   route: 'PdfImages',   icon: 'image' },
  { key: 'merge',    route: 'PdfMerge',    icon: 'layers' },
  { key: 'organize', route: 'PdfOrganize', icon: 'grid' },
  { key: 'compress', route: 'PdfCompress', icon: 'minimize-2' },
] as const;

export function PdfMakerScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const toast = useToast();

  const label = (key: (typeof TOOLS)[number]['key']) => ({
    images:   { title: t.pdfmaker.tools.imagesTitle,   blurb: t.pdfmaker.tools.imagesBlurb },
    merge:    { title: t.pdfmaker.tools.mergeTitle,    blurb: t.pdfmaker.tools.mergeBlurb },
    organize: { title: t.pdfmaker.tools.organizeTitle, blurb: t.pdfmaker.tools.organizeBlurb },
    compress: { title: t.pdfmaker.tools.compressTitle, blurb: t.pdfmaker.tools.compressBlurb },
  }[key]);

  // Dev-only: proves pdf-lib still runs under Hermes after a dependency or
  // engine change, without having to build a whole PDF by hand.
  async function runSmokeTest() {
    try {
      const bytes = await smokeTestPdfLib();
      toast({ type: 'success', title: t.pdfmaker.smokeOk(bytes) });
    } catch (e: any) {
      toast({ type: 'error', title: t.pdfmaker.smokeTest, message: String(e?.message ?? e) });
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.pdfmaker.title} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
          {t.pdfmaker.subtitle}
        </Text>

        {TOOLS.map((tool) => {
          const { title, blurb } = label(tool.key);
          return (
            <TouchableOpacity
              key={tool.key}
              style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => navigation.navigate(tool.route)}
              activeOpacity={0.75}
            >
              <View style={[styles.tile, { backgroundColor: C.surface2 }]}>
                <Feather name={tool.icon} size={20} color={SectorColors.pdfmaker} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{title}</Text>
                <Text style={[styles.cardDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>{blurb}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={C.textMuted} />
            </TouchableOpacity>
          );
        })}

        {__DEV__ ? (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={runSmokeTest}
            activeOpacity={0.75}
          >
            <View style={[styles.tile, { backgroundColor: C.surface2 }]}>
              <Feather name="activity" size={20} color={C.textMuted} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.pdfmaker.smokeTest}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.textMuted} />
          </TouchableOpacity>
        ) : null}

        <PrivacyNote />
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, gap: 11 } as ViewStyle,
  subtitle: { fontSize: 13.5, lineHeight: 19, marginBottom: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  tile: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  cardTitle: { fontSize: 15 },
  cardDesc: { fontSize: 12.5, marginTop: 1 },
});
