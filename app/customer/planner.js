import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";
import CustomerBottomNav from "./components/CustomerBottomNav";

const TEMPLATE_PRESETS = [
  {
    key: "blank",
    label: "Blank",
    icon: "document-outline",
    title: "",
    overview: "",
    materials: "",
    budget: "",
    timeline: "",
  },
  {
    key: "bathroom",
    label: "Bathroom",
    icon: "water-outline",
    title: "Bathroom Remodel",
    overview: "Project goal:\nBathroom size:\nFixtures to replace:\nPlumbing changes:\nTile or flooring notes:\nQuestions for contractor:",
    materials: "Vanity:\nSink/faucet:\nToilet:\nShower/tub:\nTile/flooring:\nLighting/vent fan:\nCustomer-provided materials:",
    budget: "Fixture budget:\nTile/flooring budget:\nLabor estimate:\nPermit or disposal fees:\nContingency:\nTarget total:",
    timeline: "Quote deadline:\nMaterials needed by:\nPreferred start date:\nTarget finish date:\nInspection/walkthrough:",
  },
  {
    key: "kitchen",
    label: "Kitchen",
    icon: "restaurant-outline",
    title: "Kitchen Project",
    overview: "Project goal:\nKitchen area:\nCabinets/counters/appliances affected:\nElectrical or plumbing changes:\nMust-haves:\nQuestions for contractor:",
    materials: "Cabinets/hardware:\nCountertops:\nBacksplash:\nSink/faucet:\nLighting:\nAppliances:\nCustomer-provided materials:",
    budget: "Cabinet/counter budget:\nMaterials estimate:\nLabor estimate:\nDelivery or disposal:\nContingency:\nTarget total:",
    timeline: "Measurements date:\nOrder deadline:\nPreferred start date:\nDays kitchen can be unavailable:\nTarget finish date:",
  },
  {
    key: "plumbing",
    label: "Plumbing",
    icon: "construct-outline",
    title: "Plumbing Repair",
    overview: "Issue:\nLocation:\nWhen it started:\nLeaks or water damage:\nPhotos/videos to attach:\nQuestions for contractor:",
    materials: "Pipes/fittings:\nFixture parts:\nValves:\nAccess panels:\nCleanup materials:\nUnknown parts to confirm:",
    budget: "Diagnostic fee:\nParts estimate:\nLabor estimate:\nEmergency fee:\nCleanup/repair allowance:\nTarget total:",
    timeline: "Urgency:\nBest access window:\nWater shutoff needed:\nPreferred repair date:\nFollow-up check:",
  },
  {
    key: "electrical",
    label: "Electrical",
    icon: "flash-outline",
    title: "Electrical Work",
    overview: "Project or issue:\nLocation:\nBreaker/panel notes:\nOutlets, lights, or fixtures involved:\nSafety concerns:\nQuestions for contractor:",
    materials: "Fixtures:\nSwitches/outlets:\nBreaker or panel parts:\nWire/conduit:\nMounting hardware:\nCustomer-provided materials:",
    budget: "Parts estimate:\nLabor estimate:\nPermit/inspection:\nFixture budget:\nContingency:\nTarget total:",
    timeline: "Quote deadline:\nPower shutoff window:\nPreferred start date:\nInspection date:\nTarget finish date:",
  },
  {
    key: "painting",
    label: "Painting",
    icon: "color-palette-outline",
    title: "Painting Project",
    overview: "Rooms/areas:\nWall condition:\nColors/finish:\nTrim, doors, or cabinets included:\nPrep needed:\nQuestions for contractor:",
    materials: "Paint colors:\nPrimer:\nTrim paint:\nPatch/repair supplies:\nTape/drop cloths:\nCustomer-provided materials:",
    budget: "Paint/materials estimate:\nPrep/repair labor:\nPainting labor:\nCleanup:\nContingency:\nTarget total:",
    timeline: "Color decision date:\nPrep date:\nPreferred start date:\nDrying/access constraints:\nTarget finish date:",
  },
  {
    key: "landscaping",
    label: "Landscape",
    icon: "leaf-outline",
    title: "Landscaping Project",
    overview: "Outdoor area:\nProject goal:\nDrainage or grading concerns:\nPlants/hardscape ideas:\nMaintenance expectations:\nQuestions for contractor:",
    materials: "Plants/sod/seed:\nMulch/soil/stone:\nPavers/edging:\nIrrigation parts:\nLighting:\nCustomer-provided materials:",
    budget: "Materials estimate:\nLabor estimate:\nDelivery fees:\nMaintenance allowance:\nContingency:\nTarget total:",
    timeline: "Design decision date:\nMaterials delivery:\nPreferred start date:\nWeather constraints:\nTarget finish date:",
  },
  {
    key: "general",
    label: "General",
    icon: "hammer-outline",
    title: "Home Repair Project",
    overview: "Project goal:\nRoom or area:\nMeasurements:\nExisting problem:\nMust-haves:\nQuestions for contractor:",
    materials: "Materials needed:\nTools or rentals:\nItems already on-site:\nItems contractor should source:\nNotes:",
    budget: "Materials estimate:\nLabor estimate:\nFees or permits:\nCleanup/disposal:\nContingency:\nTarget total:",
    timeline: "Quote deadline:\nPreferred start date:\nAccess windows:\nMilestones:\nTarget finish date:",
  },
];

