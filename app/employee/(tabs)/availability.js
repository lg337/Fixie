import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { fixieColors, fixieShadows } from "../../../lib/fixie-theme";
import { supabase } from "../../../lib/supabase";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EMPTY_WINDOW = { id: null, companyID: "all", day: "Mon", start: "8:00 AM", end: "4:00 PM", enabled: true };

export default function EmployeeAvailability() {
  const [loading, setLoading] = useState(true);
  const [employeeID, setEmployeeID] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [companyIDs, setCompanyIDs] = useState([]);
  const [companyMap, setCompanyMap] = useState({});
  const [form, setForm] = useState(EMPTY_WINDOW);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const storedID = await AsyncStorage.getItem("employeeID");
      if (!storedID) return;
      setEmployeeID(storedID);
      const saved = await AsyncStorage.getItem(`employeeProfessionalProfile:${storedID}`);
      const savedProfile = saved ? JSON.parse(saved) : {};
      setAvailability(savedProfile.availability || []);

      if (storedID === "demo") {
        setCompanyIDs(["1"]);
        setCompanyMap({ 1: "Oak & Wire Services" });
        return;
      }

      const { data: employee } = await supabase.from("EmployeeTable").select("CompanyIDS").eq("EmployeeID", Number(storedID)).maybeSingle();
      const ids = employee?.CompanyIDS || [];
      setCompanyIDs(ids);
      if (ids.length) {
        const { data: companies } = await supabase.from("CompanyTable").select("CompanyID, CompanyName").in("CompanyID", ids);
        const map = {};
        (companies || []).forEach((company) => { map[company.CompanyID] = company.CompanyName; });
        setCompanyMap(map);
      }
    } catch (error) {
      console.error("Availability load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const persist = async (nextAvailability) => {
    setAvailability(nextAvailability);
    const key = `employeeProfessionalProfile:${employeeID || "demo"}`;
    const saved = await AsyncStorage.getItem(key);
    const profile = saved ? JSON.parse(saved) : {};
    await AsyncStorage.setItem(key, JSON.stringify({ ...profile, availability: nextAvailability }));
  };

  const saveWindow = async () => {
    if (!form.start.trim() || !form.end.trim()) {
      Alert.alert("Add a start and end time", "A complete window helps companies understand when you are available.");
      return;
    }
    const window = { ...form, id: form.id || Date.now(), companyID: String(form.companyID), start: form.start.trim(), end: form.end.trim() };
    const next = form.id ? availability.map((item) => item.id === form.id ? window : item) : [...availability, window];
    await persist(next);
    setForm(EMPTY_WINDOW);
  };

  const moveWindow = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= availability.length) return;
    const next = [...availability];
    [next[index], next[target]] = [next[target], next[index]];
    await persist(next);
  };

  const updateWindow = async (id, updates) => {
    await persist(availability.map((item) => item.id === id ? { ...item, ...updates } : item));
  };

  const removeWindow = async (id) => {
    await persist(availability.filter((item) => item.id !== id));
    if (form.id === id) setForm(EMPTY_WINDOW);
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color={fixieColors.gold} style={styles.loader} /></SafeAreaView>;
  }

  const activeCount = availability.filter((item) => item.enabled).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>OPPORTUNITY PLANNER</Text>
          <Text style={styles.title}>Your availability</Text>
          <Text style={styles.subtitle}>Choose when each company can send you work, then adjust the order to focus on the opportunities you want most.</Text>
        </View>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>ACTIVE WINDOWS</Text>
            <Text style={styles.summaryNumber}>{activeCount}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>{activeCount ? "Ready for opportunities" : "Set your first window"}</Text>
            <Text style={styles.summaryText}>{activeCount ? `${new Set(availability.filter((item) => item.enabled).map((item) => item.day)).size} days currently open` : "Tell companies when you are open to work."}</Text>
          </View>
        </View>

        <View style={styles.weekStrip}>
          {WEEKDAYS.map((day) => {
            const count = availability.filter((item) => item.enabled && item.day === day).length;
            return (
              <View key={day} style={[styles.weekDay, count && styles.weekDayActive]}>
                <Text style={[styles.weekDayLabel, count && styles.weekDayLabelActive]}>{day.slice(0, 1)}</Text>
                <Text style={[styles.weekDayCount, count && styles.weekDayCountActive]}>{count || "–"}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Priority schedule</Text>
          <Text style={styles.sectionHint}>Top windows get priority</Text>
        </View>

        {availability.length ? availability.map((item, index) => (
          <View key={item.id} style={[styles.windowCard, !item.enabled && styles.windowDisabled]}>
            <TouchableOpacity style={styles.windowMain} onPress={() => setForm({ ...item, companyID: String(item.companyID) })}>
              <View style={styles.dayBadge}><Text style={styles.dayBadgeText}>{item.day}</Text></View>
              <View style={styles.windowCopy}>
                <Text style={styles.windowTime}>{item.start} – {item.end}</Text>
                <Text style={styles.windowCompany}>{item.companyID === "all" ? "All connected companies" : companyMap[item.companyID] || `Company #${item.companyID}`}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.windowActions}>
              <TouchableOpacity onPress={() => moveWindow(index, -1)} disabled={index === 0} style={styles.iconButton}>
                <Ionicons name="chevron-up" size={18} color={index === 0 ? fixieColors.border : fixieColors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveWindow(index, 1)} disabled={index === availability.length - 1} style={styles.iconButton}>
                <Ionicons name="chevron-down" size={18} color={index === availability.length - 1 ? fixieColors.border : fixieColors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => updateWindow(item.id, { enabled: !item.enabled })} style={styles.iconButton}>
                <Ionicons name={item.enabled ? "pause" : "play"} size={17} color={item.enabled ? fixieColors.goldLight : fixieColors.success} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeWindow(item.id)} style={styles.iconButton}>
                <Ionicons name="trash-outline" size={17} color={fixieColors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )) : (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={28} color={fixieColors.goldLight} />
            <Text style={styles.emptyTitle}>Your schedule is wide open</Text>
            <Text style={styles.emptyText}>Add a window below and assign it to a company.</Text>
          </View>
        )}

        <View style={styles.editorCard}>
          <Text style={styles.editorTitle}>{form.id ? "Adjust availability" : "Add availability"}</Text>
          <Text style={styles.fieldLabel}>Company</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
            {[{ id: "all", name: "All companies" }, ...companyIDs.map((id) => ({ id: String(id), name: companyMap[id] || `Company #${id}` }))].map((company) => (
              <TouchableOpacity key={company.id} style={[styles.option, String(form.companyID) === company.id && styles.optionActive]} onPress={() => setForm({ ...form, companyID: company.id })}>
                <Text style={[styles.optionText, String(form.companyID) === company.id && styles.optionTextActive]}>{company.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>Day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
            {WEEKDAYS.map((day) => (
              <TouchableOpacity key={day} style={[styles.dayOption, form.day === day && styles.dayOptionActive]} onPress={() => setForm({ ...form, day })}>
                <Text style={[styles.dayOptionText, form.day === day && styles.dayOptionTextActive]}>{day}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Starts</Text>
              <TextInput style={styles.input} value={form.start} onChangeText={(start) => setForm({ ...form, start })} placeholder="8:00 AM" placeholderTextColor={fixieColors.textMuted} />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Ends</Text>
              <TextInput style={styles.input} value={form.end} onChangeText={(end) => setForm({ ...form, end })} placeholder="4:00 PM" placeholderTextColor={fixieColors.textMuted} />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveWindow}>
            <Ionicons name={form.id ? "swap-horizontal" : "add-circle-outline"} size={20} color={fixieColors.background} />
            <Text style={styles.saveButtonText}>{form.id ? "Update window" : "Add window"}</Text>
          </TouchableOpacity>
          {form.id ? <TouchableOpacity style={styles.cancelButton} onPress={() => setForm(EMPTY_WINDOW)}><Text style={styles.cancelText}>Cancel editing</Text></TouchableOpacity> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fixieColors.background },
  loader: { marginTop: 40 },
  content: { padding: 16, paddingBottom: 44 },
  header: { marginBottom: 18 },
  eyebrow: { color: fixieColors.goldLight, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: fixieColors.text, fontSize: 29, fontWeight: "900", marginTop: 3 },
  subtitle: { color: fixieColors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 620 },
  summaryCard: { flexDirection: "row", alignItems: "center", backgroundColor: fixieColors.surface, borderRadius: 22, padding: 17, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  summaryLabel: { color: fixieColors.textMuted, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  summaryNumber: { color: fixieColors.goldLight, fontSize: 30, fontWeight: "900", marginTop: 2 },
  summaryDivider: { width: 1, height: 48, backgroundColor: fixieColors.border, marginHorizontal: 17 },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: fixieColors.text, fontSize: 15, fontWeight: "800" },
  summaryText: { color: fixieColors.textMuted, fontSize: 11, marginTop: 4 },
  weekStrip: { flexDirection: "row", justifyContent: "space-between", backgroundColor: fixieColors.surface, borderRadius: 18, padding: 9, borderWidth: 1, borderColor: fixieColors.border, marginTop: 13 },
  weekDay: { width: 36, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 4 },
  weekDayActive: { backgroundColor: "rgba(216,198,144,0.13)" },
  weekDayLabel: { color: fixieColors.textMuted, fontSize: 11, fontWeight: "800" },
  weekDayLabelActive: { color: fixieColors.goldLight },
  weekDayCount: { color: fixieColors.border, fontSize: 10 },
  weekDayCountActive: { color: fixieColors.success, fontWeight: "900" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 10 },
  sectionTitle: { color: fixieColors.text, fontSize: 17, fontWeight: "900" },
  sectionHint: { color: fixieColors.textMuted, fontSize: 10 },
  windowCard: { backgroundColor: fixieColors.surface, borderRadius: 17, borderWidth: 1, borderColor: fixieColors.border, padding: 11, marginBottom: 9, ...fixieShadows.card },
  windowDisabled: { opacity: 0.48 },
  windowMain: { flexDirection: "row", alignItems: "center" },
  dayBadge: { width: 44, height: 40, borderRadius: 12, backgroundColor: fixieColors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  dayBadgeText: { color: fixieColors.goldLight, fontSize: 11, fontWeight: "900" },
  windowCopy: { flex: 1, marginLeft: 11 },
  windowTime: { color: fixieColors.text, fontSize: 14, fontWeight: "800" },
  windowCompany: { color: fixieColors.textMuted, fontSize: 11, marginTop: 3 },
  windowActions: { flexDirection: "row", justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: fixieColors.border, marginTop: 10, paddingTop: 7 },
  iconButton: { width: 36, height: 30, alignItems: "center", justifyContent: "center" },
  emptyCard: { alignItems: "center", backgroundColor: fixieColors.surface, borderRadius: 18, borderWidth: 1, borderColor: fixieColors.border, padding: 22 },
  emptyTitle: { color: fixieColors.text, fontSize: 14, fontWeight: "800", marginTop: 9 },
  emptyText: { color: fixieColors.textMuted, fontSize: 11, marginTop: 4 },
  editorCard: { backgroundColor: fixieColors.surface, borderRadius: 22, borderWidth: 1, borderColor: fixieColors.border, padding: 17, marginTop: 20, ...fixieShadows.card },
  editorTitle: { color: fixieColors.text, fontSize: 18, fontWeight: "900", marginBottom: 16 },
  fieldLabel: { color: fixieColors.text, fontSize: 11, fontWeight: "800", marginBottom: 7 },
  options: { gap: 8, paddingBottom: 15 },
  option: { borderRadius: 15, borderWidth: 1, borderColor: fixieColors.border, backgroundColor: fixieColors.backgroundAlt, paddingHorizontal: 11, paddingVertical: 8 },
  optionActive: { borderColor: fixieColors.gold, backgroundColor: "rgba(216,198,144,0.12)" },
  optionText: { color: fixieColors.textMuted, fontSize: 11, fontWeight: "700" },
  optionTextActive: { color: fixieColors.goldLight },
  dayOption: { width: 48, height: 38, borderRadius: 12, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  dayOptionActive: { backgroundColor: fixieColors.gold, borderColor: fixieColors.gold },
  dayOptionText: { color: fixieColors.textSecondary, fontSize: 11, fontWeight: "800" },
  dayOptionTextActive: { color: fixieColors.background },
  timeRow: { flexDirection: "row", gap: 10 },
  timeField: { flex: 1 },
  input: { backgroundColor: fixieColors.backgroundAlt, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12, borderWidth: 1, borderColor: fixieColors.border, color: fixieColors.text, fontSize: 14 },
  saveButton: { backgroundColor: fixieColors.gold, borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, marginTop: 17 },
  saveButtonText: { color: fixieColors.background, fontWeight: "900" },
  cancelButton: { alignItems: "center", paddingVertical: 12 },
  cancelText: { color: fixieColors.textMuted, fontSize: 12 },
});
