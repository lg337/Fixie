import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import FixieLogo from "../../../components/FixieLogo";
import { fixieColors, fixieShadows } from "../../../lib/fixie-theme";
import { supabase } from "../../../lib/supabase";

function SectionHeader({ icon, title, count }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={fixieColors.goldLight} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    </View>
  );
}

function JobCard({ title, subtitle, customerName, customerPhone, customerEmail, actionLabel, actionColor, onAction, onDecline }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
        <Text style={styles.cardMeta}>Customer: {customerName || "Unknown"}</Text>
        <Text style={styles.cardMeta}>Phone: {customerPhone || "No phone"}</Text>
        <Text style={styles.cardMeta}>Email: {customerEmail || "No email"}</Text>
      </View>
      <View style={styles.actionColumn}>
        {actionLabel ? (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: actionColor }]} onPress={onAction}>
            <Text style={styles.actionBtnText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
        {onDecline ? (
          <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const handleLogout = async () => {
  await AsyncStorage.removeItem("employeeID");
  router.replace("/");
};

export default function EmployeeDashboard() {
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState("");
  const [activeJobs, setActiveJobs] = useState([]);
  const [newRequests, setNewRequests] = useState([]);
  const [companyMap, setCompanyMap] = useState({});

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const employeeID = await AsyncStorage.getItem("employeeID");
      if (!employeeID) return;

      if (employeeID === "demo") {
        setEmployeeName("Demo Employee");
        setActiveJobs([]);
        setNewRequests([]);
        setLoading(false);
        return;
      }

      const { data: employee } = await supabase.from("EmployeeTable").select("*").eq("EmployeeID", Number(employeeID)).maybeSingle();
      if (!employee) return;
      setEmployeeName(employee.EmployeeName || "Employee");

      const companyIDs = employee.CompanyIDS || [];
      if (companyIDs.length > 0) {
        const { data: companies } = await supabase.from("CompanyTable").select("CompanyID, CompanyName").in("CompanyID", companyIDs);
        if (companies) {
          const map = {};
          companies.forEach((c) => {
            map[c.CompanyID] = c.CompanyName;
          });
          setCompanyMap(map);
        }
      }

      const { data: requests } = await supabase
        .from("RequestTable")
        .select("*, CustomerTable(CustomerName, CustomerPhone, CustomerEmail)")
        .eq("AssignedEmployeeID", Number(employeeID))
        .order("RequestID", { ascending: false });

      if (requests) {
        setActiveJobs(requests.filter((r) => r.RequestStatus === "in_progress"));
        setNewRequests(requests.filter((r) => r.RequestStatus === "new" || r.RequestStatus === "pending"));
      }
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (requestID, newStatus) => {
    const { error } = await supabase.from("RequestTable").update({ RequestStatus: newStatus }).eq("RequestID", requestID);
    if (error) {
      Alert.alert("Error", "Failed to update status.");
      return;
    }
    loadDashboard();
  };

  const declineJob = async (requestID) => {
    Alert.alert("Decline Job", "Are you sure you want to decline this job?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("RequestTable").update({ AssignedEmployeeID: null, RequestStatus: "new" }).eq("RequestID", requestID);
          if (error) {
            Alert.alert("Error", "Failed to decline job.");
            return;
          }
          loadDashboard();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={fixieColors.gold} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.headerBar}>
              <View style={styles.headerIntro}>
                <FixieLogo size={48} />
                <View>
                  <Text style={styles.eyebrow}>Employee Dashboard</Text>
                  <Text style={styles.header}>Hi, {employeeName}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
                <Ionicons name="log-out-outline" size={22} color={fixieColors.error} />
              </TouchableOpacity>
            </View>

            <SectionHeader icon="briefcase" title="Active Jobs" count={activeJobs.length} />
            {activeJobs.length === 0 ? <Text style={styles.emptyText}>No active jobs right now.</Text> : activeJobs.map((job) => (
              <JobCard
                key={String(job.RequestID)}
                title={job.RequestNotes || job.RequestTitle || "Untitled Job"}
                subtitle={companyMap[job.CompanyID] || `Company #${job.CompanyID}`}
                customerName={job.CustomerTable?.CustomerName}
                customerPhone={job.CustomerTable?.CustomerPhone}
                customerEmail={job.CustomerTable?.CustomerEmail}
                actionLabel="Mark Complete"
                actionColor={fixieColors.success}
                onAction={() => updateStatus(job.RequestID, "completed")}
              />
            ))}

            <SectionHeader icon="add-circle" title="New Job Requests" count={newRequests.length} />
            {newRequests.length === 0 ? <Text style={styles.emptyText}>No new requests.</Text> : newRequests.map((r) => (
              <JobCard
                key={String(r.RequestID)}
                title={r.RequestNotes || r.RequestTitle || "Untitled Request"}
                subtitle={companyMap[r.CompanyID] || `Company #${r.CompanyID}`}
                customerName={r.CustomerTable?.CustomerName}
                customerPhone={r.CustomerTable?.CustomerPhone}
                customerEmail={r.CustomerTable?.CustomerEmail}
                actionLabel="Accept Job"
                actionColor={fixieColors.gold}
                onAction={() => updateStatus(r.RequestID, "in_progress")}
                onDecline={() => declineJob(r.RequestID)}
              />
            ))}
          </>
        }
        data={[]}
        renderItem={null}
        contentContainerStyle={styles.scrollContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fixieColors.background },
  scrollContent: { padding: 16, paddingBottom: 30 },
  headerBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  headerIntro: { flexDirection: "row", alignItems: "center", gap: 12 },
  eyebrow: { color: fixieColors.goldLight, fontSize: 11, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase" },
  header: { fontSize: 28, fontWeight: "800", color: fixieColors.text, marginTop: 4 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: fixieColors.text, marginLeft: 8, flex: 1 },
  badge: { backgroundColor: fixieColors.gold, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: fixieColors.background, fontSize: 13, fontWeight: "800" },
  emptyText: { color: fixieColors.textMuted, marginBottom: 10, marginTop: 6 },
  card: { backgroundColor: fixieColors.surface, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: fixieColors.border, flexDirection: "row", gap: 12, ...fixieShadows.card },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: fixieColors.text },
  cardSubtitle: { color: fixieColors.goldLight, marginTop: 4, fontWeight: "600" },
  cardMeta: { color: fixieColors.textSecondary, marginTop: 4, fontSize: 12 },
  actionColumn: { justifyContent: "center", gap: 8 },
  actionBtn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minWidth: 96, alignItems: "center" },
  actionBtnText: { color: fixieColors.background, fontWeight: "800", fontSize: 12 },
  declineBtn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: fixieColors.surfaceElevated, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center" },
  declineBtnText: { color: fixieColors.textSecondary, fontWeight: "700", fontSize: 12 },
});
