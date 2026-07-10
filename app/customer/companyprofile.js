import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import FixieLogo from "../../components/FixieLogo";
import { loadCompanyPosts } from "../../lib/company-posts";
import { formatPlannerItemForRequest, loadCustomerPlannerItems } from "../../lib/customer-planner";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";
import { notifyRequestsChanged } from "../../lib/request-updates";
import { isCompanySaved, toggleSavedCompany } from "../../lib/saved-companies";
import { supabase } from "../../lib/supabase";
import CustomerBottomNav from "./components/CustomerBottomNav";

export default function CompanyProfile() {
  const { id } = useLocalSearchParams();
  const [company, setCompany] = useState(null);
  const [requestText, setRequestText] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [posts, setPosts] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [customerID, setCustomerID] = useState(null);
  const [saved, setSaved] = useState(false);
  const [plannerItems, setPlannerItems] = useState([]);
  const [includedPlannerKeys, setIncludedPlannerKeys] = useState([]);

  const imagePosts = posts.filter((post) => post.mediaType === "image");
  const selectedPhoto = selectedPhotoIndex === null ? null : imagePosts[selectedPhotoIndex];

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      const companyID = Number(id);
      const storedCustomerID = await AsyncStorage.getItem("customerID");
      if (storedCustomerID) {
        setCustomerID(storedCustomerID);
        setSaved(await isCompanySaved(storedCustomerID, companyID));
        setPlannerItems(await loadCustomerPlannerItems(storedCustomerID));
      }
      const { data: companyData, error: companyError } = await supabase.from("CompanyTable").select("*").eq("CompanyID", companyID).single();
      if (companyError) throw companyError;
      setCompany(companyData);
      setPosts(await loadCompanyPosts(companyID));

      const { data: reviewData, error: reviewError } = await supabase
        .from("ReviewTable")
        .select(`CustomerID, Stars, Review, CustomerTable (CustomerName)`)
        .eq("CompanyID", companyID);
      if (reviewError) throw reviewError;
      const formattedReviews = reviewData || [];
      setReviews(formattedReviews);
      if (formattedReviews.length > 0) {
        const total = formattedReviews.reduce((sum, item) => sum + Number(item.Stars || 0), 0);
        setAvgRating((total / formattedReviews.length).toFixed(1));
      } else {
        setAvgRating(0);
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Could not load company profile.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadPage();
  }, [id, loadPage]);

  const handleRequest = async () => {
    try {
      const selectedPlannerItems = plannerItems.filter((item) => includedPlannerKeys.includes(item.key));
      const plannerText = selectedPlannerItems.map(formatPlannerItemForRequest).join("\n\n---\n\n");
      const requestNotes = [requestText.trim(), plannerText].filter(Boolean).join("\n\n---\n\n");

      if (!requestNotes.trim()) {
        Alert.alert("Missing info", "Please enter your request details.");
        return;
      }
      const storedCustomerID = await AsyncStorage.getItem("customerID");
      if (!storedCustomerID) {
        Alert.alert("Login required", "Please log in as a customer first.");
        return;
      }
      if (!company?.CompanyID) {
        Alert.alert("Error", "Company information is missing.");
        return;
      }

      setSubmitting(true);
      const companyID = Number(company.CompanyID);
      const customerID = Number(storedCustomerID);

      const { data: customerData, error: customerError } = await supabase
        .from("CustomerTable")
        .select("CustomerID, CustomerName, CustomerPhone, CustomerEmail")
        .eq("CustomerID", customerID)
        .single();
      if (customerError) throw customerError;

      const { error: requestError } = await supabase.from("RequestTable").insert([
        { CompanyID: companyID, CustomerID: customerID, RequestTitle: null, RequestNotes: requestNotes, RequestStatus: "new" },
      ]);
      if (requestError) throw requestError;

      const { data: existingCRM, error: existingCRMError } = await supabase.from("CRMTable").select("CRMID").eq("CompanyID", companyID).eq("CustomerID", customerID).maybeSingle();
      if (existingCRMError) throw existingCRMError;
      if (!existingCRM) {
        const { error: crmInsertError } = await supabase.from("CRMTable").insert([
          {
            CompanyID: companyID,
            CustomerID: customerID,
            ContactName: customerData?.CustomerName || "",
            ContactPhone: customerData?.CustomerPhone ? String(customerData.CustomerPhone) : "",
            ContactEmail: customerData?.CustomerEmail || "",
            Relationship: "active_customer",
            Notes: "",
            SourceType: "request",
          },
        ]);
        if (crmInsertError) throw crmInsertError;
      }

      Alert.alert("Success", "Request submitted successfully.");
      notifyRequestsChanged();
      setRequestText("");
      setIncludedPlannerKeys([]);
      setShowRequestForm(false);
    } catch (error) {
      Alert.alert("Error", error?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSaved = async () => {
    if (!company?.CompanyID) return;
    const storedCustomerID = customerID || (await AsyncStorage.getItem("customerID"));
    if (!storedCustomerID) {
      Alert.alert("Login required", "Please log in as a customer first.");
      return;
    }

    const nextSavedCompanyIDs = await toggleSavedCompany(storedCustomerID, company.CompanyID);
    setCustomerID(storedCustomerID);
    setSaved(nextSavedCompanyIDs.includes(Number(company.CompanyID)));
  };

  const togglePlannerItem = (item) => {
    setIncludedPlannerKeys((currentKeys) =>
      currentKeys.includes(item.key)
        ? currentKeys.filter((key) => key !== item.key)
        : [...currentKeys, item.key]
    );
  };

  const openPhoto = (post) => {
    const nextIndex = imagePosts.findIndex((item) => item.id === post.id);
    if (nextIndex >= 0) setSelectedPhotoIndex(nextIndex);
  };

  const closePhoto = () => {
    setSelectedPhotoIndex(null);
  };

  const showPreviousPhoto = () => {
    setSelectedPhotoIndex((current) => {
      if (current === null || imagePosts.length === 0) return current;
      return current === 0 ? imagePosts.length - 1 : current - 1;
    });
  };

  const showNextPhoto = () => {
    setSelectedPhotoIndex((current) => {
      if (current === null || imagePosts.length === 0) return current;
      return current === imagePosts.length - 1 ? 0 : current + 1;
    });
  };

  if (loading) {
    return <View style={styles.center}><Text style={styles.loadingText}>Loading...</Text></View>;
  }

  if (!company) {
    return <View style={styles.center}><Text style={styles.loadingText}>Company not found.</Text></View>;
  }

  return (
    <>
    <View style={styles.screen}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.replace("/customer/home")} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={20} color={fixieColors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToggleSaved} style={[styles.saveHeaderButton, saved && styles.saveHeaderButtonActive]}>
          <Ionicons name={saved ? "heart" : "heart-outline"} size={20} color={saved ? fixieColors.background : fixieColors.goldLight} />
          <Text style={[styles.saveHeaderText, saved && styles.saveHeaderTextActive]}>{saved ? "Saved" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        {company.ProfileImageUrl ? <Image source={{ uri: company.ProfileImageUrl }} style={styles.profileImage} /> : <FixieLogo size={72} />}
        <Text style={styles.companyName}>{company.CompanyName}</Text>
        <Text style={styles.infoText}>Field: {company.CompanyField || "N/A"}</Text>
        <Text style={styles.infoText}>Email: {company.CompanyEmail || "N/A"}</Text>
        <Text style={styles.infoText}>Phone: {company.CompanyPhone || "N/A"}</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.ratingText}>Rating: {avgRating || "0.0"}</Text>
          <Text style={styles.ratingCount}>({reviews.length} {reviews.length === 1 ? "review" : "reviews"})</Text>
        </View>
      </View>

      <View style={styles.requestBox}>
        <TouchableOpacity
          style={styles.requestCtaButton}
          onPress={() => setShowRequestForm((current) => !current)}
          activeOpacity={0.82}
        >
          <Ionicons name="paper-plane-outline" size={19} color={fixieColors.background} />
          <Text style={styles.requestCtaText}>Make a Request</Text>
          <Ionicons name={showRequestForm ? "chevron-up" : "chevron-down"} size={18} color={fixieColors.background} />
        </TouchableOpacity>

        {showRequestForm ? (
          <View style={styles.requestForm}>
            <TextInput style={styles.input} placeholder="Enter your request here" placeholderTextColor={fixieColors.textMuted} multiline value={requestText} onChangeText={setRequestText} />
            {plannerItems.length > 0 ? (
              <View style={styles.plannerBox}>
                <Text style={styles.plannerTitle}>Include planner templates</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plannerScroller}>
                  {plannerItems.map((item) => {
                    const selected = includedPlannerKeys.includes(item.key);

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.plannerChip, selected && styles.plannerChipSelected]}
                        onPress={() => togglePlannerItem(item)}
                      >
                        <Ionicons
                          name={selected ? "checkmark-circle" : "add-circle-outline"}
                          size={17}
                          color={selected ? fixieColors.background : fixieColors.goldLight}
                        />
                        <View style={styles.plannerChipTextWrap}>
                          <Text style={[styles.plannerChipText, selected && styles.plannerChipTextSelected]} numberOfLines={1}>
                            {item.label}
                          </Text>
                          <Text style={[styles.plannerChipMeta, selected && styles.plannerChipTextSelected]} numberOfLines={1}>
                            {item.type}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
            <TouchableOpacity style={[styles.button, submitting && styles.buttonDisabled]} onPress={handleRequest} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? "Submitting..." : "Submit Request"}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={styles.portfolioSection}>
        <View style={styles.portfolioHeader}>
          <Text style={styles.sectionTitle}>Past Work</Text>
          <Text style={styles.portfolioCount}>{imagePosts.length} {imagePosts.length === 1 ? "post" : "posts"}</Text>
        </View>
        <Text style={styles.galleryIntro}>Scroll through project photos shared by {company.CompanyName}.</Text>

        {imagePosts.length === 0 ? (
          <View style={styles.emptyPortfolioCard}>
            <Ionicons name="images-outline" size={34} color={fixieColors.goldLight} />
            <Text style={styles.emptyPortfolioTitle}>No project photos yet</Text>
            <Text style={styles.emptyPortfolioText}>This company has not added portfolio work to their profile.</Text>
          </View>
        ) : (
          <View style={styles.workGrid}>
            {imagePosts.map((post, index) => (
              <TouchableOpacity key={post.id} style={styles.workTile} activeOpacity={0.9} onPress={() => openPhoto(post)}>
                <Image source={{ uri: post.url }} style={[styles.workTileImage, index % 3 === 1 && styles.workTileImageTall]} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.reviewListBox}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        {reviews.length === 0 ? <Text style={styles.emptyText}>No reviews yet.</Text> : reviews.map((item, index) => (
          <View key={`${item.CustomerID}-${index}`} style={styles.reviewCard}>
            <View style={styles.reviewTopRow}>
              <Text style={styles.reviewName}>{item.CustomerTable?.CustomerName || "Customer"}</Text>
              <Text style={styles.reviewStars}>{"★".repeat(Number(item.Stars || 0))}</Text>
            </View>
            <Text style={styles.reviewBody}>{item.Review || ""}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
    <CustomerBottomNav />
    </View>
    <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={closePhoto}>
      <View style={styles.photoModal}>
        <TouchableOpacity style={styles.photoCloseButton} onPress={closePhoto}>
          <Ionicons name="close" size={24} color={fixieColors.text} />
        </TouchableOpacity>

        {imagePosts.length > 1 ? (
          <TouchableOpacity style={[styles.photoArrow, styles.photoArrowLeft]} onPress={showPreviousPhoto}>
            <Ionicons name="chevron-back" size={34} color={fixieColors.text} />
          </TouchableOpacity>
        ) : null}

        <ScrollView
          style={styles.photoZoomWrap}
          contentContainerStyle={styles.photoZoomContent}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
        >
          {selectedPhoto ? <Image source={{ uri: selectedPhoto.url }} style={styles.photoModalImage} resizeMode="contain" /> : null}
        </ScrollView>

        {imagePosts.length > 1 ? (
          <TouchableOpacity style={[styles.photoArrow, styles.photoArrowRight]} onPress={showNextPhoto}>
            <Ionicons name="chevron-forward" size={34} color={fixieColors.text} />
          </TouchableOpacity>
        ) : null}

        {selectedPhoto ? (
          <View style={styles.photoFooter}>
            <Text style={styles.photoCounter}>{selectedPhotoIndex + 1} / {imagePosts.length}</Text>
            {selectedPhoto.caption ? <Text style={styles.photoCaption}>{selectedPhoto.caption}</Text> : null}
          </View>
        ) : null}
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: fixieColors.background },
  scroll: { flex: 1, backgroundColor: fixieColors.background },
  container: { flexGrow: 1, backgroundColor: fixieColors.background, padding: 20, paddingBottom: 28 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: fixieColors.background },
  loadingText: { color: fixieColors.textSecondary },
  headerRow: { marginBottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  saveHeaderButton: { minWidth: 92, height: 42, borderRadius: 21, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: 14 },
  saveHeaderButtonActive: { backgroundColor: fixieColors.gold, borderColor: fixieColors.goldLight, ...fixieShadows.glow },
  saveHeaderText: { color: fixieColors.goldLight, fontWeight: "800", fontSize: 14 },
  saveHeaderTextActive: { color: fixieColors.background },
  profileCard: { backgroundColor: fixieColors.surfaceElevated, borderRadius: 20, padding: 20, marginBottom: 20, alignItems: "center", borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  profileImage: { width: 96, height: 96, borderRadius: 48, marginBottom: 8 },
  companyName: { fontSize: 28, fontWeight: "800", color: fixieColors.text, marginVertical: 15 },
  infoText: { fontSize: 16, color: fixieColors.textSecondary, marginBottom: 10 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 },
  ratingText: { fontSize: 18, fontWeight: "800", color: fixieColors.goldLight },
  ratingCount: { fontSize: 14, color: fixieColors.textMuted },
  galleryIntro: { fontSize: 14, color: fixieColors.textSecondary, marginBottom: 14, lineHeight: 20 },
  portfolioSection: { marginBottom: 20 },
  portfolioHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  portfolioCount: { color: fixieColors.textMuted, fontSize: 13, fontWeight: "700" },
  workGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  workTile: { width: "48%", overflow: "hidden", backgroundColor: fixieColors.surfaceElevated, borderRadius: 18, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  workTileImage: { width: "100%", height: 178, backgroundColor: fixieColors.surfaceElevated },
  workTileImageTall: { height: 218 },
  emptyPortfolioCard: { minHeight: 170, borderRadius: 18, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center", padding: 22, ...fixieShadows.card },
  emptyPortfolioTitle: { color: fixieColors.text, fontSize: 17, fontWeight: "900", marginTop: 10 },
  emptyPortfolioText: { color: fixieColors.textSecondary, fontSize: 13, textAlign: "center", lineHeight: 19, marginTop: 6 },
  requestBox: { backgroundColor: fixieColors.surface, borderRadius: 20, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  requestCtaButton: { minHeight: 54, borderRadius: 16, backgroundColor: fixieColors.gold, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, ...fixieShadows.glow },
  requestCtaText: { color: fixieColors.background, fontSize: 16, fontWeight: "900", flex: 1, textAlign: "center" },
  requestForm: { marginTop: 14 },
  reviewListBox: { backgroundColor: fixieColors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: fixieColors.text, marginBottom: 15 },
  input: { minHeight: 120, backgroundColor: fixieColors.backgroundAlt, borderWidth: 1, borderColor: fixieColors.border, borderRadius: 16, padding: 12, textAlignVertical: "top", marginBottom: 15, color: fixieColors.text },
  plannerBox: { marginBottom: 15 },
  plannerTitle: { color: fixieColors.text, fontSize: 14, fontWeight: "800", marginBottom: 9 },
  plannerScroller: { gap: 8, paddingRight: 12 },
  plannerChip: { maxWidth: 190, minHeight: 56, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: fixieColors.backgroundAlt, borderWidth: 1, borderColor: fixieColors.border },
  plannerChipSelected: { backgroundColor: fixieColors.gold, borderColor: fixieColors.goldLight },
  plannerChipTextWrap: { flex: 1, minWidth: 0 },
  plannerChipText: { color: fixieColors.text, fontSize: 12, fontWeight: "800" },
  plannerChipMeta: { color: fixieColors.textMuted, fontSize: 11, fontWeight: "700", marginTop: 2 },
  plannerChipTextSelected: { color: fixieColors.background },
  button: { backgroundColor: fixieColors.gold, paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: fixieColors.background, fontWeight: "800", fontSize: 16 },
  emptyText: { fontSize: 15, color: fixieColors.textMuted },
  reviewCard: { backgroundColor: fixieColors.surfaceElevated, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: fixieColors.border },
  reviewTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, alignItems: "center" },
  reviewName: { fontSize: 16, fontWeight: "700", color: fixieColors.text },
  reviewStars: { fontSize: 16, color: fixieColors.goldLight, fontWeight: "700" },
  reviewBody: { fontSize: 14, color: fixieColors.textSecondary, lineHeight: 20 },
  photoModal: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.94)", justifyContent: "center", alignItems: "center" },
  photoCloseButton: { position: "absolute", top: 48, right: 22, zIndex: 4, width: 46, height: 46, borderRadius: 23, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  photoZoomWrap: { width: "100%", height: "100%" },
  photoZoomContent: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  photoModalImage: { width: "100%", height: "78%" },
  photoArrow: { position: "absolute", top: "48%", zIndex: 3, width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(42, 42, 45, 0.82)", borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  photoArrowLeft: { left: 16 },
  photoArrowRight: { right: 16 },
  photoFooter: { position: "absolute", left: 20, right: 20, bottom: 34, alignItems: "center" },
  photoCounter: { color: fixieColors.goldLight, fontWeight: "800", marginBottom: 8 },
  photoCaption: { color: fixieColors.text, fontSize: 15, textAlign: "center", lineHeight: 21 },
});
