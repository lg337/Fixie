import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fixieColors, fixieShadows, fixieStatusColors } from "../../lib/fixie-theme";
import {
  COMPANY_TRACKER_OPTIONS,
  PROJECT_TRACKER_STAGES,
  getTrackerProgress,
  getTrackerStage,
  getTrackerStageIndex,
  isActiveRequestStatus,
  isCompletedRequestStatus,
  isNewRequestStatus,
} from "../../lib/project-tracker";
import { notifyRequestsChanged, subscribeToRequestChanges } from "../../lib/request-updates";
import { supabase } from "../../lib/supabase";
import CompanyBottomNav from "./components/CompanyBottomNav";

const handleLogout = async () => {
  await AsyncStorage.removeItem("companyID");
  router.replace("/");
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

export default function CompanyRequests() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedRequestID, setSelectedRequestID] = useState(null);

  const loadData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const storedCompanyID = await AsyncStorage.getItem("companyID");
      if (!storedCompanyID) {
        router.replace("/company/login");
        return;
      }
      if (storedCompanyID === "demo") {
        setRequests([]);
        setLoading(false);
        return;
      }
      const parsedCompanyID = Number(storedCompanyID);

      if (!parsedCompanyID) {
        router.replace("/company/login");
        return;
      }

      const [requestResult, employeeResult] = await Promise.all([
        supabase
          .from("RequestTable")
          .select(`*, CustomerTable (CustomerID, CustomerName, CustomerPhone, CustomerEmail), EmployeeTable (EmployeeName)`)
          .eq("CompanyID", parsedCompanyID)
          .order("RequestID", { ascending: false }),
        supabase
          .from("EmployeeTable")
          .select("EmployeeID, EmployeeName")
          .contains("CompanyIDS", [parsedCompanyID]),
      ]);

      if (requestResult.error) throw requestResult.error;
      if (employeeResult.error) throw employeeResult.error;

      setRequests(requestResult.data || []);
      setEmployees(employeeResult.data || []);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToRequestChanges(() => loadData(false));
    const interval = setInterval(() => loadData(false), 2000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const updateStatus = async (requestID, newStatus) => {
    const { error } = await supabase.from("RequestTable").update({ RequestStatus: newStatus }).eq("RequestID", requestID);
    if (error) {
      Alert.alert("Error", "Failed to update status.");
      return;
    }
    notifyRequestsChanged();
    loadData();
  };

  const openAssignModal = (requestID) => {
    setSelectedRequestID(requestID);
    setAssignModalVisible(true);
  };

  const assignEmployee = async (employeeID) => {
    const { error } = await supabase.from("RequestTable").update({ AssignedEmployeeID: employeeID }).eq("RequestID", selectedRequestID);
    if (error) {
      Alert.alert("Error", "Failed to assign employee.");
      return;
    }
    setAssignModalVisible(false);
    setSelectedRequestID(null);
    notifyRequestsChanged();
    loadData();
  };

  const filtered =
    filter === "all"
      ? requests
      : requests.filter((r) => {
          if (filter === "new") return isNewRequestStatus(r.RequestStatus);
          if (filter === "active") return isActiveRequestStatus(r.RequestStatus);
          if (filter === "completed") return isCompletedRequestStatus(r.RequestStatus);
          return false;
        });

  const renderItem = ({ item }) => {
    const stage = getTrackerStage(item.RequestStatus);
    const activeIndex = getTrackerStageIndex(item.RequestStatus);
    const progress = getTrackerProgress(item.RequestStatus);
    const statusColor = fixieStatusColors[item.RequestStatus] || fixieColors.gold;

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <Text style={styles.title}>{item.RequestTitle || item.RequestNotes || "Untitled Request"}</Text>
          <View style={[styles.currentStageBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.currentStageText}>{stage.label}</Text>
          </View>
        </View>
        <Text style={styles.description}>{item.RequestNotes || "No description"}</Text>
        <Text style={styles.meta}>From: {item.CustomerTable?.CustomerName || "Unknown Customer"}</Text>
        <Text style={styles.meta}>Phone: {item.CustomerTable?.CustomerPhone || "No phone"}</Text>
        <Text style={styles.meta}>Email: {item.CustomerTable?.CustomerEmail || "No email"}</Text>

        <View style={styles.assignRow}>
          <Text style={styles.meta}>Assigned to: {item.EmployeeTable?.EmployeeName || "Unassigned"}</Text>
          <TouchableOpacity style={[styles.assignButton, item.AssignedEmployeeID && styles.assignButtonDisabled]} onPress={() => !item.AssignedEmployeeID && openAssignModal(item.RequestID)} disabled={!!item.AssignedEmployeeID}>
            <Text style={styles.assignButtonText}>{item.AssignedEmployeeID ? "Assigned" : "Assign"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.trackerPanel}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Customer tracker</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.stageRow}>
            {PROJECT_TRACKER_STAGES.map((trackerStage, index) => {
              const reached = index <= activeIndex;
              return (
                <View key={trackerStage.key} style={styles.stageItem}>
                  <View style={[styles.stageDot, reached && styles.stageDotActive]} />
                  <Text style={[styles.stageText, reached && styles.stageTextActive]} numberOfLines={2}>
                    {trackerStage.shortLabel}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.scheduleText}>{stage.schedule}</Text>
        </View>

        <Text style={styles.stageControlsLabel}>Move project to</Text>
        <View style={styles.statusRow}>
          {COMPANY_TRACKER_OPTIONS.map((s) => {
            const active = stage.key === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.statusPill, active ? { backgroundColor: fixieStatusColors[s.key] || fixieColors.gold } : styles.statusPillIdle]}
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={20} color={fixieColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Requests</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
          <Ionicons name="log-out-outline" size={20} color={fixieColors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.key} style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={fixieColors.gold} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.RequestID)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No requests found.</Text>}
        />
      )}

      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Assign to Employee</Text>
            {employees.length === 0 ? (
              <Text style={styles.emptyText}>No employees found.</Text>
            ) : (
              <FlatList
                data={employees}
                keyExtractor={(item) => String(item.EmployeeID)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.employeeItem} onPress={() => assignEmployee(item.EmployeeID)}>
                    <Text style={styles.employeeName}>{item.EmployeeName}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={() => setAssignModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CompanyBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fixieColors.background },
  header: { padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: fixieColors.text, flex: 1, textAlign: "center" },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 12, gap: 6, flexWrap: "wrap" },
  filterBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, backgroundColor: fixieColors.surface, alignItems: "center", borderWidth: 1, borderColor: fixieColors.border },
  filterBtnActive: { backgroundColor: fixieColors.gold, borderColor: fixieColors.goldLight },
  filterText: { fontSize: 12, fontWeight: "700", color: fixieColors.textSecondary },
  filterTextActive: { color: fixieColors.background },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { backgroundColor: fixieColors.surface, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  title: { fontSize: 17, fontWeight: "800", marginBottom: 6, color: fixieColors.text },
  description: { fontSize: 14, color: fixieColors.textSecondary, marginBottom: 10 },
  meta: { fontSize: 12, color: fixieColors.textMuted, marginBottom: 2 },
  currentStageBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  currentStageText: { color: fixieColors.background, fontSize: 11, fontWeight: "800" },
  assignRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 10, gap: 10 },
  assignButton: { backgroundColor: fixieColors.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  assignButtonDisabled: { backgroundColor: fixieColors.surfaceElevated },
  assignButtonText: { color: fixieColors.background, fontSize: 12, fontWeight: "800" },
  trackerPanel: { backgroundColor: fixieColors.backgroundAlt, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: fixieColors.border, marginTop: 4, marginBottom: 12 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { color: fixieColors.goldLight, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  progressPercent: { color: fixieColors.text, fontSize: 18, fontWeight: "800" },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: fixieColors.surfaceElevated, overflow: "hidden", marginTop: 10 },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: fixieColors.gold },
  stageRow: { flexDirection: "row", justifyContent: "space-between", gap: 6, marginTop: 12 },
  stageItem: { flex: 1, alignItems: "center", minWidth: 0 },
  stageDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: fixieColors.surfaceElevated, borderWidth: 1, borderColor: fixieColors.border },
  stageDotActive: { backgroundColor: fixieColors.gold, borderColor: fixieColors.goldLight },
  stageText: { marginTop: 5, fontSize: 10, lineHeight: 13, color: fixieColors.textMuted, textAlign: "center" },
  stageTextActive: { color: fixieColors.text, fontWeight: "800" },
  scheduleText: { marginTop: 10, color: fixieColors.textSecondary, fontSize: 12, lineHeight: 17 },
  stageControlsLabel: { color: fixieColors.textSecondary, fontSize: 12, fontWeight: "800", marginBottom: 8 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusPillIdle: { backgroundColor: fixieColors.backgroundAlt },
  statusPillText: { fontSize: 11, fontWeight: "700", color: fixieColors.textSecondary },
  statusPillTextActive: { color: fixieColors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: fixieColors.textMuted, fontSize: 14, textAlign: "center", marginTop: 30 },
  modalOverlay: { flex: 1, backgroundColor: fixieColors.overlay, justifyContent: "flex-end" },
  modalSheet: { backgroundColor: fixieColors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "60%", borderTopWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  modalTitle: { fontSize: 20, fontWeight: "800", color: fixieColors.text, marginBottom: 16 },
  employeeItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: fixieColors.border },
  employeeName: { fontSize: 16, color: fixieColors.text, fontWeight: "700" },
  cancelButton: { alignItems: "center", paddingTop: 16 },
  cancelText: { color: fixieColors.textSecondary, fontSize: 15 },
});
