// PDF Maker landing: four tools for getting an assignment ready to submit.
// Nothing here talks to the network, and no file leaves the phone.
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout } from '../../theme';
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
          const { title } = label(tool.key);
          return (
            <TouchableOpacity
              key={tool.key}
              style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => navigation.navigate(tool.route)}
              activeOpacity={0.75}
            >
              <View style={styles.tile}>
                <Feather name={tool.icon} size={32} color={C.text} />
              </View>
              <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{title}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={C.textMuted} />
            </TouchableOpacity>
          );
        })}

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
  card: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, height: 72, borderRadius: 16, borderWidth: 1 } as ViewStyle,
  tile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  cardTitle: { fontSize: 15 },
});
