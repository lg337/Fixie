import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import FixieLogo from "../../components/FixieLogo";
import { fixieColors, fixieShadows, fixieStatusColors } from "../../lib/fixie-theme";
import { supabase } from "../../lib/supabase";
import useFixieLayout from "../../lib/useFixieLayout";

export default function CompanyHome() {
  const layout = useFixieLayout();
  const [loading, setLoading] = useState(true);
  const [companyID, setCompanyID] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [newRequests, setNewRequests] = useState([]);
  const [inProgressRequests, setInProgressRequests] = useState([]);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const storedCompanyID = await AsyncStorage.getItem("companyID");
      if (!storedCompanyID) {
        router.replace("/company/login");
        return;
      }

      if (storedCompanyID === "demo") {
        setCompanyID("demo");
        setCompanyData({ CompanyName: "Demo Company", CompanyField: "Demo" });
        setNewRequests([]);
        setInProgressRequests([]);
      } else {
        const parsedCompanyID = Number(storedCompanyID);
        if (Number.isNaN(parsedCompanyID)) {
          router.replace("/company/login");
          return;
        }

        setCompanyID(parsedCompanyID);

        const { data: company } = await supabase.from("CompanyTable").select("*").eq("CompanyID", parsedCompanyID).maybeSingle();
        setCompanyData(company || null);

        const { data: newReqs } = await supabase
          .from("RequestTable")
          .select("*")
          .eq("CompanyID", parsedCompanyID)
          .in("RequestStatus", ["new", "pending"])
          .order("RequestID", { ascending: false });

        const { data: progressReqs } = await supabase
          .from("RequestTable")
          .select("*")
          .eq("CompanyID", parsedCompanyID)
          .eq("RequestStatus", "in_progress")
          .order("RequestID", { ascending: false });

        setNewRequests(newReqs || []);
        setInProgressRequests(progressReqs || []);
      }
    } catch {
      Alert.alert("Error", "Something went wrong loading the homepage.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("companyID");
    router.replace("/");
  };

  const updateStatus = async (requestID, newStatus) => {
    const { error } = await supabase.from("RequestTable").update({ RequestStatus: newStatus }).eq("RequestID", requestID);
    if (error) {
      Alert.alert("Error", "Failed to update status.");
      return;
    }
    loadHomeData();
  };

  const STATUS_OPTIONS = [
    { key: "new", label: "New" },
    { key: "pending", label: "Pending" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
  ];

  const renderRequestItem = ({ item }) => (
    <View style={styles.requestCard}>
      <Text style={styles.requestTitle}>{item.RequestTitle || item.RequestNotes || "Untitled Request"}</Text>
      <Text style={styles.requestDescription}>{item.RequestDescription || item.RequestNotes || "No description provided"}</Text>
      <View style={styles.statusRow}>
        {STATUS_OPTIONS.map((s) => {
          const active = item.RequestStatus === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.statusPill,
                active ? { backgroundColor: fixieStatusColors[s.key] || fixieColors.gold } : styles.statusPillIdle,
              ]}
              onPress={() => {
                if (!active) updateStatus(item.RequestID, s.key);
              }}
            >
              <Text style={[styles.statusPillText, active && styles.statusPillTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const BottomNav = () => (
    <View style={[styles.bottomBar, layout.isDesktop && styles.desktopBottomBar]}>
      {[
        ["Home", "home", "/company/home", true],
        ["Requests", "document-text-outline", "/company/requests", false],
        ["Employees", "people-outline", "/company/employees", false],
        ["CRM", "briefcase-outline", "/company/crm", false],
      ].map(([label, icon, route, active]) => (
        <TouchableOpacity key={route} style={[styles.navButton, layout.isDesktop && styles.desktopNavButton, active && styles.navButtonActive]} onPress={() => router.push(route)}>
          <Ionicons name={icon} size={layout.isDesktop ? 18 : 20} color={active ? fixieColors.background : fixieColors.textSecondary} />
          <Text style={active ? styles.navTextActive : styles.navText}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={fixieColors.gold} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.topHeader, layout.isDesktop && styles.desktopSection]}>
        <View style={styles.companyInfo}>
          {companyData?.ProfileImageUrl ? (
            <Image source={{ uri: companyData.ProfileImageUrl }} style={styles.companyImage} />
          ) : (
            <FixieLogo size={54} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Company Dashboard</Text>
            <Text style={styles.companyName}>{companyData?.CompanyName || "Company"}</Text>
            <Text style={styles.companyIdText}>Company ID: {companyID}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push("/company/profile")} style={styles.iconButton}>
            <Ionicons name="person-circle-outline" size={24} color={fixieColors.goldLight} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <Ionicons name="log-out-outline" size={22} color={fixieColors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, layout.isDesktop && styles.desktopContent]} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, layout.isDesktop && styles.desktopHeroCard]}>
          <Text style={styles.heroTitle}>Overview</Text>
          <Text style={styles.heroText}>Your requests, staff, and CRM still behave the same. This is a premium UI layer only.</Text>
        </View>

        <View style={[styles.box, layout.isDesktop && styles.desktopBox]}>
          <Text style={styles.boxTitle}>New Requests</Text>
          {newRequests.length === 0 ? <Text style={styles.emptyText}>No new requests.</Text> : <FlatList data={newRequests.slice(0, 5)} keyExtractor={(item) => String(item.RequestID)} renderItem={renderRequestItem} scrollEnabled={false} />}
        </View>

        <View style={[styles.box, layout.isDesktop && styles.desktopBox]}>
          <Text style={styles.boxTitle}>In Progress Requests</Text>
          {inProgressRequests.length === 0 ? <Text style={styles.emptyText}>No in progress requests.</Text> : <FlatList data={inProgressRequests.slice(0, 5)} keyExtractor={(item) => String(item.RequestID)} renderItem={renderRequestItem} scrollEnabled={false} />}
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fixieColors.background },
  loadingContainer: { flex: 1, backgroundColor: fixieColors.background, justifyContent: "center", alignItems: "center" },
  topHeader: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  desktopSection: { width: "100%", maxWidth: 1180, alignSelf: "center", paddingHorizontal: 28, paddingTop: 22 },
  companyInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  companyImage: { width: 58, height: 58, borderRadius: 29, backgroundColor: fixieColors.surfaceElevated },
  eyebrow: { color: fixieColors.goldLight, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  companyName: { fontSize: 24, fontWeight: "800", color: fixieColors.text, marginTop: 4 },
  companyIdText: { fontSize: 13, color: fixieColors.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 10 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  content: { padding: 18, paddingBottom: 20 },
  desktopContent: { width: "100%", maxWidth: 1180, alignSelf: "center", paddingHorizontal: 28, paddingBottom: 34 },
  heroCard: { backgroundColor: fixieColors.surfaceElevated, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: fixieColors.border, marginBottom: 18, ...fixieShadows.card },
  desktopHeroCard: { padding: 28 },
  heroTitle: { fontSize: 22, fontWeight: "800", color: fixieColors.text },
  heroText: { marginTop: 8, fontSize: 14, lineHeight: 21, color: fixieColors.textSecondary },
  box: { backgroundColor: fixieColors.surface, borderRadius: 24, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  desktopBox: { padding: 20 },
  boxTitle: { fontSize: 20, fontWeight: "800", color: fixieColors.text, marginBottom: 12 },
  requestCard: { backgroundColor: fixieColors.surfaceElevated, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: fixieColors.border },
  requestTitle: { fontSize: 16, fontWeight: "700", color: fixieColors.text, marginBottom: 4 },
  requestDescription: { fontSize: 14, color: fixieColors.textSecondary, marginBottom: 8 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusPillIdle: { backgroundColor: fixieColors.backgroundAlt },
  statusPillText: { fontSize: 11, fontWeight: "700", color: fixieColors.textSecondary },
  statusPillTextActive: { color: fixieColors.background },
  emptyText: { fontSize: 14, color: fixieColors.textMuted },
  bottomBar: { flexDirection: "row", backgroundColor: fixieColors.surface, borderTopWidth: 1, borderTopColor: fixieColors.border, paddingVertical: 12, paddingHorizontal: 10, gap: 8 },
  desktopBottomBar: { width: "100%", maxWidth: 1180, alignSelf: "center", marginBottom: 18, borderTopWidth: 0, borderWidth: 1, borderColor: fixieColors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10 },
  navButton: { alignItems: "center", justifyContent: "center", flex: 1, borderRadius: 16, paddingVertical: 10 },
  desktopNavButton: { flexDirection: "row", gap: 8, maxWidth: 170 },
  navButtonActive: { backgroundColor: fixieColors.gold },
  navText: { marginTop: 4, fontSize: 12, color: fixieColors.textSecondary, fontWeight: "700" },
  navTextActive: { marginTop: 4, fontSize: 12, color: fixieColors.background, fontWeight: "800" },
});
