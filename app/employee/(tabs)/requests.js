import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fixieColors, fixieShadows, fixieStatusColors } from "../../../lib/fixie-theme";
import {
  PROJECT_TRACKER_STAGES,
  getTrackerProgress,
  getTrackerStage,
  getTrackerStageIndex,
  isActiveRequestStatus,
  isCompletedRequestStatus,
  isNewRequestStatus,
} from "../../../lib/project-tracker";
import { appendDatedRequestUpdate, getRequestDateLabel, getRequestSummary } from "../../../lib/request-dates";
import { speakRequest } from "../../../lib/request-speech";
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
  pending: { color: fixieStatusColors.pending, icon: "calendar", label: "Site Visit" },
  source_parts: { color: fixieStatusColors.source_parts, icon: "construct", label: "Parts" },
  labor: { color: fixieStatusColors.labor, icon: "briefcase", label: "Labor" },
  in_progress: { color: fixieStatusColors.in_progress, icon: "briefcase", label: "Active" },
  final_touches: { color: fixieStatusColors.final_touches, icon: "sparkles", label: "Final Touches" },
  completed: { color: fixieStatusColors.completed, icon: "checkmark-circle", label: "Done" },
};

function mapStatusToFilter(status) {
  if (isNewRequestStatus(status)) return "new";
  if (isActiveRequestStatus(status)) return "active";
  if (isCompletedRequestStatus(status)) return "completed";
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

  const updateStatus = async (request, newStatus) => {
    const nextStage = getTrackerStage(newStatus);
    const { error } = await supabase
      .from("RequestTable")
      .update({
        RequestStatus: newStatus,
        RequestNotes: appendDatedRequestUpdate(request.RequestNotes, `Employee changed status to ${nextStage.label}.`),
      })
      .eq("RequestID", request.RequestID);
    if (error) {
      Alert.alert("Error", "Failed to update status.");
      return;
    }
    notifyRequestsChanged();
    loadRequests();
  };

  const declineJob = async (request) => {
    Alert.alert("Decline Job", "Are you sure you want to decline this job?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("RequestTable")
            .update({
              AssignedEmployeeID: null,
              RequestStatus: "new",
              RequestNotes: appendDatedRequestUpdate(request.RequestNotes, "Employee declined the job; request moved back to New."),
            })
            .eq("RequestID", request.RequestID);
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
    if (isNewRequestStatus(status)) return { label: "Accept", color: fixieColors.gold, next: "labor" };
    if (isActiveRequestStatus(status)) return { label: "Complete", color: fixieColors.success, next: "completed" };
    return null;
  };

  const renderItem = ({ item }) => {
    const stage = getTrackerStage(item.RequestStatus);
    const activeIndex = getTrackerStageIndex(item.RequestStatus);
    const progress = getTrackerProgress(item.RequestStatus);
    const config = statusConfig[stage.key] || statusConfig.new;
    const action = getAction(item.RequestStatus);
    const canDecline = isNewRequestStatus(item.RequestStatus);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name={config.icon} size={24} color={config.color} style={styles.cardIcon} />
          <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{getRequestSummary(item, "Untitled")}</Text>
            <TouchableOpacity style={styles.speakerButton} onPress={() => speakRequest(item, "Untitled")} accessibilityLabel="Read request aloud">
              <Ionicons name="volume-high-outline" size={17} color={fixieColors.goldLight} />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSubtitle} dataSet={{ fixieNoTranslate: "true" }}>{companyMap[item.CompanyID] || `Company #${item.CompanyID}`}</Text>
          <Text style={styles.cardDate}>
            <Text>Request date</Text>
            <Text>: </Text>
            <Text>{getRequestDateLabel(item)}</Text>
          </Text>
          <Text style={styles.cardMeta}>
            <Text>Customer</Text>
            <Text>: </Text>
            <Text dataSet={{ fixieNoTranslate: "true" }}>{item.CustomerTable?.CustomerName || "Unknown"}</Text>
          </Text>
          <Text style={styles.cardMeta}>
            <Text>Phone</Text>
            <Text>: </Text>
            <Text dataSet={{ fixieNoTranslate: "true" }}>{item.CustomerTable?.CustomerPhone || "No phone"}</Text>
          </Text>
          <Text style={styles.cardMeta}>
            <Text>Email</Text>
            <Text>: </Text>
            <Text dataSet={{ fixieNoTranslate: "true" }}>{item.CustomerTable?.CustomerEmail || "No email"}</Text>
          </Text>
          </View>
        </View>
        <View style={styles.trackerPanel}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Project tracker</Text>
              <Text style={styles.progressPercent}>{progress}% complete</Text>
            </View>
            <Text style={styles.currentStageTextInline}>{stage.label}</Text>
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
        <View style={styles.actionColumn}>
          {action ? (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: action.color }]} onPress={() => updateStatus(item, action.next)}>
              <Text style={styles.actionBtnText}>{action.label}</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: `${config.color}22` }]}>
              <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
          )}
          {canDecline ? (
            <TouchableOpacity style={styles.declineBtn} onPress={() => declineJob(item)}>
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
  card: { backgroundColor: fixieColors.surface, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  cardHeaderRow: { flexDirection: "row", gap: 12 },
  cardIcon: { marginTop: 3 },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: fixieColors.text },
  speakerButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: fixieColors.backgroundAlt, borderWidth: 1, borderColor: fixieColors.border },
  cardSubtitle: { fontSize: 14, color: fixieColors.goldLight, marginTop: 4, fontWeight: "600" },
  cardDate: { color: fixieColors.textMuted, marginTop: 4, fontSize: 12, fontWeight: "700" },
  cardMeta: { color: fixieColors.textSecondary, marginTop: 4, fontSize: 12 },
  trackerPanel: { backgroundColor: fixieColors.backgroundAlt, borderRadius: 16, padding: 13, borderWidth: 1, borderColor: fixieColors.border, marginTop: 12 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  progressTitle: { color: fixieColors.goldLight, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  progressPercent: { color: fixieColors.text, fontSize: 15, fontWeight: "800", marginTop: 3 },
  currentStageTextInline: { color: fixieColors.textSecondary, fontSize: 11, fontWeight: "800", textAlign: "right", flexShrink: 1 },
  progressTrack: { height: 7, borderRadius: 999, backgroundColor: fixieColors.surfaceElevated, overflow: "hidden", marginTop: 10 },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: fixieColors.gold },
  stageRow: { flexDirection: "row", justifyContent: "space-between", gap: 5, marginTop: 11 },
  stageItem: { flex: 1, alignItems: "center", minWidth: 0 },
  stageDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: fixieColors.surfaceElevated, borderWidth: 1, borderColor: fixieColors.border },
  stageDotActive: { backgroundColor: fixieColors.gold, borderColor: fixieColors.goldLight },
  stageText: { marginTop: 5, fontSize: 9, lineHeight: 12, color: fixieColors.textMuted, textAlign: "center" },
  stageTextActive: { color: fixieColors.text, fontWeight: "800" },
  scheduleText: { marginTop: 10, color: fixieColors.textSecondary, fontSize: 11, lineHeight: 16 },
  actionColumn: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12, flexWrap: "wrap" },
  actionBtn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minWidth: 92, alignItems: "center" },
  actionBtnText: { color: fixieColors.background, fontWeight: "800", fontSize: 12 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, alignItems: "center" },
  statusText: { fontWeight: "800", fontSize: 12 },
  declineBtn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: fixieColors.surfaceElevated, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center" },
  declineBtnText: { color: fixieColors.textSecondary, fontWeight: "700", fontSize: 12 },
  emptyText: { color: fixieColors.textMuted, textAlign: "center", marginTop: 40 },
});
