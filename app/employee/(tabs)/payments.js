import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { fixieColors, fixieShadows } from "../../../lib/fixie-theme";

function PreviewRow({ icon, title, subtitle }) {
  return (
    <View style={styles.previewRow}>
      <View style={styles.previewIcon}>
        <Ionicons name={icon} size={20} color={fixieColors.textMuted} />
      </View>
      <View style={styles.previewCopy}>
        <Text style={styles.previewTitle}>{title}</Text>
        <Text style={styles.previewSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.soonPill}>
        <Text style={styles.soonPillText}>SOON</Text>
      </View>
    </View>
  );
}

export default function EmployeePayments() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>EARNINGS</Text>
          <Text style={styles.title}>Payments & paystubs</Text>
          <Text style={styles.subtitle}>Your future home for tracking earnings, payouts, and official pay documents.</Text>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceGlow} />
          <View style={styles.balanceTop}>
            <View>
              <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.balanceAmount}>—</Text>
            </View>
            <View style={styles.walletIcon}>
              <Ionicons name="wallet-outline" size={24} color={fixieColors.background} />
            </View>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceFooter}>
            <View>
              <Text style={styles.balanceMetaLabel}>NEXT PAYOUT</Text>
              <Text style={styles.balanceMetaValue}>Not scheduled</Text>
            </View>
            <View style={styles.notActivePill}>
              <View style={styles.statusDot} />
              <Text style={styles.notActiveText}>Not active yet</Text>
            </View>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <View style={styles.noticeIcon}>
            <Ionicons name="sparkles" size={23} color={fixieColors.goldLight} />
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Payments are coming to Fixie</Text>
            <Text style={styles.noticeText}>
              Once payments launch, completed work, payout progress, and paystubs will appear here automatically. No action is needed right now.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>What you’ll find here</Text>
          <Text style={styles.sectionSubtitle}>A preview of your future workspace</Text>
        </View>

        <View style={styles.previewCard}>
          <PreviewRow icon="cash-outline" title="Payment history" subtitle="See every completed and pending payout" />
          <View style={styles.rowDivider} />
          <PreviewRow icon="document-text-outline" title="Paystubs" subtitle="View and download official pay documents" />
          <View style={styles.rowDivider} />
          <PreviewRow icon="business-outline" title="Earnings by company" subtitle="Understand where your income comes from" />
          <View style={styles.rowDivider} />
          <PreviewRow icon="calendar-outline" title="Payout schedule" subtitle="Know when your next payment is arriving" />
        </View>

        <View style={styles.emptyHistory}>
          <View style={styles.emptyDocument}>
            <View style={styles.documentLineWide} />
            <View style={styles.documentLine} />
            <View style={styles.documentLineShort} />
          </View>
          <Text style={styles.emptyTitle}>No payment activity yet</Text>
          <Text style={styles.emptyText}>Payments and paystubs will be listed here after the feature launches.</Text>
        </View>

        <View style={styles.securityNote}>
          <Ionicons name="lock-closed-outline" size={16} color={fixieColors.textMuted} />
          <Text style={styles.securityText}>Your financial information will be private and securely protected.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fixieColors.background },
  content: { padding: 16, paddingBottom: 44 },
  header: { marginBottom: 18 },
  eyebrow: { color: fixieColors.goldLight, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: fixieColors.text, fontSize: 29, fontWeight: "900", marginTop: 3 },
  subtitle: { color: fixieColors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 620 },
  balanceCard: { backgroundColor: fixieColors.goldDeep, borderRadius: 24, padding: 19, overflow: "hidden", ...fixieShadows.glow },
  balanceGlow: { position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(255,255,255,0.08)", right: -45, top: -75 },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { color: "rgba(0,0,0,0.58)", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  balanceAmount: { color: fixieColors.background, fontSize: 35, lineHeight: 42, fontWeight: "900", marginTop: 1 },
  walletIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.14)", alignItems: "center", justifyContent: "center" },
  balanceDivider: { height: 1, backgroundColor: "rgba(0,0,0,0.16)", marginVertical: 15 },
  balanceFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceMetaLabel: { color: "rgba(0,0,0,0.52)", fontSize: 9, fontWeight: "900", letterSpacing: 0.9 },
  balanceMetaValue: { color: fixieColors.background, fontSize: 12, fontWeight: "800", marginTop: 3 },
  notActivePill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "rgba(0,0,0,0.12)" },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: fixieColors.background },
  notActiveText: { color: fixieColors.background, fontSize: 10, fontWeight: "800" },
  noticeCard: { flexDirection: "row", backgroundColor: "rgba(216,198,144,0.08)", borderRadius: 19, borderWidth: 1, borderColor: "rgba(216,198,144,0.22)", padding: 15, marginTop: 14 },
  noticeIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: fixieColors.surfaceElevated, alignItems: "center", justifyContent: "center", marginRight: 11 },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: fixieColors.text, fontSize: 14, fontWeight: "900" },
  noticeText: { color: fixieColors.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 4 },
  sectionHeading: { marginTop: 23, marginBottom: 10 },
  sectionTitle: { color: fixieColors.text, fontSize: 17, fontWeight: "900" },
  sectionSubtitle: { color: fixieColors.textMuted, fontSize: 10, marginTop: 3 },
  previewCard: { backgroundColor: fixieColors.surface, borderRadius: 21, borderWidth: 1, borderColor: fixieColors.border, paddingHorizontal: 14, ...fixieShadows.card },
  previewRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  previewIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: fixieColors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  previewCopy: { flex: 1, marginLeft: 11 },
  previewTitle: { color: fixieColors.text, fontSize: 13, fontWeight: "800" },
  previewSubtitle: { color: fixieColors.textMuted, fontSize: 10, marginTop: 3 },
  soonPill: { backgroundColor: fixieColors.surfaceElevated, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  soonPillText: { color: fixieColors.goldLight, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  rowDivider: { height: 1, backgroundColor: fixieColors.border, marginLeft: 49 },
  emptyHistory: { alignItems: "center", backgroundColor: fixieColors.surface, borderRadius: 21, borderWidth: 1, borderColor: fixieColors.border, padding: 24, marginTop: 14 },
  emptyDocument: { width: 52, height: 62, borderRadius: 9, backgroundColor: fixieColors.surfaceElevated, padding: 10, justifyContent: "center", gap: 6, marginBottom: 12 },
  documentLineWide: { height: 4, width: "100%", borderRadius: 2, backgroundColor: fixieColors.border },
  documentLine: { height: 4, width: "75%", borderRadius: 2, backgroundColor: fixieColors.border },
  documentLineShort: { height: 4, width: "48%", borderRadius: 2, backgroundColor: fixieColors.border },
  emptyTitle: { color: fixieColors.text, fontSize: 14, fontWeight: "900" },
  emptyText: { color: fixieColors.textMuted, fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 5, maxWidth: 280 },
  securityNote: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, marginTop: 17 },
  securityText: { color: fixieColors.textMuted, fontSize: 10 },
});
