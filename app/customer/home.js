import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FixieLogo from "../../components/FixieLogo";
import RequestModal from "../../components/request";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";
import { supabase } from "../../lib/supabase";
import CustomerBottomNav from "./components/CustomerBottomNav";

const TRADE_CATEGORIES = [
  { label: "All", icon: "grid-outline", keywords: [] },
  { label: "Plumbing", icon: "water-outline", keywords: ["plumb", "drain", "pipe", "leak", "water"] },
  { label: "Electrical", icon: "flash-outline", keywords: ["electric", "wiring", "lighting", "breaker"] },
  { label: "HVAC", icon: "thermometer-outline", keywords: ["hvac", "heating", "cooling", "air", "furnace", "ac"] },
  { label: "Construction", icon: "construct-outline", keywords: ["construction", "build", "remodel", "renovation"] },
  { label: "Roofing", icon: "home-outline", keywords: ["roof", "gutter", "siding"] },
  { label: "Painting", icon: "color-palette-outline", keywords: ["paint", "drywall", "wall"] },
  { label: "Cleaning", icon: "sparkles-outline", keywords: ["clean", "maid", "janitorial"] },
  { label: "Landscaping", icon: "leaf-outline", keywords: ["landscape", "lawn", "yard", "tree"] },
  { label: "Handyman", icon: "hammer-outline", keywords: ["handyman", "repair", "maintenance", "general"] },
];

