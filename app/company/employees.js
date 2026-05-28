import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";
import { supabase } from "../../lib/supabase";
import CompanyBottomNav from "./components/CompanyBottomNav";

export default function CompanyEmployees() {
  const [loading, setLoading] = useState(true);
  const [companyID, setCompanyID] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [employeeUsername, setEmployeeUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPeople();
    }, [])
  );

  const loadPeople = async () => {
    try {
      setLoading(true);
      const storedCompanyID = await AsyncStorage.getItem("companyID");
      if (!storedCompanyID) {
        router.replace("/company/login");
        return;
      }
      if (storedCompanyID === "demo") {
        setLoading(false);
        return;
      }

      const parsedCompanyID = Number(storedCompanyID);
      setCompanyID(parsedCompanyID);

      const { data: employeeData, error: employeeError } = await supabase
        .from("EmployeeTable")
        .select("*")
        .contains("CompanyIDS", [parsedCompanyID])
        .order("EmployeeName", { ascending: true });

      if (employeeError) throw employeeError;
      setEmployees(employeeData || []);
    } catch (error) {
      console.log("Employees page error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const addEmployeeToCompany = async () => {
    try {
      if (!employeeUsername.trim()) {
        Alert.alert("Missing info", "Enter the employee username you want to add.");
        return;
      }

      setSubmitting(true);

      const { data: employee, error: employeeError } = await supabase
        .from("EmployeeTable")
        .select("EmployeeID, EmployeeName, CompanyIDS")
        .eq("EmployeeUsername", employeeUsername.trim())
        .maybeSingle();

      if (employeeError) throw employeeError;

      if (!employee) {
        Alert.alert("Not found", "No employee account matches that username.");
        return;
      }

      const companyIds = employee.CompanyIDS || [];
      if (companyIds.includes(companyID)) {
        Alert.alert("Already added", "That employee is already linked to this company.");
        return;
      }

      const { error: updateError } = await supabase
        .from("EmployeeTable")
        .update({ CompanyIDS: [...companyIds, companyID] })
        .eq("EmployeeID", employee.EmployeeID);

      if (updateError) throw updateError;

      setEmployeeUsername("");
      setModalVisible(false);
      loadPeople();
    } catch (error) {
      Alert.alert("Error", error.message || "Could not add employee.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderPerson = ({ item }) => (
    <View style={styles.personCard}>
      <Text style={styles.personName}>{item.EmployeeName || "Unnamed Employee"}</Text>
      {item.EmployeeUsername ? <Text style={styles.subText}>@{item.EmployeeUsername}</Text> : null}
      {item.EmployeeEmail ? <Text style={styles.subText}>{item.EmployeeEmail}</Text> : null}
      {item.EmployeePhone ? <Text style={styles.subText}>{String(item.EmployeePhone)}</Text> : null}
      {item.EmployeeID ? <Text style={styles.subText}>Employee ID: {item.EmployeeID}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={20} color={fixieColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employees</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.iconButton}>
          <Ionicons name="add" size={20} color={fixieColors.goldLight} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={fixieColors.gold} />
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={
            <>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Team Members</Text>
                  <Text style={styles.sectionSubtitle}>Add employees by username after they create an employee account.</Text>
                </View>
                <TouchableOpacity style={styles.addEmployeeButton} onPress={() => setModalVisible(true)}>
                  <Text style={styles.addEmployeeButtonText}>Add Employee</Text>
                </TouchableOpacity>
              </View>
              {employees.length === 0 ? <Text style={styles.emptyText}>No employees have been added yet.</Text> : <FlatList data={employees} keyExtractor={(item) => String(item.EmployeeID)} renderItem={renderPerson} scrollEnabled={false} />}
            </>
          }
          data={[]}
          renderItem={null}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Employee</Text>
            <Text style={styles.modalSubtitle}>Enter an employee username to link them to this company.</Text>
            <TextInput
              style={styles.input}
              value={employeeUsername}
              onChangeText={setEmployeeUsername}
              placeholder="Employee username"
              placeholderTextColor={fixieColors.textMuted}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.primaryButton} onPress={addEmployeeToCompany} disabled={submitting}>
              <Text style={styles.primaryButtonText}>{submitting ? "Adding..." : "Add Employee"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setModalVisible(false)} disabled={submitting}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
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
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: fixieColors.text, marginBottom: 10 },
  sectionSubtitle: { fontSize: 13, color: fixieColors.textSecondary, marginTop: -4 },
  addEmployeeButton: { backgroundColor: fixieColors.gold, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  addEmployeeButtonText: { color: fixieColors.background, fontWeight: "800", fontSize: 12 },
  personCard: { backgroundColor: fixieColors.surface, padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  personName: { fontSize: 16, fontWeight: "800", color: fixieColors.text },
  subText: { fontSize: 13, color: fixieColors.textSecondary, marginTop: 4 },
  emptyText: { fontSize: 14, color: fixieColors.textMuted, marginBottom: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: fixieColors.overlay },
  modalCard: { backgroundColor: fixieColors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  modalTitle: { fontSize: 22, fontWeight: "800", color: fixieColors.text, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, lineHeight: 20, color: fixieColors.textSecondary, marginBottom: 14 },
  input: { backgroundColor: fixieColors.backgroundAlt, borderWidth: 1, borderColor: fixieColors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: fixieColors.text, marginBottom: 12 },
  primaryButton: { backgroundColor: fixieColors.gold, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  primaryButtonText: { color: fixieColors.background, fontWeight: "800", fontSize: 16 },
  secondaryButton: { alignItems: "center", paddingTop: 14 },
  secondaryButtonText: { color: fixieColors.textSecondary, fontSize: 15 },
});
