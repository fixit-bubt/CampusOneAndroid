import { View, Text, ScrollView, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout, FontSize } from '../../theme';

const WEB_PRIVACY_URL = 'https://fixit-bubt.github.io/privacy-policy';

interface PolicySectionProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  children: React.ReactNode;
  C: any;
}

function PolicySection({ icon, title, children, C }: PolicySectionProps) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconWrap, { backgroundColor: C.brand + '15' }]}>
          <Feather name={icon} size={16} color={C.brand} />
        </View>
        <Text style={[styles.sectionTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
          {title}
        </Text>
      </View>
      <View style={styles.sectionBody}>
        {children}
      </View>
    </View>
  );
}

export function PrivacyPolicyScreen({ navigation }: any) {
  const { C } = useTheme();

  const openOnlinePolicy = async () => {
    try {
      await WebBrowser.openBrowserAsync(WEB_PRIVACY_URL);
    } catch {
      // Fallback if browser can't open
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Privacy Policy"
        onBack={() => navigation.goBack()}
        rightSlot={
          <TouchableOpacity
            style={[styles.webBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
            onPress={openOnlinePolicy}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Feather name="external-link" size={16} color={C.brand} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
      >
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: C.brand + '12', borderColor: C.brand + '30' }]}>
          <View style={[styles.badge, { backgroundColor: C.brand }]}>
            <Text style={[styles.badgeText, { fontFamily: FontFamily.jakartaBold }]}>OFFICIAL</Text>
          </View>
          <Text style={[styles.bannerTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            CampusOne Privacy Commitment
          </Text>
          <Text style={[styles.bannerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            Effective Date: October 2026 · Built for Bangladesh University of Business & Technology (BUBT)
          </Text>
        </View>

        {/* 1. Overview */}
        <PolicySection icon="info" title="1. Overview" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            CampusOne is an all-in-one mobile companion designed specifically for students, faculty, and administrative staff at Bangladesh University of Business and Technology (BUBT). Your privacy and data integrity are central to our design. This Privacy Policy details what information we collect, how it is stored and protected, and your rights regarding your personal data.
          </Text>
        </PolicySection>

        {/* 2. Information We Collect */}
        <PolicySection icon="database" title="2. Information We Collect" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            We collect only the minimum information necessary to provide campus utility services:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>Account Credentials:</Text> Name, official student or employee email, and university identification number.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>Academic Profile:</Text> Department, intake, and section (used to filter study materials and class routines).
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>Voluntary Peer Contact:</Text> Phone and WhatsApp number provided voluntarily for marketplace item handover or ride-sharing pickup. Numbers remain private until authorized peer reveal.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>User Content:</Text> Photos submitted for lost and found matching, study hub lecture notes, and campus maintenance issue reports.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>Technical Identifiers:</Text> Firebase Cloud Messaging (FCM) device push token to deliver urgent campus notifications, blood requests, and announcement alerts.
            </Text>
          </View>
        </PolicySection>

        {/* 3. How We Use Your Information */}
        <PolicySection icon="cpu" title="3. How We Use Information" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            Your information is utilized strictly to provide university services:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • Coordinating urgent blood donor matching and emergency assistance.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • Facilitating peer-to-peer lost item recovery and ride sharing on campus routes.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • Routing campus maintenance reports to authorized university repair staff.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • Personalizing class routines, bus schedules, and academic calendar alerts.
            </Text>
          </View>
        </PolicySection>

        {/* 4. Third-Party Sub-processors */}
        <PolicySection icon="server" title="4. Third-Party Services" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            CampusOne does not include third-party commercial advertisements and never sells personal information. We utilize trusted infrastructure sub-processors:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>Supabase:</Text> Encrypted PostgreSQL database hosting, authentication, and secure file storage (TLS/SSL encryption in transit and rest).
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>Google Firebase FCM:</Text> Secure push notification dispatch.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>Google Gemini:</Text> AI campus assistant for answering varsity questions (prompts are processed ephemerally without training).
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>Sentry:</Text> Anonymized crash diagnostic telemetry to identify application errors.
            </Text>
          </View>
        </PolicySection>

        {/* 5. Data Security & Storage */}
        <PolicySection icon="lock" title="5. Data Security" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            All communications between the mobile application and backend services are strictly encrypted via TLS 1.3 / HTTPS. Database access is governed by strict PostgreSQL Row-Level Security (RLS) policies, ensuring users only access authorized records. Passwords are never stored in plain text and are hashed using industry-standard bcrypt.
          </Text>
        </PolicySection>

        {/* 6. Account & Data Deletion */}
        <PolicySection icon="trash-2" title="6. Your Rights & Data Deletion" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            You maintain full sovereignty over your personal data:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>In-App Deletion:</Text> You can permanently delete your account and all associated profile records directly at Settings → Account → Delete Account.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>Web Deletion Request:</Text> If you have uninstalled the app, you may submit an account and data removal request at our web portal or by emailing support.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • <Text style={{ fontFamily: FontFamily.jakartaBold, color: C.text }}>Immediate Purge:</Text> Upon account deletion, your auth profile, listings, pledges, and push tokens are permanently removed from our active database.
            </Text>
          </View>
        </PolicySection>

        {/* 7. Contact Us */}
        <PolicySection icon="mail" title="7. Contact Information" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            For any privacy inquiries, data deletion requests, or technical support, please contact the development team:
          </Text>
          <View style={[styles.contactBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Text style={[styles.contactLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              CampusOne Engineering & Support
            </Text>
            <Text style={[styles.contactValue, { color: C.brand, fontFamily: FontFamily.jakartaSemiBold }]}>
              campusone.bubt@gmail.com
            </Text>
            <Text style={[styles.contactAddress, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
              Bangladesh University of Business & Technology (BUBT){'\n'}
              Rupnagar R/A, Mirpur-2, Dhaka-1216, Bangladesh
            </Text>
          </View>
        </PolicySection>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  content: { paddingTop: 16, paddingBottom: 24 } as ViewStyle,

  webBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  banner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  } as ViewStyle,
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  } as ViewStyle,
  badgeText: {
    color: '#fff',
    fontSize: 10,
    letterSpacing: 0.8,
  } as any,
  bannerTitle: {
    fontSize: FontSize.lg,
    letterSpacing: -0.3,
    marginBottom: 4,
  } as any,
  bannerSub: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  } as any,

  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  } as ViewStyle,
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  } as ViewStyle,
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  sectionTitle: {
    fontSize: FontSize.md,
    letterSpacing: -0.2,
  } as any,
  sectionBody: {
    gap: 8,
  } as ViewStyle,
  p: {
    fontSize: FontSize.sm,
    lineHeight: 21,
  } as any,
  bulletList: {
    gap: 8,
    marginTop: 4,
  } as ViewStyle,
  bullet: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  } as any,

  contactBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    gap: 4,
  } as ViewStyle,
  contactLabel: {
    fontSize: FontSize.sm,
  } as any,
  contactValue: {
    fontSize: FontSize.sm,
  } as any,
  contactAddress: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginTop: 4,
  } as any,
});