export default function CustomerHome() {
  const [customerID, setCustomerID] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState("request");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [companies, setCompanies] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedTrade, setSelectedTrade] = useState(TRADE_CATEGORIES[0]);
  const [loading, setLoading] = useState(true);
  const [reviewsVisible, setReviewsVisible] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState("0.0");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const query = search.trim().toLowerCase();
    const activeKeywords = selectedTrade.keywords;

    setFiltered(
      companies.filter((company) => {
        const name = company.CompanyName?.toLowerCase() || "";
        const field = company.CompanyField?.toLowerCase() || "";
        const matchesSearch = !query || name.includes(query) || field.includes(query);
        const matchesTrade = activeKeywords.length === 0 || activeKeywords.some((keyword) => field.includes(keyword));

        return matchesSearch && matchesTrade;
      })
    );
  }, [search, selectedTrade, companies]);

  const loadData = async () => {
    try {
      const storedID = await AsyncStorage.getItem("customerID");
      if (!storedID) {
        router.replace("/");
        return;
      }

      if (storedID === "guest") {
        setCustomerID("guest");
        setCustomerData({ CustomerName: "Guest", CustomerUsername: "guest" });
        const { data, error } = await supabase
          .from("CompanyTable")
          .select("CompanyID, CompanyName, CompanyField, ProfileImageUrl");
        if (!error && data) {
          setCompanies(data);
          setFiltered(data);
        }
      } else {
        const parsedID = Number(storedID);
        setCustomerID(parsedID);
        const [customerResult, companyResult] = await Promise.all([
          supabase
            .from("CustomerTable")
            .select("*")
            .eq("CustomerID", parsedID)
            .maybeSingle(),
          supabase
            .from("CompanyTable")
            .select("CompanyID, CompanyName, CompanyField, ProfileImageUrl"),
        ]);
        if (customerResult.data) setCustomerData(customerResult.data);
        if (!companyResult.error && companyResult.data) {
          setCompanies(companyResult.data);
          setFiltered(companyResult.data);
        }
      }
    } catch (e) {
      console.log("Customer home error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("customerID");
    router.replace("/");
  };

  const openRequest = (companyID) => {
    setSelectedCompany(companyID);
    setModalMode("request");
    setModalVisible(true);
  };

  const openReviews = async (company) => {
    setSelectedCompany(company.CompanyID);
    setSelectedCompanyName(company.CompanyName || "Company");
    setReviews([]);
    setAvgRating("0.0");
    setReviewsVisible(true);
    setReviewsLoading(true);

    try {
      const { data, error } = await supabase
        .from("ReviewTable")
        .select(`CustomerID, Stars, Review, CustomerTable (CustomerName)`)
        .eq("CompanyID", company.CompanyID);

      if (error) throw error;

      const nextReviews = data || [];
      setReviews(nextReviews);
      if (nextReviews.length > 0) {
        const total = nextReviews.reduce((sum, item) => sum + Number(item.Stars || 0), 0);
        setAvgRating((total / nextReviews.length).toFixed(1));
      }
    } catch (error) {
      console.log("Reviews load error:", error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={fixieColors.gold} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <FixieLogo size={52} />
          <View>
            <Text style={styles.eyebrow}>Customer Dashboard</Text>
            <Text style={styles.customerName}>{customerData?.CustomerName || "Customer"}</Text>
            <Text style={styles.customerSubText}>{customerData?.CustomerUsername || ""}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push("/customer/profile")} style={styles.iconButton}>
            <Ionicons name="person-circle-outline" size={26} color={fixieColors.goldLight} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <Ionicons name="log-out-outline" size={22} color={fixieColors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={fixieColors.textMuted} />
        <TextInput
          style={styles.searchBar}
          placeholder="Search companies or trades..."
          placeholderTextColor={fixieColors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Find trusted contractors</Text>
          <Text style={styles.heroText}>Browse companies, review specialties, and manage your property repairs all in one place.</Text>
        </View>

        <View style={styles.tradeSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.boxTitle}>Browse by trade</Text>
            {selectedTrade.label !== "All" && (
              <TouchableOpacity onPress={() => setSelectedTrade(TRADE_CATEGORIES[0])} style={styles.clearTradeButton}>
                <Text style={styles.clearTradeText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tradeScroller}>
            {TRADE_CATEGORIES.map((trade) => {
              const isActive = selectedTrade.label === trade.label;

              return (
                <TouchableOpacity
                  key={trade.label}
                  style={[styles.tradeButton, isActive && styles.tradeButtonActive]}
                  onPress={() => setSelectedTrade(trade)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.tradeIconWrap, isActive && styles.tradeIconWrapActive]}>
                    <Ionicons name={trade.icon} size={24} color={isActive ? fixieColors.background : fixieColors.goldLight} />
                  </View>
                  <Text style={[styles.tradeLabel, isActive && styles.tradeLabelActive]} numberOfLines={1}>
                    {trade.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.boxTitle}>Companies</Text>
          <Text style={styles.sectionMeta}>
            {filtered.length} {selectedTrade.label === "All" ? "available" : selectedTrade.label.toLowerCase()}
          </Text>
        </View>

        <View style={styles.cardsRow}>
          {filtered.map((company) => (
            <TouchableOpacity key={company.CompanyID} style={styles.card} onPress={() => router.push({ pathname: "/customer/companyprofile", params: { id: company.CompanyID } })} activeOpacity={0.7}>
              {company.ProfileImageUrl ? (
                <Image source={{ uri: company.ProfileImageUrl }} style={styles.image} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderText}>{company.CompanyName?.[0] ?? "?"}</Text>
                </View>
              )}
              <Text style={styles.imageText} numberOfLines={1}>
                {company.CompanyName}
              </Text>
              <Text style={styles.descriptionText} numberOfLines={2}>
                {company.CompanyField || "General services"}
              </Text>

              <View style={styles.cardActionsContainer}>
                <TouchableOpacity
                  style={styles.cardAction}
                  onPress={(e) => { e.stopPropagation(); openRequest(company.CompanyID); }}
                >
                  <Text style={styles.cardActionText}>Request</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cardAction, styles.reviewAction]}
                  onPress={(e) => { e.stopPropagation(); openReviews(company); }}
                >
                  <Ionicons name="star" size={12} color={fixieColors.goldLight} />
                  <Text style={styles.cardActionText}>Reviews</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={28} color={fixieColors.goldLight} />
              <Text style={styles.emptyTitle}>No matching companies</Text>
              <Text style={styles.emptyText}>Try another trade or search term to find the right contractor.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <CustomerBottomNav />

      <RequestModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        companyID={selectedCompany}
        customerID={customerID}
        mode={modalMode}
      />

      <Modal visible={reviewsVisible} transparent animationType="slide" onRequestClose={() => setReviewsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedCompanyName}</Text>
                <Text style={styles.modalSubtitle}>Customer reviews</Text>
              </View>
              <TouchableOpacity onPress={() => setReviewsVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={fixieColors.text} />
              </TouchableOpacity>
            </View>

            {reviewsLoading ? (
              <View style={styles.reviewsLoading}>
                <ActivityIndicator color={fixieColors.gold} />
              </View>
            ) : (
              <>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={20} color={fixieColors.goldLight} />
                  <Text style={styles.ratingText}>{avgRating}</Text>
                  <Text style={styles.ratingCount}>({reviews.length} {reviews.length === 1 ? "review" : "reviews"})</Text>
                </View>

                <ScrollView style={styles.reviewsList} showsVerticalScrollIndicator={false}>
                  {reviews.length === 0 ? (
                    <Text style={styles.noReviews}>No reviews yet.</Text>
                  ) : (
                    reviews.map((item, index) => (
                      <View key={`${item.CustomerID}-${index}`} style={styles.reviewCard}>
                        <View style={styles.reviewTopRow}>
                          <Text style={styles.reviewName}>{item.CustomerTable?.CustomerName || "Customer"}</Text>
                          <View style={styles.reviewStarsRow}>
                            {[1, 2, 3, 4, 5].map((value) => (
                              <Ionicons
                                key={value}
                                name={value <= Number(item.Stars || 0) ? "star" : "star-outline"}
                                size={14}
                                color={fixieColors.goldLight}
                              />
                            ))}
                          </View>
                        </View>
                        <Text style={styles.reviewBody}>{item.Review || ""}</Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: fixieColors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: fixieColors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  topHeader: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  eyebrow: {
    color: fixieColors.goldLight,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  customerName: {
    fontSize: 24,
    fontWeight: "800",
    color: fixieColors.text,
    marginTop: 4,
  },
  customerSubText: {
    fontSize: 13,
    color: fixieColors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fixieColors.surface,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  searchWrap: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: fixieColors.surface,
    borderWidth: 1,
    borderColor: fixieColors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBar: {
    flex: 1,
    color: fixieColors.text,
    paddingVertical: 14,
  },
  content: {
    padding: 18,
    paddingTop: 8,
    paddingBottom: 22,
  },
  heroCard: {
    backgroundColor: fixieColors.surfaceElevated,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: fixieColors.border,
    marginBottom: 18,
    ...fixieShadows.card,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: fixieColors.text,
  },
  heroText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: fixieColors.textSecondary,
  },
  tradeSection: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  boxTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: fixieColors.text,
  },
  sectionMeta: {
    color: fixieColors.textMuted,
    fontSize: 12,
  },
  clearTradeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  clearTradeText: {
    color: fixieColors.goldLight,
    fontSize: 12,
    fontWeight: "800",
  },
  tradeScroller: {
    gap: 12,
    paddingRight: 18,
  },
  tradeButton: {
    width: 92,
    alignItems: "center",
    gap: 8,
  },
  tradeButtonActive: {
    transform: [{ translateY: -1 }],
  },
  tradeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fixieColors.surface,
    borderWidth: 1,
    borderColor: fixieColors.border,
    ...fixieShadows.card,
  },
  tradeIconWrapActive: {
    backgroundColor: fixieColors.gold,
    borderColor: fixieColors.goldLight,
    ...fixieShadows.glow,
  },
  tradeLabel: {
    width: "100%",
    color: fixieColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  tradeLabelActive: {
    color: fixieColors.text,
    fontWeight: "800",
  },
  cardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "48%",
    backgroundColor: fixieColors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: fixieColors.border,
    ...fixieShadows.card,
  },
  image: {
    width: "100%",
    height: 110,
    borderRadius: 16,
    marginBottom: 10,
  },
  imagePlaceholder: {
    width: "100%",
    height: 110,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: fixieColors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  placeholderText: {
    fontSize: 28,
    fontWeight: "800",
    color: fixieColors.goldLight,
  },
  imageText: {
    fontSize: 15,
    fontWeight: "700",
    color: fixieColors.text,
  },
  descriptionText: {
    fontSize: 12,
    color: fixieColors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
    minHeight: 36,
  },
  cardActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 6,
  },
  cardAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(200, 169, 106, 0.16)",
  },
  reviewAction: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  cardActionText: {
    color: fixieColors.goldLight,
    fontSize: 11,
    fontWeight: "700",
  },
  emptyState: {
    width: "100%",
    minHeight: 150,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: fixieColors.border,
    backgroundColor: fixieColors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyTitle: {
    marginTop: 10,
    color: fixieColors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  emptyText: {
    marginTop: 6,
    color: fixieColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  bottomBar: {
    flexDirection: "row",
    backgroundColor: fixieColors.surface,
    borderTopWidth: 1,
    borderTopColor: fixieColors.border,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
  },
  navButtonActive: {
    backgroundColor: fixieColors.gold,
  },
  navText: {
    marginTop: 4,
    fontSize: 12,
    color: fixieColors.textSecondary,
    fontWeight: "700",
  },
  navTextActive: {
    marginTop: 4,
    fontSize: 12,
    color: fixieColors.background,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: fixieColors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "80%",
    backgroundColor: fixieColors.surface,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: fixieColors.border,
    ...fixieShadows.card,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: fixieColors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: fixieColors.textSecondary,
    marginTop: 4,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fixieColors.surfaceElevated,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: "800",
    color: fixieColors.goldLight,
  },
  ratingCount: {
    fontSize: 13,
    color: fixieColors.textMuted,
  },
  reviewsList: {
    maxHeight: 320,
    marginBottom: 16,
  },
  reviewsLoading: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  noReviews: {
    color: fixieColors.textMuted,
    fontSize: 15,
    textAlign: "center",
    paddingVertical: 20,
  },
  reviewCard: {
    backgroundColor: fixieColors.surfaceElevated,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  reviewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reviewName: {
    fontSize: 15,
    fontWeight: "700",
    color: fixieColors.text,
  },
  reviewStarsRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewBody: {
    fontSize: 13,
    color: fixieColors.textSecondary,
    lineHeight: 19,
  },
  modalRequestButton: {
    backgroundColor: fixieColors.gold,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    ...fixieShadows.glow,
  },
  modalRequestButtonText: {
    color: fixieColors.background,
    fontSize: 16,
    fontWeight: "800",
  },
});