const DEFAULT_PLAN = {
  title: "",
  overview: "",
  materials: "",
  budget: "",
  timeline: "",
};

const DEFAULT_TEMPLATE_FORM = {
  name: "",
  workType: "",
  title: "",
  overview: "",
  materials: "",
  budget: "",
  timeline: "",
};

export default function CustomerPlanner() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerID, setCustomerID] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState("blank");
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateFormMode, setTemplateFormMode] = useState("save");
  const [templateForm, setTemplateForm] = useState(DEFAULT_TEMPLATE_FORM);

  const storageKey = useMemo(() => `fixie-project-plan:${customerID || "guest"}`, [customerID]);
  const templateStorageKey = useMemo(() => `fixie-project-templates:${customerID || "guest"}`, [customerID]);
  const availableTemplates = useMemo(
    () => [
      ...TEMPLATE_PRESETS,
      ...customTemplates.map((template) => ({
        ...template,
        icon: template.icon || "bookmark-outline",
        custom: true,
      })),
    ],
    [customTemplates]
  );
  const activeCustomTemplate = useMemo(
    () => customTemplates.find((template) => template.key === activeTemplate),
    [activeTemplate, customTemplates]
  );

  const loadPlan = async () => {
    try {
      setLoading(true);
      const storedID = await AsyncStorage.getItem("customerID");

      if (!storedID) {
        router.replace("/");
        return;
      }

      setCustomerID(storedID);
      const [savedPlan, savedTemplates] = await Promise.all([
        AsyncStorage.getItem(`fixie-project-plan:${storedID}`),
        AsyncStorage.getItem(`fixie-project-templates:${storedID}`),
      ]);

      if (savedTemplates) {
        setCustomTemplates(JSON.parse(savedTemplates));
      } else {
        setCustomTemplates([]);
      }

      if (savedPlan) {
        const parsedPlan = JSON.parse(savedPlan);
        setPlan({ ...DEFAULT_PLAN, ...parsedPlan.plan });
        setActiveTemplate(parsedPlan.template || "blank");
      } else {
        setPlan(DEFAULT_PLAN);
        setActiveTemplate("blank");
      }
    } catch (error) {
      console.log("Planner load error:", error);
      setPlan(DEFAULT_PLAN);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPlan();
    }, [])
  );

  const savePlan = async (nextPlan = plan, nextTemplate = activeTemplate) => {
    try {
      setSaving(true);
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify({
          template: nextTemplate,
          plan: nextPlan,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (_error) {
      Alert.alert("Error", "Could not save your project plan.");
    } finally {
      setSaving(false);
    }
  };

  const updatePlanField = (field, value) => {
    const nextPlan = { ...plan, [field]: value };
    setPlan(nextPlan);
    savePlan(nextPlan);
  };

  const applyTemplate = (template) => {
    const nextPlan = {
      title: template.title,
      overview: template.overview,
      materials: template.materials,
      budget: template.budget,
      timeline: template.timeline,
    };

    setActiveTemplate(template.key);
    setPlan(nextPlan);
    savePlan(nextPlan, template.key);
  };

  const openSaveTemplate = () => {
    setTemplateFormMode("save");
    setTemplateForm({
      name: plan.title ? `${plan.title} Template` : "",
      workType: "",
      ...plan,
    });
    setTemplateModalVisible(true);
  };

  const openNewTemplate = () => {
    setTemplateFormMode("new");
    setTemplateForm(DEFAULT_TEMPLATE_FORM);
    setTemplateModalVisible(true);
  };

  const updateTemplateForm = (field, value) => {
    setTemplateForm((current) => ({ ...current, [field]: value }));
  };

  const saveCustomTemplate = async () => {
    const name = templateForm.name.trim();
    const workType = templateForm.workType.trim();

    if (!name) {
      Alert.alert("Template name required", "Add a name so you can find this template later.");
      return;
    }

    const nextTemplate = {
      key: `custom-${Date.now()}`,
      label: name,
      workType,
      icon: "bookmark-outline",
      title: templateForm.title,
      overview: templateForm.overview,
      materials: templateForm.materials,
      budget: templateForm.budget,
      timeline: templateForm.timeline,
    };
    const nextTemplates = [nextTemplate, ...customTemplates];

    setCustomTemplates(nextTemplates);
    await AsyncStorage.setItem(templateStorageKey, JSON.stringify(nextTemplates));
    setTemplateModalVisible(false);

    if (templateFormMode === "new") {
      applyTemplate(nextTemplate);
    }
  };

  const deleteCustomTemplate = async (templateKey) => {
    const nextTemplates = customTemplates.filter((template) => template.key !== templateKey);
    setCustomTemplates(nextTemplates);
    await AsyncStorage.setItem(templateStorageKey, JSON.stringify(nextTemplates));

    if (activeTemplate === templateKey) {
      setActiveTemplate("blank");
    }
  };

  const clearPlan = () => {
    Alert.alert("Clear planner?", "This removes the saved project plan from this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          setPlan(DEFAULT_PLAN);
          setActiveTemplate("blank");
          await AsyncStorage.removeItem(storageKey);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={fixieColors.gold} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.titleText}>Project Planner</Text>
            <Text style={styles.subtitle}>Map out materials, budget, timing, and notes before you send a request.</Text>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={clearPlan}>
            <Ionicons name="trash-outline" size={18} color={fixieColors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.templateSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Work Templates</Text>
              <View style={styles.templateActions}>
                <TouchableOpacity style={styles.smallActionButton} onPress={openSaveTemplate}>
                  <Ionicons name="save-outline" size={15} color={fixieColors.goldLight} />
                  <Text style={styles.smallActionText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallActionButton} onPress={openNewTemplate}>
                  <Ionicons name="add" size={16} color={fixieColors.goldLight} />
                  <Text style={styles.smallActionText}>New</Text>
                </TouchableOpacity>
                {activeCustomTemplate ? (
                  <TouchableOpacity
                    style={[styles.smallActionButton, styles.deleteActionButton]}
                    onPress={() => deleteCustomTemplate(activeCustomTemplate.key)}
                  >
                    <Ionicons name="trash-outline" size={15} color={fixieColors.error} />
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateScroller}>
              {availableTemplates.map((template) => {
                const active = activeTemplate === template.key;

                return (
                  <TouchableOpacity
                    key={template.key}
                    style={[styles.templateButton, active && styles.templateButtonActive]}
                    onPress={() => applyTemplate(template)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={template.icon}
                      size={20}
                      color={active ? fixieColors.background : fixieColors.goldLight}
                    />
                    <Text style={[styles.templateLabel, active && styles.templateLabelActive]} numberOfLines={1}>
                      {template.label}
                    </Text>
                    {template.workType ? (
                      <Text style={[styles.templateMeta, active && styles.templateLabelActive]} numberOfLines={1}>
                        {template.workType}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.editorCard}>
            <View style={styles.saveRow}>
              <Text style={styles.editorTitle}>Plan Notes</Text>
              <Text style={styles.saveState}>{saving ? "Saving..." : "Saved locally"}</Text>
            </View>

            <Text style={styles.label}>Project name</Text>
            <TextInput
              style={styles.input}
              value={plan.title}
              onChangeText={(value) => updatePlanField("title", value)}
              placeholder="Kitchen backsplash, bathroom remodel..."
              placeholderTextColor={fixieColors.textMuted}
            />

            <PlannerTextArea
              label="Project details"
              value={plan.overview}
              onChangeText={(value) => updatePlanField("overview", value)}
              placeholder="Describe what you want done, measurements, photos to take, and questions to ask."
              minHeight={150}
            />

            <PlannerTextArea
              label="Materials needed"
              value={plan.materials}
              onChangeText={(value) => updatePlanField("materials", value)}
              placeholder="List supplies, quantities, preferred brands, measurements, or items you already have."
              minHeight={170}
            />

            <PlannerTextArea
              label="Budget"
              value={plan.budget}
              onChangeText={(value) => updatePlanField("budget", value)}
              placeholder="Track labor estimates, materials, deposits, fees, and your target total."
              minHeight={150}
            />

            <PlannerTextArea
              label="Timeline"
              value={plan.timeline}
              onChangeText={(value) => updatePlanField("timeline", value)}
              placeholder="Add quote deadlines, preferred start dates, milestones, and must-finish dates."
              minHeight={150}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={templateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {templateFormMode === "save" ? "Save Template" : "New Template"}
                </Text>
                <Text style={styles.modalSubtitle}>Build reusable notes for a specific type of work.</Text>
              </View>
              <TouchableOpacity style={styles.modalClose} onPress={() => setTemplateModalVisible(false)}>
                <Ionicons name="close" size={20} color={fixieColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Template name</Text>
              <TextInput
                style={styles.input}
                value={templateForm.name}
                onChangeText={(value) => updateTemplateForm("name", value)}
                placeholder="Rental turnover, basement cleanup..."
                placeholderTextColor={fixieColors.textMuted}
              />

              <Text style={styles.label}>Work type</Text>
              <TextInput
                style={styles.input}
                value={templateForm.workType}
                onChangeText={(value) => updateTemplateForm("workType", value)}
                placeholder="Plumbing, flooring, cleaning, remodel..."
                placeholderTextColor={fixieColors.textMuted}
              />

              <Text style={styles.label}>Project name starter</Text>
              <TextInput
                style={styles.input}
                value={templateForm.title}
                onChangeText={(value) => updateTemplateForm("title", value)}
                placeholder="Project title to start from"
                placeholderTextColor={fixieColors.textMuted}
              />

              <PlannerTextArea
                label="Project details starter"
                value={templateForm.overview}
                onChangeText={(value) => updateTemplateForm("overview", value)}
                placeholder="Questions, measurements, scope, photos to collect..."
                minHeight={110}
              />
              <PlannerTextArea
                label="Materials starter"
                value={templateForm.materials}
                onChangeText={(value) => updateTemplateForm("materials", value)}
                placeholder="Default material checklist for this work type."
                minHeight={110}
              />
              <PlannerTextArea
                label="Budget starter"
                value={templateForm.budget}
                onChangeText={(value) => updateTemplateForm("budget", value)}
                placeholder="Default cost categories for this work type."
                minHeight={110}
              />
              <PlannerTextArea
                label="Timeline starter"
                value={templateForm.timeline}
                onChangeText={(value) => updateTemplateForm("timeline", value)}
                placeholder="Default milestones for this work type."
                minHeight={110}
              />
            </ScrollView>

            <TouchableOpacity style={styles.primaryModalButton} onPress={saveCustomTemplate}>
              <Text style={styles.primaryModalButtonText}>Save Template</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomerBottomNav />
    </SafeAreaView>
  );
}

function PlannerTextArea({ label, value, onChangeText, placeholder, minHeight }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, styles.textArea, { minHeight }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={fixieColors.textMuted}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: fixieColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: fixieColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  titleText: {
    fontSize: 28,
    fontWeight: "800",
    color: fixieColors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: fixieColors.textSecondary,
  },
  clearButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fixieColors.surface,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },
  templateSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: fixieColors.text,
  },
  templateActions: {
    flexDirection: "row",
    gap: 8,
  },
  smallActionButton: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: fixieColors.surface,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  smallActionText: {
    color: fixieColors.goldLight,
    fontSize: 12,
    fontWeight: "800",
  },
  deleteActionButton: {
    borderColor: "rgba(199, 92, 92, 0.45)",
  },
  deleteActionText: {
    color: fixieColors.error,
    fontSize: 12,
    fontWeight: "800",
  },
  templateScroller: {
    gap: 10,
    paddingRight: 20,
  },
  templateButton: {
    width: 126,
    minHeight: 86,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
    gap: 8,
    backgroundColor: fixieColors.surface,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  templateButtonActive: {
    backgroundColor: fixieColors.gold,
    borderColor: fixieColors.goldLight,
    ...fixieShadows.glow,
  },
  templateLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: fixieColors.text,
  },
  templateLabelActive: {
    color: fixieColors.background,
  },
  templateMeta: {
    marginTop: -4,
    fontSize: 11,
    fontWeight: "700",
    color: fixieColors.textMuted,
  },
  editorCard: {
    backgroundColor: fixieColors.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: fixieColors.border,
    ...fixieShadows.card,
  },
  saveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  editorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: fixieColors.text,
  },
  saveState: {
    fontSize: 12,
    fontWeight: "700",
    color: fixieColors.textMuted,
  },
  fieldGroup: {
    marginTop: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
    color: fixieColors.text,
  },
  input: {
    backgroundColor: fixieColors.backgroundAlt,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: fixieColors.border,
    color: fixieColors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  textArea: {
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: fixieColors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "88%",
    backgroundColor: fixieColors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: fixieColors.border,
    ...fixieShadows.card,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: fixieColors.text,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: fixieColors.textSecondary,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fixieColors.surfaceElevated,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  primaryModalButton: {
    marginTop: 12,
    backgroundColor: fixieColors.gold,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    ...fixieShadows.glow,
  },
  primaryModalButtonText: {
    color: fixieColors.background,
    fontSize: 16,
    fontWeight: "800",
  },
});
