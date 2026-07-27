import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";
import { supabase } from "../../lib/supabase";
import useFixieLayout from "../../lib/useFixieLayout";
import CompanyBottomNav from "./components/CompanyBottomNav";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_HOURS = WEEKDAYS.map((day, index) => ({
  day,
  start: "8:00 AM",
  end: "5:00 PM",
  enabled: index < 5,
}));

export default function CompanySchedule() {
  const layout = useFixieLayout();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyID, setCompanyID] = useState(null);
  const [companyName, setCompanyName] = useState("Company");
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [employees, setEmployees] = useState([]);
  const [selectedDay, setSelectedDay] = useState(WEEKDAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const storedCompanyID = await AsyncStorage.getItem("companyID");
      if (!storedCompanyID) {
        router.replace("/company/login");
        return;
      }

      const scheduleKey = `companySchedule:${storedCompanyID}`;
      const savedHours = await AsyncStorage.getItem(scheduleKey);
      if (savedHours) setHours(JSON.parse(savedHours));

      if (storedCompanyID === "demo") {
        setCompanyID("demo");
        setCompanyName("Demo Company");
        setEmployees([
          { EmployeeID: "demo-1", EmployeeName: "Alex Morgan", availability: [{ id: 1, companyID: "all", day: "Mon", start: "8:00 AM", end: "4:00 PM", enabled: true }] },
          { EmployeeID: "demo-2", EmployeeName: "Jordan Lee", availability: [{ id: 2, companyID: "demo", day: "Tue", start: "9:00 AM", end: "5:00 PM", enabled: true }] },
        ]);
        return;
      }

      const parsedCompanyID = Number(storedCompanyID);
      setCompanyID(parsedCompanyID);
      const [companyResult, employeeResult] = await Promise.all([
        supabase.from("CompanyTable").select("CompanyName").eq("CompanyID", parsedCompanyID).maybeSingle(),
        supabase.from("EmployeeTable").select("EmployeeID, EmployeeName, EmployeeUsername").contains("CompanyIDS", [parsedCompanyID]).order("EmployeeName", { ascending: true }),
      ]);
      if (companyResult.error) throw companyResult.error;
      if (employeeResult.error) throw employeeResult.error;

      setCompanyName(companyResult.data?.CompanyName || "Company");
      const team = await Promise.all((employeeResult.data || []).map(async (employee) => {
        const savedProfile = await AsyncStorage.getItem(`employeeProfessionalProfile:${employee.EmployeeID}`);
        const profile = savedProfile ? JSON.parse(savedProfile) : {};
        return { ...employee, availability: profile.availability || [] };
      }));
      setEmployees(team);
    } catch (error) {
      Alert.alert("Could not load schedule", error.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadSchedule();
  }, [loadSchedule]));

  const saveHours = async () => {
    if (!companyID) return;
    try {
      setSaving(true);
      await AsyncStorage.setItem(`companySchedule:${companyID}`, JSON.stringify(hours));
      Alert.alert("Schedule saved", "Your company hours have been updated.");
    } finally {
      setSaving(false);
    }
  };

  const updateHours = (day, updates) => {
    setHours((current) => current.map((item) => item.day === day ? { ...item, ...updates } : item));
  };

  const daySchedule = useMemo(() => employees.map((employee) => ({
    ...employee,
    windows: (employee.availability || []).filter((window) =>
      window.enabled &&
      window.day === selectedDay &&
      (String(window.companyID) === "all" || String(window.companyID) === String(companyID))
    ),
  })), [companyID, employees, selectedDay]);

  const scheduledCount = daySchedule.filter((employee) => employee.windows.length).length;

  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color={fixieColors.gold} style={styles.loader} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, layout.isDesktop && styles.desktopContent]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>TEAM CALENDAR</Text>
            <Text style={styles.title}>{companyName} schedule</Text>
            <Text style={styles.subtitle}>Set your business hours and see when your whole team is available.</Text>
          </View>
          <View style={styles.headerIcon}><Ionicons name="calendar" size={25} color={fixieColors.goldLight} /></View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryNumber}>{employees.length}</Text><Text style={styles.summaryLabel}>Team members</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryNumber}>{scheduledCount}</Text><Text style={styles.summaryLabel}>Available {selectedDay}</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryNumber}>{hours.filter((item) => item.enabled).length}</Text><Text style={styles.summaryLabel}>Open days</Text></View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View><Text style={styles.sectionTitle}>Company hours</Text><Text style={styles.sectionSubtitle}>Your standard weekly operating schedule</Text></View>
            <TouchableOpacity style={styles.saveButton} onPress={saveHours} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save hours"}</Text>
            </TouchableOpacity>
          </View>
          {hours.map((item) => (
            <View key={item.day} style={[styles.hoursRow, !item.enabled && styles.disabledRow]}>
              <TouchableOpacity style={[styles.dayToggle, item.enabled && styles.dayToggleActive]} onPress={() => updateHours(item.day, { enabled: !item.enabled })}>
                <Text style={[styles.dayToggleText, item.enabled && styles.dayToggleTextActive]}>{item.day}</Text>
              </TouchableOpacity>
              {item.enabled ? (
                <View style={styles.timeInputs}>
                  <TextInput style={styles.timeInput} value={item.start} onChangeText={(start) => updateHours(item.day, { start })} placeholder="8:00 AM" placeholderTextColor={fixieColors.textMuted} />
                  <Text style={styles.toText}>to</Text>
                  <TextInput style={styles.timeInput} value={item.end} onChangeText={(end) => updateHours(item.day, { end })} placeholder="5:00 PM" placeholderTextColor={fixieColors.textMuted} />
                </View>
              ) : <Text style={styles.closedText}>Closed</Text>}
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Employee schedule</Text>
          <Text style={styles.sectionSubtitle}>Availability employees shared with {companyName}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
            {WEEKDAYS.map((day) => (
              <TouchableOpacity key={day} style={[styles.dayChip, selectedDay === day && styles.dayChipActive]} onPress={() => setSelectedDay(day)}>
                <Text style={[styles.dayChipText, selectedDay === day && styles.dayChipTextActive]}>{day}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {!employees.length ? (
            <View style={styles.emptyState}><Ionicons name="people-outline" size={30} color={fixieColors.goldLight} /><Text style={styles.emptyTitle}>No employees yet</Text><Text style={styles.emptyText}>Add employees to see their schedules here.</Text></View>
          ) : daySchedule.map((employee) => (
            <View key={employee.EmployeeID} style={styles.employeeRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{employee.EmployeeName?.[0] || "?"}</Text></View>
              <View style={styles.employeeCopy}>
                <Text style={styles.employeeName}>{employee.EmployeeName || "Unnamed employee"}</Text>
                {employee.windows.length ? employee.windows.map((window) => (
                  <Text key={window.id} style={styles.employeeTime}>{window.start} – {window.end}</Text>
                )) : <Text style={styles.unavailableText}>No availability published for {selectedDay}</Text>}
              </View>
              <View style={[styles.statusDot, employee.windows.length && styles.statusDotActive]} />
            </View>
          ))}
        </View>
      </ScrollView>
      <CompanyBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fixieColors.background },
  loader: { marginTop: 48 },
  content: { padding: 16, paddingBottom: 28 },
  desktopContent: { width: "100%", maxWidth: 1180, alignSelf: "center", paddingHorizontal: 28 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  eyebrow: { color: fixieColors.goldLight, fontSize: 11, fontWeight: "800", letterSpacing: 1.3 },
  title: { color: fixieColors.text, fontSize: 28, fontWeight: "900", marginTop: 4 },
  subtitle: { color: fixieColors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  headerIcon: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  summaryCard: { flex: 1, backgroundColor: fixieColors.surface, borderRadius: 17, padding: 14, borderWidth: 1, borderColor: fixieColors.border },
  summaryNumber: { color: fixieColors.goldLight, fontSize: 24, fontWeight: "900" },
  summaryLabel: { color: fixieColors.textMuted, fontSize: 10, fontWeight: "700", marginTop: 4 },
  card: { backgroundColor: fixieColors.surface, borderRadius: 22, padding: 17, borderWidth: 1, borderColor: fixieColors.border, marginBottom: 14, ...fixieShadows.card },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  sectionTitle: { color: fixieColors.text, fontSize: 18, fontWeight: "900" },
  sectionSubtitle: { color: fixieColors.textMuted, fontSize: 11, marginTop: 4, lineHeight: 16 },
  saveButton: { backgroundColor: fixieColors.gold, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  saveButtonText: { color: fixieColors.background, fontSize: 12, fontWeight: "900" },
  hoursRow: { minHeight: 56, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: fixieColors.border, paddingVertical: 8 },
  disabledRow: { opacity: 0.68 },
  dayToggle: { width: 48, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: fixieColors.backgroundAlt, borderWidth: 1, borderColor: fixieColors.border },
  dayToggleActive: { backgroundColor: fixieColors.gold, borderColor: fixieColors.gold },
  dayToggleText: { color: fixieColors.textMuted, fontWeight: "900", fontSize: 11 },
  dayToggleTextActive: { color: fixieColors.background },
  timeInputs: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, marginLeft: 12 },
  timeInput: { width: 100, color: fixieColors.text, backgroundColor: fixieColors.backgroundAlt, borderRadius: 12, borderWidth: 1, borderColor: fixieColors.border, paddingHorizontal: 10, paddingVertical: 9, textAlign: "center", fontSize: 12 },
  toText: { color: fixieColors.textMuted, fontSize: 11 },
  closedText: { flex: 1, textAlign: "right", color: fixieColors.textMuted, fontSize: 12 },
  dayStrip: { gap: 8, paddingVertical: 15 },
  dayChip: { width: 52, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: fixieColors.border, backgroundColor: fixieColors.backgroundAlt },
  dayChipActive: { backgroundColor: fixieColors.gold, borderColor: fixieColors.gold },
  dayChipText: { color: fixieColors.textSecondary, fontSize: 11, fontWeight: "800" },
  dayChipTextActive: { color: fixieColors.background },
  employeeRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: fixieColors.border },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: fixieColors.surfaceElevated },
  avatarText: { color: fixieColors.goldLight, fontSize: 16, fontWeight: "900" },
  employeeCopy: { flex: 1, marginLeft: 11 },
  employeeName: { color: fixieColors.text, fontSize: 14, fontWeight: "800" },
  employeeTime: { color: fixieColors.success, fontSize: 12, fontWeight: "700", marginTop: 3 },
  unavailableText: { color: fixieColors.textMuted, fontSize: 11, marginTop: 3 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: fixieColors.border },
  statusDotActive: { backgroundColor: fixieColors.success },
  emptyState: { alignItems: "center", paddingVertical: 28 },
  emptyTitle: { color: fixieColors.text, fontSize: 15, fontWeight: "800", marginTop: 9 },
  emptyText: { color: fixieColors.textMuted, fontSize: 11, marginTop: 4 },
});
