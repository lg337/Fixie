import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FixieLogo from "../../../components/FixieLogo";
import {
  EMAIL_ALLOWED_TEXT,
  PHONE_ALLOWED_TEXT,
  formatPhoneInput,
  isValidEmail,
  isValidPhone,
  normalizePhoneDigits,
} from "../../../lib/auth-validation";
import { fixieColors, fixieShadows } from "../../../lib/fixie-theme";
import { supabase } from "../../../lib/supabase";

const DEFAULT_PROFILE = {
  headline: "",
  location: "",
  about: "",
  skills: [],
  certifications: [],
  experience: [],
  availability: [],
  openToWork: true,
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Section({ icon, title, subtitle, onEdit, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color={fixieColors.goldLight} />
        </View>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {onEdit ? (
          <TouchableOpacity onPress={onEdit} style={styles.editButton} accessibilityLabel={`Edit ${title}`}>
            <Ionicons name="pencil" size={17} color={fixieColors.goldLight} />
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize = "sentences" }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={fixieColors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

function EditModal({ visible, title, children, onClose, onSave }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.modalHeaderAction}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onSave} style={styles.modalHeaderAction}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function EmployeeProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employeeID, setEmployeeID] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [draft, setDraft] = useState(DEFAULT_PROFILE);
  const [companyMap, setCompanyMap] = useState({});
  const [jobs, setJobs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [newSkill, setNewSkill] = useState("");
  const [newCertification, setNewCertification] = useState("");
  const [experienceDraft, setExperienceDraft] = useState({ title: "", company: "", dates: "", description: "" });
  const [availabilityDraft, setAvailabilityDraft] = useState({ id: null, companyID: "all", day: "Mon", start: "8:00 AM", end: "4:00 PM", enabled: true });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const storedID = await AsyncStorage.getItem("employeeID");
      if (!storedID) return;
      const parsedID = Number(storedID);
      setEmployeeID(parsedID);

      if (storedID === "demo") {
        setName("Jordan Ellis");
        setEmail("jordan@fixie.pro");
        setPhone("(919) 555-0148");
        setProfile({
          headline: "Residential Electrician · Troubleshooting & Smart Home",
          location: "Raleigh, North Carolina",
          about: "Licensed trades professional focused on safe, clean residential work. I enjoy diagnosing difficult electrical issues and helping homeowners understand their options.",
          skills: ["Electrical repair", "Troubleshooting", "Smart home", "Panel upgrades", "Customer service"],
          certifications: ["NC Electrical License", "OSHA 10"],
          experience: [],
          availability: [
            { id: 1, companyID: "1", day: "Mon", start: "8:00 AM", end: "4:00 PM", enabled: true },
            { id: 2, companyID: "1", day: "Wed", start: "10:00 AM", end: "6:00 PM", enabled: true },
          ],
          openToWork: true,
        });
        setJobs([{ RequestID: "demo-1", RequestTitle: "Kitchen lighting upgrade", CompanyID: 1 }]);
        setCompanyMap({ 1: "Oak & Wire Services" });
        return;
      }

      const [{ data: emp }, savedProfile] = await Promise.all([
        supabase.from("EmployeeTable").select("*").eq("EmployeeID", parsedID).maybeSingle(),
        AsyncStorage.getItem(`employeeProfessionalProfile:${storedID}`),
      ]);

      if (emp) {
        setEmployee(emp);
        setName(emp.EmployeeName || "");
        setEmail(emp.EmployeeEmail || "");
        setPhone(emp.EmployeePhone ? formatPhoneInput(String(emp.EmployeePhone)) : "");
      }
      if (savedProfile) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(savedProfile) });

      const companyIDs = emp?.CompanyIDS || [];
      if (companyIDs.length) {
        const { data: companies } = await supabase.from("CompanyTable").select("CompanyID, CompanyName").in("CompanyID", companyIDs);
        const map = {};
        (companies || []).forEach((company) => { map[company.CompanyID] = company.CompanyName; });
        setCompanyMap(map);
      }

      const { data: completedJobs } = await supabase
        .from("RequestTable")
        .select("*")
        .eq("AssignedEmployeeID", parsedID)
        .eq("RequestStatus", "completed")
        .order("RequestID", { ascending: false });
      setJobs(completedJobs || []);
    } catch (error) {
      console.error("Profile load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const completeness = useMemo(() => {
    const signals = [name, profile.headline, profile.location, profile.about, profile.skills.length >= 3, profile.certifications.length > 0, jobs.length + profile.experience.length > 0];
    return Math.round((signals.filter(Boolean).length / signals.length) * 100);
  }, [jobs.length, name, profile]);

  const openEditor = (section) => {
    setDraft({ ...profile, skills: [...profile.skills], certifications: [...profile.certifications], experience: [...profile.experience] });
    setEditing(section);
  };

  const persistProfile = async (nextProfile) => {
    setProfile(nextProfile);
    await AsyncStorage.setItem(`employeeProfessionalProfile:${employeeID || "demo"}`, JSON.stringify(nextProfile));
  };

  const finishEditing = async () => {
    await persistProfile(draft);
    setEditing(null);
  };

  const saveContact = async () => {
    if (email.trim() && !isValidEmail(email)) return Alert.alert("Check your email", EMAIL_ALLOWED_TEXT);
    if (phone.trim() && !isValidPhone(phone)) return Alert.alert("Check your phone", PHONE_ALLOWED_TEXT);
    setSaving(true);
    try {
      if (employeeID && employeeID !== "demo") {
        const { error } = await supabase.from("EmployeeTable").update({
          EmployeeName: name.trim(),
          EmployeeEmail: email.trim() || null,
          EmployeePhone: phone.trim() ? Number(normalizePhoneDigits(phone)) : null,
        }).eq("EmployeeID", employeeID);
        if (error) throw error;
      }
      await persistProfile(draft);
      setEditing(null);
    } catch (error) {
      Alert.alert("Couldn’t save profile", error.message);
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    const value = newSkill.trim();
    if (value && !draft.skills.includes(value)) setDraft({ ...draft, skills: [...draft.skills, value] });
    setNewSkill("");
  };

  const addCertification = () => {
    const value = newCertification.trim();
    if (value && !draft.certifications.includes(value)) setDraft({ ...draft, certifications: [...draft.certifications, value] });
    setNewCertification("");
  };

  const addExperience = () => {
    if (!experienceDraft.title.trim() || !experienceDraft.company.trim()) {
      Alert.alert("Add a role and company", "Both fields help people understand your experience.");
      return;
    }
    setDraft({ ...draft, experience: [{ ...experienceDraft, id: Date.now() }, ...draft.experience] });
    setExperienceDraft({ title: "", company: "", dates: "", description: "" });
  };

  const saveAvailabilityWindow = () => {
    if (!availabilityDraft.start.trim() || !availabilityDraft.end.trim()) return;
    const nextWindow = { ...availabilityDraft, id: availabilityDraft.id || Date.now() };
    const availability = availabilityDraft.id
      ? draft.availability.map((item) => item.id === availabilityDraft.id ? nextWindow : item)
      : [...draft.availability, nextWindow];
    setDraft({ ...draft, availability });
  };

  const moveAvailability = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= draft.availability.length) return;
    const availability = [...draft.availability];
    [availability[index], availability[target]] = [availability[target], availability[index]];
    setDraft({ ...draft, availability });
  };

  const handleSignOut = async () => {
    await AsyncStorage.removeItem("employeeID");
    router.replace("/");
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color={fixieColors.gold} style={styles.loader} /></SafeAreaView>;
  }

  const joinedCompanies = employee?.CompanyIDS || Object.keys(companyMap);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={[]}
        renderItem={null}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            <View style={styles.topBar}>
              <View>
                <Text style={styles.eyebrow}>PROFESSIONAL PROFILE</Text>
                <Text style={styles.header}>Your work story</Text>
              </View>
              <TouchableOpacity onPress={handleSignOut} style={styles.iconButton} accessibilityLabel="Sign out">
                <Ionicons name="log-out-outline" size={21} color={fixieColors.error} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroCard}>
              <View style={styles.coverAccent} />
              <View style={styles.heroBody}>
                <View style={styles.avatar}>
                  <FixieLogo size={58} />
                </View>
                <TouchableOpacity onPress={() => openEditor("intro")} style={styles.heroEdit} accessibilityLabel="Edit intro">
                  <Ionicons name="pencil" size={17} color={fixieColors.background} />
                </TouchableOpacity>
                <Text style={styles.profileName}>{name || "Add your name"}</Text>
                <Text style={[styles.headline, !profile.headline && styles.placeholderText]}>
                  {profile.headline || "Add a headline that shows what you do best"}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={15} color={fixieColors.textMuted} />
                  <Text style={styles.metaText}>{profile.location || "Add location"}</Text>
                  {joinedCompanies.length ? <View style={styles.metaDot} /> : null}
                  {joinedCompanies.length ? <Text style={styles.metaText}>{joinedCompanies.length} workplace{joinedCompanies.length === 1 ? "" : "s"}</Text> : null}
                </View>
              </View>
            </View>

            <View style={styles.strengthCard}>
              <View style={styles.strengthTop}>
                <View>
                  <Text style={styles.strengthLabel}>PROFILE STRENGTH</Text>
                  <Text style={styles.strengthTitle}>{completeness >= 85 ? "Standout profile" : completeness >= 55 ? "Looking good" : "Let’s build it out"}</Text>
                </View>
                <Text style={styles.strengthPercent}>{completeness}%</Text>
              </View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${completeness}%` }]} /></View>
              <Text style={styles.strengthHint}>{completeness < 100 ? "Add details below so companies can quickly see your fit." : "You’re ready to make a strong first impression."}</Text>
            </View>

            <Section icon="person-outline" title="About" onEdit={() => openEditor("about")}>
              <Text style={[styles.bodyText, !profile.about && styles.placeholderText]}>
                {profile.about || "Share your approach to the work, the jobs you enjoy, and what sets you apart."}
              </Text>
            </Section>

            <Section icon="construct-outline" title="Skills" subtitle={`${profile.skills.length} listed`} onEdit={() => openEditor("skills")}>
              {profile.skills.length ? (
                <View style={styles.chipWrap}>
                  {profile.skills.map((skill) => <View key={skill} style={styles.chip}><Text style={styles.chipText}>{skill}</Text></View>)}
                </View>
              ) : <Text style={styles.placeholderText}>Add at least three skills to show where you shine.</Text>}
            </Section>

            <Section icon="briefcase-outline" title="Experience" subtitle={`${profile.experience.length + joinedCompanies.length} roles`} onEdit={() => openEditor("experience")}>
              {profile.experience.map((item) => (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={styles.timelineMark}><Ionicons name="business" size={17} color={fixieColors.goldLight} /></View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{item.title}</Text>
                    <Text style={styles.timelineCompany}>{item.company}</Text>
                    {item.dates ? <Text style={styles.timelineMeta}>{item.dates}</Text> : null}
                    {item.description ? <Text style={styles.timelineDescription}>{item.description}</Text> : null}
                  </View>
                </View>
              ))}
              {joinedCompanies.map((id) => (
                <View key={String(id)} style={styles.timelineItem}>
                  <View style={styles.timelineMark}><Ionicons name="business" size={17} color={fixieColors.goldLight} /></View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Service Professional</Text>
                    <Text style={styles.timelineCompany}>{companyMap[id] || `Company #${id}`}</Text>
                    <Text style={styles.timelineMeta}>Verified through Fixie</Text>
                  </View>
                </View>
              ))}
              {!profile.experience.length && !joinedCompanies.length ? <Text style={styles.placeholderText}>Add the roles that shaped your experience.</Text> : null}
            </Section>

            <Section icon="ribbon-outline" title="Licenses & certifications" onEdit={() => openEditor("certifications")}>
              {profile.certifications.length ? profile.certifications.map((item) => (
                <View key={item} style={styles.credentialRow}>
                  <Ionicons name="shield-checkmark" size={22} color={fixieColors.success} />
                  <Text style={styles.credentialText}>{item}</Text>
                </View>
              )) : <Text style={styles.placeholderText}>Build trust by adding licenses, training, or certifications.</Text>}
            </Section>

            <Section icon="checkmark-done-outline" title="Fixie track record" subtitle="Verified from completed work">
              <View style={styles.statsRow}>
                <View style={styles.stat}><Text style={styles.statNumber}>{jobs.length}</Text><Text style={styles.statLabel}>Jobs completed</Text></View>
                <View style={styles.statDivider} />
                <View style={styles.stat}><Text style={styles.statNumber}>{joinedCompanies.length}</Text><Text style={styles.statLabel}>Companies</Text></View>
              </View>
              {jobs.slice(0, 3).map((job) => (
                <View key={String(job.RequestID)} style={styles.jobRow}>
                  <View style={styles.checkCircle}><Ionicons name="checkmark" size={16} color={fixieColors.background} /></View>
                  <View style={styles.jobCopy}>
                    <Text style={styles.jobTitle}>{job.RequestTitle || job.RequestNotes || "Completed service job"}</Text>
                    <Text style={styles.jobCompany}>{companyMap[job.CompanyID] || "Verified on Fixie"}</Text>
                  </View>
                </View>
              ))}
            </Section>
          </>
        }
      />

      <EditModal visible={editing === "intro"} title="Edit intro" onClose={() => setEditing(null)} onSave={saveContact}>
        <FormField label="Name" value={name} onChangeText={setName} placeholder="Your full name" />
        <FormField label="Professional headline" value={draft.headline} onChangeText={(value) => setDraft({ ...draft, headline: value })} placeholder="e.g. Licensed plumber · Residential specialist" />
        <FormField label="Location" value={draft.location} onChangeText={(value) => setDraft({ ...draft, location: value })} placeholder="City, State" />
        <FormField label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <FormField label="Phone" value={phone} onChangeText={(value) => setPhone(formatPhoneInput(value))} placeholder="(555) 555-5555" keyboardType="phone-pad" />
        {employee?.EmployeeUsername ? <Text style={styles.usernameNote}>Signed in as @{employee.EmployeeUsername}</Text> : null}
        {saving ? <ActivityIndicator color={fixieColors.gold} /> : null}
      </EditModal>

      <EditModal visible={editing === "about"} title="Edit about" onClose={() => setEditing(null)} onSave={finishEditing}>
        <FormField label="Your professional story" value={draft.about} onChangeText={(value) => setDraft({ ...draft, about: value })} placeholder="Tell companies what you do, how you work, and what matters to you…" multiline />
        <Text style={styles.helperText}>{draft.about.length}/500 · Keep it clear, personal, and specific.</Text>
      </EditModal>

      <EditModal visible={editing === "skills"} title="Edit skills" onClose={() => setEditing(null)} onSave={finishEditing}>
        <Text style={styles.modalSectionLabel}>Your skills</Text>
        <View style={styles.chipWrap}>
          {draft.skills.map((skill) => (
            <TouchableOpacity key={skill} style={styles.removableChip} onPress={() => setDraft({ ...draft, skills: draft.skills.filter((item) => item !== skill) })}>
              <Text style={styles.chipText}>{skill}</Text><Ionicons name="close" size={15} color={fixieColors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput style={[styles.input, styles.addInput]} value={newSkill} onChangeText={setNewSkill} placeholder="Add a skill" placeholderTextColor={fixieColors.textMuted} onSubmitEditing={addSkill} />
          <TouchableOpacity style={styles.addButton} onPress={addSkill}><Ionicons name="add" size={22} color={fixieColors.background} /></TouchableOpacity>
        </View>
        <Text style={styles.helperText}>Tap a listed skill to remove it.</Text>
      </EditModal>

      <EditModal visible={editing === "certifications"} title="Edit credentials" onClose={() => setEditing(null)} onSave={finishEditing}>
        {draft.certifications.map((item) => (
          <TouchableOpacity key={item} style={styles.editListRow} onPress={() => setDraft({ ...draft, certifications: draft.certifications.filter((value) => value !== item) })}>
            <Ionicons name="shield-checkmark" size={20} color={fixieColors.success} /><Text style={styles.editListText}>{item}</Text><Ionicons name="trash-outline" size={18} color={fixieColors.error} />
          </TouchableOpacity>
        ))}
        <View style={styles.addRow}>
          <TextInput style={[styles.input, styles.addInput]} value={newCertification} onChangeText={setNewCertification} placeholder="License or certification" placeholderTextColor={fixieColors.textMuted} onSubmitEditing={addCertification} />
          <TouchableOpacity style={styles.addButton} onPress={addCertification}><Ionicons name="add" size={22} color={fixieColors.background} /></TouchableOpacity>
        </View>
      </EditModal>

      <EditModal visible={editing === "availability"} title="Availability planner" onClose={() => setEditing(null)} onSave={finishEditing}>
        <View style={styles.plannerIntro}>
          <Ionicons name="sparkles" size={20} color={fixieColors.goldLight} />
          <Text style={styles.plannerIntroText}>Create separate windows for each company, then reorder them to prioritize where you want more opportunities.</Text>
        </View>
        {draft.availability.map((item, index) => (
          <View key={item.id} style={[styles.availabilityEditRow, !item.enabled && styles.disabledWindow]}>
            <TouchableOpacity
              style={styles.windowMain}
              onPress={() => setAvailabilityDraft({ ...item, companyID: String(item.companyID) })}
              accessibilityLabel={`Edit ${item.day} availability`}
            >
              <Text style={styles.windowTime}>{item.day} · {item.start} – {item.end}</Text>
              <Text style={styles.windowCompany}>{item.companyID === "all" ? "All connected companies" : companyMap[item.companyID] || `Company #${item.companyID}`}</Text>
            </TouchableOpacity>
            <View style={styles.windowActions}>
              <TouchableOpacity onPress={() => moveAvailability(index, -1)} disabled={index === 0} style={styles.smallAction}>
                <Ionicons name="chevron-up" size={17} color={index === 0 ? fixieColors.border : fixieColors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveAvailability(index, 1)} disabled={index === draft.availability.length - 1} style={styles.smallAction}>
                <Ionicons name="chevron-down" size={17} color={index === draft.availability.length - 1 ? fixieColors.border : fixieColors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDraft({ ...draft, availability: draft.availability.map((value) => value.id === item.id ? { ...value, enabled: !value.enabled } : value) })}
                style={styles.smallAction}
              >
                <Ionicons name={item.enabled ? "pause" : "play"} size={16} color={item.enabled ? fixieColors.goldLight : fixieColors.success} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDraft({ ...draft, availability: draft.availability.filter((value) => value.id !== item.id) })} style={styles.smallAction}>
                <Ionicons name="trash-outline" size={16} color={fixieColors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.modalSectionLabel}>{availabilityDraft.id ? "Adjust time window" : "Add time window"}</Text>
        <Text style={styles.fieldLabel}>Company</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
          {[{ id: "all", name: "All companies" }, ...joinedCompanies.map((id) => ({ id: String(id), name: companyMap[id] || `Company #${id}` }))].map((company) => (
            <TouchableOpacity
              key={company.id}
              style={[styles.optionChip, String(availabilityDraft.companyID) === company.id && styles.optionChipActive]}
              onPress={() => setAvailabilityDraft({ ...availabilityDraft, companyID: company.id })}
            >
              <Text style={[styles.optionChipText, String(availabilityDraft.companyID) === company.id && styles.optionChipTextActive]}>{company.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.fieldLabel}>Day</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
          {WEEKDAYS.map((day) => (
            <TouchableOpacity key={day} style={[styles.dayOption, availabilityDraft.day === day && styles.dayOptionActive]} onPress={() => setAvailabilityDraft({ ...availabilityDraft, day })}>
              <Text style={[styles.dayOptionText, availabilityDraft.day === day && styles.dayOptionTextActive]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.timeInputRow}>
          <View style={styles.timeInput}><FormField label="Starts" value={availabilityDraft.start} onChangeText={(value) => setAvailabilityDraft({ ...availabilityDraft, start: value })} placeholder="8:00 AM" /></View>
          <View style={styles.timeInput}><FormField label="Ends" value={availabilityDraft.end} onChangeText={(value) => setAvailabilityDraft({ ...availabilityDraft, end: value })} placeholder="4:00 PM" /></View>
        </View>
        <TouchableOpacity style={styles.fullAddButton} onPress={saveAvailabilityWindow}>
          <Ionicons name={availabilityDraft.id ? "swap-horizontal" : "add-circle-outline"} size={20} color={fixieColors.background} />
          <Text style={styles.fullAddButtonText}>{availabilityDraft.id ? "Update window" : "Add window"}</Text>
        </TouchableOpacity>
        {availabilityDraft.id ? (
          <TouchableOpacity style={styles.clearEditButton} onPress={() => setAvailabilityDraft({ id: null, companyID: "all", day: "Mon", start: "8:00 AM", end: "4:00 PM", enabled: true })}>
            <Text style={styles.clearEditText}>Cancel editing this window</Text>
          </TouchableOpacity>
        ) : null}
      </EditModal>

      <EditModal visible={editing === "experience"} title="Edit experience" onClose={() => setEditing(null)} onSave={finishEditing}>
        {draft.experience.map((item) => (
          <View key={item.id} style={styles.editListRow}>
            <Ionicons name="briefcase" size={20} color={fixieColors.goldLight} />
            <View style={styles.editListCopy}><Text style={styles.editListText}>{item.title}</Text><Text style={styles.editListMeta}>{item.company}</Text></View>
            <TouchableOpacity onPress={() => setDraft({ ...draft, experience: draft.experience.filter((value) => value.id !== item.id) })}>
              <Ionicons name="trash-outline" size={18} color={fixieColors.error} />
            </TouchableOpacity>
          </View>
        ))}
        <Text style={styles.modalSectionLabel}>Add experience</Text>
        <FormField label="Role" value={experienceDraft.title} onChangeText={(value) => setExperienceDraft({ ...experienceDraft, title: value })} placeholder="e.g. Lead Electrician" />
        <FormField label="Company" value={experienceDraft.company} onChangeText={(value) => setExperienceDraft({ ...experienceDraft, company: value })} placeholder="Company name" />
        <FormField label="Dates" value={experienceDraft.dates} onChangeText={(value) => setExperienceDraft({ ...experienceDraft, dates: value })} placeholder="e.g. 2022 – Present" />
        <FormField label="Description" value={experienceDraft.description} onChangeText={(value) => setExperienceDraft({ ...experienceDraft, description: value })} placeholder="What did you own or accomplish?" multiline />
        <TouchableOpacity style={styles.fullAddButton} onPress={addExperience}><Ionicons name="add-circle-outline" size={20} color={fixieColors.background} /><Text style={styles.fullAddButtonText}>Add experience</Text></TouchableOpacity>
      </EditModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fixieColors.background },
  loader: { marginTop: 40 },
  scrollContent: { padding: 16, paddingBottom: 44 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  eyebrow: { color: fixieColors.goldLight, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  header: { color: fixieColors.text, fontSize: 29, fontWeight: "900", marginTop: 3 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  heroCard: { backgroundColor: fixieColors.surface, borderRadius: 24, borderWidth: 1, borderColor: fixieColors.border, overflow: "hidden", marginBottom: 14, ...fixieShadows.card },
  coverAccent: { height: 72, backgroundColor: fixieColors.goldDeep },
  heroBody: { paddingHorizontal: 18, paddingBottom: 20 },
  avatar: { width: 82, height: 82, borderRadius: 41, marginTop: -41, backgroundColor: fixieColors.background, borderWidth: 4, borderColor: fixieColors.surface, alignItems: "center", justifyContent: "center" },
  heroEdit: { position: "absolute", top: 14, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: fixieColors.gold, alignItems: "center", justifyContent: "center" },
  profileName: { color: fixieColors.text, fontSize: 25, fontWeight: "900", marginTop: 12 },
  headline: { color: fixieColors.textSecondary, fontSize: 15, lineHeight: 21, marginTop: 4, maxWidth: 520 },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 10, gap: 5 },
  metaText: { color: fixieColors.textMuted, fontSize: 12 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: fixieColors.textMuted, marginHorizontal: 3 },
  availabilityPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(88,183,122,0.12)", borderWidth: 1, borderColor: "rgba(88,183,122,0.35)", paddingHorizontal: 11, paddingVertical: 7, borderRadius: 18, marginTop: 14, gap: 7 },
  availabilityPillOff: { backgroundColor: fixieColors.surfaceElevated, borderColor: fixieColors.border },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: fixieColors.success },
  statusDotOff: { backgroundColor: fixieColors.textMuted },
  availabilityText: { color: fixieColors.textSecondary, fontSize: 12, fontWeight: "700" },
  weekStrip: { flexDirection: "row", justifyContent: "space-between", backgroundColor: fixieColors.backgroundAlt, borderRadius: 15, padding: 9, marginBottom: 13 },
  weekDay: { width: 34, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center", gap: 5 },
  weekDayActive: { backgroundColor: "rgba(216,198,144,0.12)" },
  weekDayLabel: { color: fixieColors.textMuted, fontSize: 11, fontWeight: "800" },
  weekDayLabelActive: { color: fixieColors.goldLight },
  weekDayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: fixieColors.border },
  weekDayDotActive: { backgroundColor: fixieColors.success },
  availabilityRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: fixieColors.border },
  availabilityDay: { width: 40, height: 34, borderRadius: 10, backgroundColor: fixieColors.surfaceElevated, alignItems: "center", justifyContent: "center", marginRight: 10 },
  availabilityDayText: { color: fixieColors.goldLight, fontSize: 11, fontWeight: "900" },
  availabilityCopy: { flex: 1 },
  availabilityTime: { color: fixieColors.text, fontSize: 13, fontWeight: "800" },
  availabilityCompany: { color: fixieColors.textMuted, fontSize: 11, marginTop: 2 },
  availabilityHint: { color: fixieColors.textMuted, fontSize: 10, marginTop: 10 },
  strengthCard: { backgroundColor: fixieColors.surfaceElevated, borderRadius: 20, padding: 17, borderWidth: 1, borderColor: fixieColors.border, marginBottom: 14 },
  strengthTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  strengthLabel: { color: fixieColors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  strengthTitle: { color: fixieColors.text, fontSize: 17, fontWeight: "800", marginTop: 3 },
  strengthPercent: { color: fixieColors.goldLight, fontSize: 22, fontWeight: "900" },
  progressTrack: { height: 7, backgroundColor: fixieColors.background, borderRadius: 4, overflow: "hidden", marginTop: 13 },
  progressFill: { height: "100%", backgroundColor: fixieColors.gold, borderRadius: 4 },
  strengthHint: { color: fixieColors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 9 },
  section: { backgroundColor: fixieColors.surface, borderRadius: 22, padding: 17, borderWidth: 1, borderColor: fixieColors.border, marginBottom: 14, ...fixieShadows.card },
  sectionHeading: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  sectionIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: fixieColors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  sectionHeadingCopy: { flex: 1, marginLeft: 10 },
  sectionTitle: { color: fixieColors.text, fontSize: 17, fontWeight: "900" },
  sectionSubtitle: { color: fixieColors.textMuted, fontSize: 11, marginTop: 2 },
  editButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: fixieColors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  bodyText: { color: fixieColors.textSecondary, lineHeight: 22, fontSize: 14 },
  placeholderText: { color: fixieColors.textMuted, fontStyle: "italic", lineHeight: 20 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 16, backgroundColor: "rgba(216,198,144,0.10)", borderWidth: 1, borderColor: "rgba(216,198,144,0.28)", paddingHorizontal: 11, paddingVertical: 7 },
  removableChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 16, backgroundColor: fixieColors.surfaceElevated, borderWidth: 1, borderColor: fixieColors.border, paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { color: fixieColors.goldLight, fontSize: 12, fontWeight: "700" },
  timelineItem: { flexDirection: "row", paddingBottom: 18 },
  timelineMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: fixieColors.surfaceElevated, alignItems: "center", justifyContent: "center", marginRight: 11 },
  timelineContent: { flex: 1, borderBottomWidth: 1, borderBottomColor: fixieColors.border, paddingBottom: 16 },
  timelineTitle: { color: fixieColors.text, fontSize: 15, fontWeight: "800" },
  timelineCompany: { color: fixieColors.goldLight, fontSize: 13, marginTop: 3 },
  timelineMeta: { color: fixieColors.textMuted, fontSize: 11, marginTop: 4 },
  timelineDescription: { color: fixieColors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 8 },
  credentialRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: fixieColors.border },
  credentialText: { color: fixieColors.text, fontSize: 14, fontWeight: "700", flex: 1 },
  statsRow: { flexDirection: "row", backgroundColor: fixieColors.backgroundAlt, borderRadius: 16, padding: 14, marginBottom: 12 },
  stat: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: fixieColors.border },
  statNumber: { color: fixieColors.goldLight, fontSize: 24, fontWeight: "900" },
  statLabel: { color: fixieColors.textMuted, fontSize: 11, marginTop: 2 },
  jobRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: fixieColors.success, alignItems: "center", justifyContent: "center" },
  jobCopy: { flex: 1, marginLeft: 10 },
  jobTitle: { color: fixieColors.text, fontSize: 13, fontWeight: "700" },
  jobCompany: { color: fixieColors.textMuted, fontSize: 11, marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: fixieColors.overlay, justifyContent: "flex-end" },
  modalSheet: { backgroundColor: fixieColors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "90%", minHeight: "55%", borderWidth: 1, borderColor: fixieColors.border },
  modalHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: fixieColors.border, alignSelf: "center", marginTop: 9 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: fixieColors.border },
  modalHeaderAction: { minWidth: 55 },
  modalTitle: { color: fixieColors.text, fontSize: 17, fontWeight: "900" },
  cancelText: { color: fixieColors.textSecondary, fontSize: 14 },
  doneText: { color: fixieColors.goldLight, fontSize: 14, fontWeight: "800", textAlign: "right" },
  modalContent: { padding: 18, paddingBottom: 42 },
  formField: { marginBottom: 16 },
  fieldLabel: { color: fixieColors.text, fontSize: 12, fontWeight: "800", marginBottom: 7 },
  input: { backgroundColor: fixieColors.backgroundAlt, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12, borderWidth: 1, borderColor: fixieColors.border, color: fixieColors.text, fontSize: 14 },
  multilineInput: { minHeight: 112, lineHeight: 20 },
  helperText: { color: fixieColors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 7 },
  usernameNote: { color: fixieColors.textMuted, fontSize: 12, textAlign: "center" },
  modalSectionLabel: { color: fixieColors.text, fontSize: 14, fontWeight: "900", marginBottom: 12, marginTop: 4 },
  plannerIntro: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 13, borderRadius: 14, backgroundColor: "rgba(216,198,144,0.08)", borderWidth: 1, borderColor: "rgba(216,198,144,0.22)", marginBottom: 16 },
  plannerIntroText: { color: fixieColors.textSecondary, fontSize: 12, lineHeight: 18, flex: 1 },
  availabilityEditRow: { flexDirection: "row", alignItems: "center", backgroundColor: fixieColors.backgroundAlt, borderRadius: 14, padding: 11, borderWidth: 1, borderColor: fixieColors.border, marginBottom: 8 },
  disabledWindow: { opacity: 0.5 },
  windowMain: { flex: 1 },
  windowTime: { color: fixieColors.text, fontSize: 12, fontWeight: "800" },
  windowCompany: { color: fixieColors.textMuted, fontSize: 10, marginTop: 3 },
  windowActions: { flexDirection: "row", marginLeft: 7 },
  smallAction: { width: 28, height: 30, alignItems: "center", justifyContent: "center" },
  optionRow: { gap: 8, paddingVertical: 8, marginBottom: 10 },
  optionChip: { borderRadius: 15, borderWidth: 1, borderColor: fixieColors.border, backgroundColor: fixieColors.backgroundAlt, paddingHorizontal: 11, paddingVertical: 8 },
  optionChipActive: { borderColor: fixieColors.gold, backgroundColor: "rgba(216,198,144,0.12)" },
  optionChipText: { color: fixieColors.textMuted, fontSize: 11, fontWeight: "700" },
  optionChipTextActive: { color: fixieColors.goldLight },
  dayOption: { width: 48, height: 38, borderRadius: 12, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  dayOptionActive: { backgroundColor: fixieColors.gold, borderColor: fixieColors.gold },
  dayOptionText: { color: fixieColors.textSecondary, fontSize: 11, fontWeight: "800" },
  dayOptionTextActive: { color: fixieColors.background },
  timeInputRow: { flexDirection: "row", gap: 10 },
  timeInput: { flex: 1 },
  clearEditButton: { alignItems: "center", paddingVertical: 12 },
  clearEditText: { color: fixieColors.textMuted, fontSize: 12 },
  addRow: { flexDirection: "row", gap: 9, marginTop: 18 },
  addInput: { flex: 1 },
  addButton: { width: 46, borderRadius: 14, backgroundColor: fixieColors.gold, alignItems: "center", justifyContent: "center" },
  editListRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: fixieColors.backgroundAlt, borderRadius: 14, padding: 13, marginBottom: 9, borderWidth: 1, borderColor: fixieColors.border },
  editListText: { color: fixieColors.text, fontSize: 13, fontWeight: "700", flex: 1 },
  editListCopy: { flex: 1 },
  editListMeta: { color: fixieColors.textMuted, fontSize: 11, marginTop: 2 },
  fullAddButton: { backgroundColor: fixieColors.gold, borderRadius: 14, paddingVertical: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  fullAddButtonText: { color: fixieColors.background, fontWeight: "900" },
});
