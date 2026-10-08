import { View, Text, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout, FontSize } from '../../theme';

interface TermSectionProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  children: React.ReactNode;
  C: any;
}

function TermSection({ icon, title, children, C }: TermSectionProps) {
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

export function TermsScreen({ navigation }: any) {
  const { C } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title="Terms of Service"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
      >
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: C.brand + '12', borderColor: C.brand + '30' }]}>
          <Text style={[styles.bannerTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
            CampusOne Terms & Guidelines
          </Text>
          <Text style={[styles.bannerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            Last updated: October 2026 · Bangladesh University of Business & Technology
          </Text>
        </View>

        {/* 1. Acceptance */}
        <TermSection icon="check-circle" title="1. Acceptance of Terms" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            By creating an account, accessing, or using CampusOne, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must discontinue use of the application.
          </Text>
        </TermSection>

        {/* 2. Eligibility & Conduct */}
        <TermSection icon="users" title="2. Eligibility & University Conduct" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            CampusOne is intended for active students, faculty, and administrative staff affiliated with Bangladesh University of Business and Technology (BUBT). Users agree to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • Provide accurate student or employee identification details during profile setup.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • Treat fellow students, faculty, and maintenance staff with courtesy and mutual respect.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • Refrain from posting offensive, discriminatory, threatening, or fraudulent content.
            </Text>
          </View>
        </TermSection>

        {/* 3. Marketplace & Ride Sharing */}
        <TermSection icon="shopping-bag" title="3. Peer-to-Peer Services" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            The Student Marketplace and Campus Rides features operate strictly on a peer-to-peer voluntary basis:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • CampusOne facilitates communication and contact discovery between campus members; it is not a merchant, broker, or transport provider.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • All exchanges (used textbooks, calculators, electronics) must take place in person in public university areas.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • Prohibited listings include illegal items, academic dishonesty materials (such as test leakages), or hazardous products.
            </Text>
          </View>
        </TermSection>

        {/* 4. Issue Reporting & Maintenance */}
        <TermSection icon="tool" title="4. Campus Maintenance Reports" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            The Issue Reporting system directly assists varsity repair crews in maintaining campus facilities:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • Only genuine campus maintenance problems (plumbing, electrical, furniture, cleanliness) may be reported.
            </Text>
            <Text style={[styles.bullet, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              • Submitting fake, spam, or prank reports degrades campus operations and may result in immediate suspension.
            </Text>
          </View>
        </TermSection>

        {/* 5. Blood Donation Network */}
        <TermSection icon="heart" title="5. Blood Donation Network" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            The blood donation directory and urgent request board connect student volunteers with urgent campus and local hospital needs. Volunteers must accurately represent their blood group and uphold the mandatory 90-day waiting interval between donations.
          </Text>
        </TermSection>

        {/* 6. Disclaimers */}
        <TermSection icon="alert-circle" title="6. Logistics Disclaimers" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            Bus departure schedules, prayer timings, and academic calendars are provided for student convenience. Real-world conditions, traffic, weather, or university administration notices may alter schedules without notice.
          </Text>
        </TermSection>

        {/* 7. Termination */}
        <TermSection icon="shield-off" title="7. Account Suspension & Termination" C={C}>
          <Text style={[styles.p, { color: C.text2, fontFamily: FontFamily.jakartaRegular }]}>
            CampusOne administrators reserve the right to suspend or terminate accounts that violate university policies, engage in harassment, or tamper with system integrity. Users may delete their account at any time from the app settings.
          </Text>
        </TermSection>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  content: { paddingTop: 16, paddingBottom: 24 } as ViewStyle,

  banner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  } as ViewStyle,
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
});

