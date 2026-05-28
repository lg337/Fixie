import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";
import { supabase } from "../../lib/supabase";
import CompanyBottomNav from "./components/CompanyBottomNav";

const handleLogout = async () => {
  await AsyncStorage.removeItem("companyID");
  router.replace("/");
};

const STATUS_OPTIONS = [
  { key: "lead", label: "Lead" },
  { key: "new_customer", label: "New Customer" },
  { key: "active_customer", label: "Active Customer" },
  { key: "past_customer", label: "Past Customer" },
];

const crmStatusColors = {
  lead: fixieColors.info,
  new_customer: fixieColors.pending,
  active_customer: fixieColors.gold,
  past_customer: fixieColors.success,
};

const normalizeRelationship = (value) => {
  const normalized = {
    new: "lead",
    pending: "new_customer",
    in_progress: "active_customer",
    completed: "past_customer",
    Lead: "lead",
    Customer: "active_customer",
    "New Customer": "new_customer",
    "Active Customer": "active_customer",
    "Past Client": "past_customer",
    "Past Customer": "past_customer",
    VIP: "active_customer",
    new_lead: "lead",
    new_customer: "new_customer",
    active_customer: "active_customer",
    past_client: "past_customer",
    past_customer: "past_customer",
    other: "lead",
  };

  return normalized[value] || "lead";
};

