import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import FixieLogo from "../../../components/FixieLogo";
import { EMAIL_ALLOWED_TEXT, PHONE_ALLOWED_TEXT, formatPhoneInput, isValidEmail, isValidPhone, normalizePhoneDigits } from "../../../lib/auth-validation";
import { fixieColors, fixieShadows } from "../../../lib/fixie-theme";
import { supabase } from "../../../lib/supabase";

function ProfileField({ icon, label, value }) {
  return (
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={18} color={fixieColors.goldLight} style={styles.fieldIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

function EditableField({ icon, label, value, onChangeText, placeholder, keyboardType }) {
  return (
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={18} color={fixieColors.goldLight} style={styles.fieldIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={fixieColors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize="none"
        />
      </View>
    </View>
  );
}

export default function EmployeeProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employeeID, setEmployeeID] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeePhone, setEmployeePhone] = useState("");
  const [jobHistory, setJobHistory] = useState([]);
  const [companyMap, setCompanyMap] = useState({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const storedID = await AsyncStorage.getItem("employeeID");
      if (!storedID) return;

      const parsedID = Number(storedID);
      setEmployeeID(parsedID);

      const { data: emp } = await supabase.from("EmployeeTable").select("*").eq("EmployeeID", parsedID).maybeSingle();
      if (emp) {
        setEmployee(emp);
        setEmployeeName(emp.EmployeeName || "");
        setEmployeeEmail(emp.EmployeeEmail || "");
        setEmployeePhone(emp.EmployeePhone ? formatPhoneInput(String(emp.EmployeePhone)) : "");
      }

      const companyIDs = emp?.CompanyIDS || [];
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

      const { data: completedJobs } = await supabase
        .from("RequestTable")
        .select("*")
        .eq("AssignedEmployeeID", parsedID)
        .eq("RequestStatus", "completed")
        .order("RequestID", { ascending: false });

      if (completedJobs) setJobHistory(completedJobs);
    } catch (e) {
      console.error("Profile load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      if (!employeeID || isNaN(employeeID)) {
        Alert.alert("Error", "Cannot update profile. Please sign in.");
        return;
      }

      if (employeeEmail.trim() && !isValidEmail(employeeEmail)) {
        Alert.alert("Error", EMAIL_ALLOWED_TEXT);
        return;
      }

      if (employeePhone.trim() && !isValidPhone(employeePhone)) {
        Alert.alert("Error", PHONE_ALLOWED_TEXT);
        return;
      }

      setSaving(true);
      const { data, error } = await supabase
        .from("EmployeeTable")
        .update({
          EmployeeName: employeeName,
          EmployeePhone: employeePhone.trim() ? Number(normalizePhoneDigits(employeePhone)) : null,
          EmployeeEmail: employeeEmail.trim() || null,
        })
        .eq("EmployeeID", employeeID)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        Alert.alert("Error", "Profile update failed. Please sign out and sign back in.");
        return;
      }

      Alert.alert("Success", "Profile updated.");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await AsyncStorage.removeItem("employeeID");
    router.replace("/");
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
            <View style={styles.topBar}>
              <Text style={styles.header}>Profile</Text>
              <TouchableOpacity onPress={handleSignOut} style={styles.iconButton}>
                <Ionicons name="log-out-outline" size={22} color={fixieColors.error} />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarContainer}>
              <FixieLogo size={78} />
              <Text style={styles.profileName}>{employeeName || "Employee"}</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.input} value={employeeName} onChangeText={setEmployeeName} placeholder="Enter your name" placeholderTextColor={fixieColors.textMuted} />

              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={employeePhone} onChangeText={(v) => setEmployeePhone(formatPhoneInput(v))} placeholder="Enter your phone" placeholderTextColor={fixieColors.textMuted} keyboardType="phone-pad" />

              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={employeeEmail} onChangeText={setEmployeeEmail} placeholder="Enter your email" placeholderTextColor={fixieColors.textMuted} keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.label}>Username</Text>
              <View style={[styles.input, { backgroundColor: fixieColors.surfaceElevated }]}>
                <Text style={{ color: fixieColors.textSecondary, fontSize: 15 }}>{employee?.EmployeeUsername || "—"}</Text>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Profile"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.historyHeader}>
              <Ionicons name="business" size={18} color={fixieColors.goldLight} />
              <Text style={styles.historyTitle}>Companies Joined</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{employee?.CompanyIDS?.length || 0}</Text>
              </View>
            </View>

            {employee?.CompanyIDS?.length > 0 ? employee.CompanyIDS.map((id) => (
              <View key={String(id)} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyJobTitle}>{companyMap[id] || `Company #${id}`}</Text>
                  <Text style={styles.historyCompany}>Added to your employee profile</Text>
                </View>
                <Ionicons name="business-outline" size={24} color={fixieColors.goldLight} />
              </View>
            )) : <Text style={styles.emptyText}>No companies have added you yet.</Text>}

            <View style={styles.historyHeader}>
              <Ionicons name="time" size={18} color={fixieColors.goldLight} />
              <Text style={styles.historyTitle}>Completed Jobs</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{jobHistory.length}</Text>
              </View>
            </View>

            {jobHistory.length === 0 ? <Text style={styles.emptyText}>No completed jobs yet.</Text> : jobHistory.map((job) => (
              <View key={String(job.RequestID)} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyJobTitle}>{job.RequestNotes || job.RequestTitle || "Untitled"}</Text>
                  <Text style={styles.historyCompany}>{companyMap[job.CompanyID] || `Company #${job.CompanyID}`}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color={fixieColors.success} />
              </View>
            ))}

            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color={fixieColors.background} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
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
  scrollContent: { padding: 16, paddingBottom: 40 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  header: { fontSize: 28, fontWeight: "800", color: fixieColors.text },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  avatarContainer: { alignItems: "center", marginBottom: 20 },
  profileName: { fontSize: 22, fontWeight: "800", color: fixieColors.text, marginTop: 12 },
  formCard: { backgroundColor: fixieColors.surface, borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  label: { fontSize: 14, fontWeight: "700", marginBottom: 8, color: fixieColors.text },
  input: { backgroundColor: fixieColors.backgroundAlt, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 16, borderWidth: 1, borderColor: fixieColors.border, color: fixieColors.text, fontSize: 15 },
  fieldRow: { flexDirection: "row", alignItems: "center" },
  fieldIcon: { marginRight: 12, width: 24 },
  fieldLabel: { fontSize: 12, color: fixieColors.textMuted },
  fieldValue: { fontSize: 15, color: fixieColors.text, fontWeight: "500" },
  saveBtn: { backgroundColor: fixieColors.gold, paddingVertical: 15, borderRadius: 16, alignItems: "center", marginTop: 4, ...fixieShadows.glow },
  saveBtnText: { color: fixieColors.background, fontSize: 16, fontWeight: "800" },
  historyHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  historyTitle: { fontSize: 18, fontWeight: "800", color: fixieColors.text, marginLeft: 8, flex: 1 },
  badge: { backgroundColor: fixieColors.gold, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: fixieColors.background, fontSize: 13, fontWeight: "800" },
  historyCard: { backgroundColor: fixieColors.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: fixieColors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...fixieShadows.card },
  historyLeft: { flex: 1, paddingRight: 12 },
  historyJobTitle: { color: fixieColors.text, fontWeight: "800" },
  historyCompany: { color: fixieColors.textSecondary, marginTop: 4 },
  emptyText: { color: fixieColors.textMuted, marginBottom: 12 },
  signOutBtn: { marginTop: 8, backgroundColor: fixieColors.gold, borderRadius: 16, paddingVertical: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  signOutText: { color: fixieColors.background, fontWeight: "800" },
});
