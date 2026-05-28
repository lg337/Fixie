import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

export default function CustomerHome() {
  const [customerID, setCustomerID] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState("request");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (search.trim() === "") {
      setFiltered(companies);
    } else {
      setFiltered(
        companies.filter(
          (c) =>
            c.CompanyName?.toLowerCase().includes(search.toLowerCase()) ||
            c.CompanyField?.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, companies]);

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

  const openReview = (companyID) => {
    setSelectedCompany(companyID);
    setModalMode("review");
    setModalVisible(true);
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

        <View style={styles.sectionHeader}>
          <Text style={styles.boxTitle}>Companies</Text>
          <Text style={styles.sectionMeta}>{filtered.length} available</Text>
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
                  onPress={(e) => { e.stopPropagation(); openReview(company.CompanyID); }}
                >
                  <Ionicons name="star" size={12} color={fixieColors.goldLight} />
                  <Text style={styles.cardActionText}>Review</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
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
  reviewStars: {
    fontSize: 15,
    color: fixieColors.goldLight,
    fontWeight: "700",
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