export default function CompanyCRM() {
  const [loading, setLoading] = useState(true);
  const [crmRecords, setCrmRecords] = useState([]);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [savingNotesId, setSavingNotesId] = useState(null);
  const [companyID, setCompanyID] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRelationship, setNewRelationship] = useState("lead");
  const [newNotes, setNewNotes] = useState("");

  const loadCRM = async () => {
    try {
      setLoading(true);
      const storedCompanyID = await AsyncStorage.getItem("companyID");
      if (!storedCompanyID) {
        router.replace("/company/login");
        return;
      }
      if (storedCompanyID === "demo") {
        setCompanyName("Demo Company");
        setCrmRecords([]);
        setLoading(false);
        return;
      }
      const parsedCompanyID = Number(storedCompanyID);
      setCompanyID(parsedCompanyID);
      const { data: companyData } = await supabase.from("CompanyTable").select("CompanyName").eq("CompanyID", parsedCompanyID).single();
      setCompanyName(companyData?.CompanyName || "");
      const { data, error } = await supabase.from("CRMTable").select("*").eq("CompanyID", parsedCompanyID).order("created_at", { ascending: false });
      if (error) throw error;
      setCrmRecords(data || []);
      setNoteDrafts(
        (data || []).reduce((acc, record) => {
          acc[record.CRMID] = record.Notes || "";
          return acc;
        }, {})
      );
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadCRM(); }, []));

  const saveContactField = async (crmID, field, value) => {
    await supabase.from("CRMTable").update({ [field]: value }).eq("CRMID", crmID);
  };

  const saveNotes = async (crmID, notes) => {
    try {
      setSavingNotesId(crmID);
      const { error } = await supabase.from("CRMTable").update({ Notes: notes }).eq("CRMID", crmID);
      if (error) throw error;
      setCrmRecords((current) =>
        current.map((record) => (record.CRMID === crmID ? { ...record, Notes: notes } : record))
      );
    } catch (error) {
      Alert.alert("Error", error.message || "Could not save notes.");
    } finally {
      setSavingNotesId(null);
    }
  };

  const updateRelationship = async (crmID, nextRelationship) => {
    await supabase.from("CRMTable").update({ Relationship: nextRelationship }).eq("CRMID", crmID);
    loadCRM();
  };

  const addManualContact = async () => {
    try {
      if (!newName.trim()) {
        Alert.alert("Missing info", "Please enter a contact name.");
        return;
      }
      const { error } = await supabase.from("CRMTable").insert([{ CompanyID: companyID, ContactName: newName.trim(), ContactPhone: newPhone.trim(), ContactEmail: newEmail.trim(), Relationship: newRelationship.trim() || "lead", Notes: newNotes.trim(), SourceType: "manual" }]);
      if (error) throw error;
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewRelationship("lead");
      setNewNotes("");
      setModalVisible(false);
      loadCRM();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const getStatusLabel = (value) => {
    const labels = STATUS_OPTIONS.reduce((acc, status) => {
      acc[status.key] = status.label;
      return acc;
    }, {});

    return labels[normalizeRelationship(value)] || "Lead";
  };

  const getStatusColor = (value) => {
    return crmStatusColors[normalizeRelationship(value)] || crmStatusColors.lead;
  };

  const isStatusActive = (relationship, statusKey) => {
    return normalizeRelationship(relationship) === statusKey;
  };

  const renderRow = ({ item }) => (
    <View style={styles.rowCard}>
      <View style={styles.gridRow}>
        <View style={styles.cell}>
          <Text style={styles.cellHeader}>Customer</Text>
          <TextInput
            style={styles.inlineInput}
            defaultValue={item.ContactName || ""}
            placeholder="No name"
            placeholderTextColor={fixieColors.textMuted}
            onEndEditing={(e) => saveContactField(item.CRMID, "ContactName", e.nativeEvent.text)}
          />
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellHeader}>Phone</Text>
          <TextInput
            style={styles.inlineInput}
            defaultValue={item.ContactPhone || ""}
            placeholder="-"
            placeholderTextColor={fixieColors.textMuted}
            keyboardType="phone-pad"
            onEndEditing={(e) => saveContactField(item.CRMID, "ContactPhone", e.nativeEvent.text)}
          />
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellHeader}>Email</Text>
          <TextInput
            style={styles.inlineInput}
            defaultValue={item.ContactEmail || ""}
            placeholder="-"
            placeholderTextColor={fixieColors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            onEndEditing={(e) => saveContactField(item.CRMID, "ContactEmail", e.nativeEvent.text)}
          />
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellHeader}>Status</Text>
          <View style={[styles.relationshipBadge, { backgroundColor: getStatusColor(item.Relationship) }]}>
            <Text style={styles.relationshipText}>{getStatusLabel(item.Relationship)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statusRow}>
        {STATUS_OPTIONS.map((status) => {
          const active = isStatusActive(item.Relationship, status.key);
          return (
            <TouchableOpacity
              key={status.key}
              style={[
                styles.statusPill,
                active ? { backgroundColor: crmStatusColors[status.key] || fixieColors.gold } : styles.statusPillIdle,
              ]}
              onPress={() => {
                if (!active) updateRelationship(item.CRMID, status.key);
              }}
            >
              <Text style={[styles.statusPillText, active && styles.statusPillTextActive]}>{status.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.notesSection}>
        <Text style={styles.cellHeader}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          value={noteDrafts[item.CRMID] ?? ""}
          placeholder="Write notes here..."
          placeholderTextColor={fixieColors.textMuted}
          onChangeText={(value) => setNoteDrafts((current) => ({ ...current, [item.CRMID]: value }))}
        />
        <TouchableOpacity
          style={[styles.noteSaveButton, savingNotesId === item.CRMID && styles.noteSaveButtonDisabled]}
          onPress={() => saveNotes(item.CRMID, noteDrafts[item.CRMID] ?? "")}
          disabled={savingNotesId === item.CRMID}
        >
          <Text style={styles.noteSaveButtonText}>{savingNotesId === item.CRMID ? "Saving..." : "Save Notes"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={20} color={fixieColors.text} /></TouchableOpacity>
        <Text style={styles.title}>CRM</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.iconButton}><Ionicons name="log-out-outline" size={20} color={fixieColors.error} /></TouchableOpacity>
      </View>

      <View style={styles.topBar}>
        <View>
          <Text style={styles.pageTitle}>{companyName ? `${companyName} CRM` : "Company CRM"}</Text>
          <Text style={styles.subtitle}>Manage customer contacts and notes</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color={fixieColors.background} />
        </TouchableOpacity>
      </View>

      {loading ? <View style={styles.centered}><ActivityIndicator size="large" color={fixieColors.gold} /></View> : <FlatList data={crmRecords} keyExtractor={(item) => String(item.CRMID)} renderItem={renderRow} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.emptyText}>No CRM contacts yet. Tap the plus button to add one.</Text>} />}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalWrap}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add CRM Contact</Text>
              {[
                ["Customer name", newName, setNewName, {}],
                ["Phone number", newPhone, setNewPhone, {}],
                ["Email", newEmail, setNewEmail, { autoCapitalize: "none" }],
              ].map(([placeholder, value, onChangeText, extra]) => (
                <TextInput key={placeholder} style={styles.input} placeholder={placeholder} placeholderTextColor={fixieColors.textMuted} value={value} onChangeText={onChangeText} {...extra} />
              ))}
              <Text style={styles.cellHeader}>Status</Text>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((status) => {
                  const active = newRelationship === status.key;
                  return (
                    <TouchableOpacity
                      key={status.key}
                      style={[
                        styles.statusPill,
                        active ? { backgroundColor: crmStatusColors[status.key] || fixieColors.gold } : styles.statusPillIdle,
                      ]}
                      onPress={() => setNewRelationship(status.key)}
                    >
                      <Text style={[styles.statusPillText, active && styles.statusPillTextActive]}>{status.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput style={[styles.input, styles.largeInput]} placeholder="Notes" placeholderTextColor={fixieColors.textMuted} value={newNotes} onChangeText={setNewNotes} multiline />
              <TouchableOpacity style={styles.saveButton} onPress={addManualContact}><Text style={styles.saveButtonText}>Add Contact</Text></TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </ScrollView>
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
  title: { fontSize: 24, fontWeight: "800", color: fixieColors.text, flex: 1, textAlign: "center" },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pageTitle: { fontSize: 22, fontWeight: "800", color: fixieColors.text },
  subtitle: { fontSize: 14, color: fixieColors.textSecondary, marginTop: 4 },
  addButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: fixieColors.gold, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  rowCard: { backgroundColor: fixieColors.surface, borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  gridRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  cell: { width: "50%", paddingRight: 8, marginBottom: 10 },
  cellHeader: { fontSize: 12, fontWeight: "700", color: fixieColors.textMuted, textTransform: "uppercase", marginBottom: 4 },
  cellValue: { fontSize: 15, color: fixieColors.text, fontWeight: "500" },
  inlineInput: { backgroundColor: fixieColors.backgroundAlt, borderWidth: 1, borderColor: fixieColors.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, color: fixieColors.text },
  relationshipBadge: { alignSelf: "flex-start", backgroundColor: fixieColors.gold, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  relationshipText: { color: fixieColors.background, fontSize: 12, fontWeight: "800" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusPillIdle: { backgroundColor: fixieColors.backgroundAlt },
  statusPillText: { fontSize: 11, fontWeight: "700", color: fixieColors.textSecondary },
  statusPillTextActive: { color: fixieColors.background },
  notesSection: { borderTopWidth: 1, borderTopColor: fixieColors.border, paddingTop: 12 },
  notesInput: { backgroundColor: fixieColors.backgroundAlt, borderWidth: 1, borderColor: fixieColors.border, borderRadius: 14, minHeight: 80, padding: 10, textAlignVertical: "top", fontSize: 14, color: fixieColors.text },
  noteSaveButton: { alignSelf: "flex-start", marginTop: 10, backgroundColor: fixieColors.gold, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  noteSaveButtonDisabled: { opacity: 0.7 },
  noteSaveButtonText: { color: fixieColors.background, fontSize: 13, fontWeight: "800" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: fixieColors.textMuted, fontSize: 14, textAlign: "center", marginTop: 30, paddingHorizontal: 20 },
  modalOverlay: { flex: 1, backgroundColor: fixieColors.overlay, justifyContent: "center", padding: 20 },
  modalWrap: { flexGrow: 1, justifyContent: "center" },
  modalCard: { backgroundColor: fixieColors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  modalTitle: { fontSize: 22, fontWeight: "800", color: fixieColors.text, marginBottom: 16 },
  input: { backgroundColor: fixieColors.backgroundAlt, borderWidth: 1, borderColor: fixieColors.border, borderRadius: 14, padding: 12, marginBottom: 12, color: fixieColors.text },
  largeInput: { minHeight: 110, textAlignVertical: "top" },
  saveButton: { backgroundColor: fixieColors.gold, paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 6 },
  saveButtonText: { color: fixieColors.background, fontWeight: "800", fontSize: 16 },
  cancelButton: { alignItems: "center", paddingTop: 14 },
  cancelText: { color: fixieColors.textSecondary, fontSize: 15 },
});
