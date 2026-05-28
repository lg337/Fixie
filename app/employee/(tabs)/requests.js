import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fixieColors, fixieShadows, fixieStatusColors } from "../../../lib/fixie-theme";
import { notifyRequestsChanged, subscribeToRequestChanges } from "../../../lib/request-updates";
import { supabase } from "../../../lib/supabase";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

const statusConfig = {
  new: { color: fixieStatusColors.new, icon: "add-circle", label: "New" },
  pending: { color: fixieStatusColors.pending, icon: "add-circle", label: "New" },
  in_progress: { color: fixieStatusColors.in_progress, icon: "briefcase", label: "Active" },
  completed: { color: fixieStatusColors.completed, icon: "checkmark-circle", label: "Done" },
};

function mapStatusToFilter(status) {
  if (status === "new" || status === "pending") return "new";
  if (status === "in_progress") return "active";
  if (status === "completed") return "completed";
  return "new";
}

const handleLogout = async () => {
  await AsyncStorage.removeItem("employeeID");
  router.replace("/");
};

export default function EmployeeRequests() {
  const [filter, setFilter] = useState("all");
  const [requests, setRequests] = useState([]);
  const [companyMap, setCompanyMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
    const unsubscribe = subscribeToRequestChanges(() => loadRequests(false));
    const interval = setInterval(() => loadRequests(false), 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadRequests = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const employeeID = await AsyncStorage.getItem("employeeID");
      if (!employeeID) return;

      if (employeeID === "demo") {
        setLoading(false);
        return;
      }

      const { data: employee } = await supabase.from("EmployeeTable").select("CompanyIDS").eq("EmployeeID", Number(employeeID)).maybeSingle();

      if (employee?.CompanyIDS?.length > 0) {
        const { data: companies } = await supabase.from("CompanyTable").select("CompanyID, CompanyName").in("CompanyID", employee.CompanyIDS);
        if (companies) {
          const map = {};
          companies.forEach((c) => {
            map[c.CompanyID] = c.CompanyName;
          });
          setCompanyMap(map);
        }
      }

      const { data: reqs } = await supabase
        .from("RequestTable")
        .select("*, CustomerTable(CustomerName, CustomerPhone, CustomerEmail)")
        .eq("AssignedEmployeeID", Number(employeeID))
        .order("RequestID", { ascending: false });

      if (reqs) setRequests(reqs);
    } catch (e) {
      console.error("Requests load error:", e);
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
    notifyRequestsChanged();
    loadRequests();
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
          notifyRequestsChanged();
          loadRequests();
        },
      },
    ]);
  };

  const filtered = filter === "all" ? requests : requests.filter((r) => mapStatusToFilter(r.RequestStatus) === filter);

  const getAction = (status) => {
    if (status === "new" || status === "pending") return { label: "Accept", color: fixieColors.gold, next: "in_progress" };
    if (status === "in_progress") return { label: "Complete", color: fixieColors.success, next: "completed" };
    return null;
  };

  const renderItem = ({ item }) => {
    const config = statusConfig[item.RequestStatus] || statusConfig.new;
    const action = getAction(item.RequestStatus);
    const canDecline = item.RequestStatus === "new" || item.RequestStatus === "pending";
    return (
      <View style={styles.card}>
        <Ionicons name={config.icon} size={24} color={config.color} style={styles.cardIcon} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.RequestNotes || item.RequestTitle || "Untitled"}</Text>
          <Text style={styles.cardSubtitle}>{companyMap[item.CompanyID] || `Company #${item.CompanyID}`}</Text>
          <Text style={styles.cardMeta}>Customer: {item.CustomerTable?.CustomerName || "Unknown"}</Text>
          <Text style={styles.cardMeta}>Phone: {item.CustomerTable?.CustomerPhone || "No phone"}</Text>
          <Text style={styles.cardMeta}>Email: {item.CustomerTable?.CustomerEmail || "No email"}</Text>
        </View>
        <View style={styles.actionColumn}>
          {action ? (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: action.color }]} onPress={() => updateStatus(item.RequestID, action.next)}>
              <Text style={styles.actionBtnText}>{action.label}</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: `${config.color}22` }]}>
              <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
          )}
          {canDecline ? (
            <TouchableOpacity style={styles.declineBtn} onPress={() => declineJob(item.RequestID)}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
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
      <View style={styles.topBar}>
        <Text style={styles.header}>Requests</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
          <Ionicons name="log-out-outline" size={22} color={fixieColors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.key} style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.RequestID)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No requests found.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fixieColors.background },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  header: { fontSize: 28, fontWeight: "800", color: fixieColors.text },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: fixieColors.surface, alignItems: "center", borderWidth: 1, borderColor: fixieColors.border },
  filterBtnActive: { backgroundColor: fixieColors.gold },
  filterText: { fontSize: 13, fontWeight: "700", color: fixieColors.textSecondary },
  filterTextActive: { color: fixieColors.background },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { backgroundColor: fixieColors.surface, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: fixieColors.border, flexDirection: "row", gap: 12, ...fixieShadows.card },
  cardIcon: { marginTop: 3 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: fixieColors.text },
  cardSubtitle: { fontSize: 14, color: fixieColors.goldLight, marginTop: 4, fontWeight: "600" },
  cardMeta: { color: fixieColors.textSecondary, marginTop: 4, fontSize: 12 },
  actionColumn: { justifyContent: "center", gap: 8 },
  actionBtn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minWidth: 92, alignItems: "center" },
  actionBtnText: { color: fixieColors.background, fontWeight: "800", fontSize: 12 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, alignItems: "center" },
  statusText: { fontWeight: "800", fontSize: 12 },
  declineBtn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: fixieColors.surfaceElevated, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center" },
  declineBtnText: { color: fixieColors.textSecondary, fontWeight: "700", fontSize: 12 },
  emptyText: { color: fixieColors.textMuted, textAlign: "center", marginTop: 40 },
});
