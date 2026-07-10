import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { loadSavedCompanyIDs, toggleSavedCompany } from "../../lib/saved-companies";
import { supabase } from "../../lib/supabase";
import useFixieLayout from "../../lib/useFixieLayout";
import CustomerBottomNav from "./components/CustomerBottomNav";

const ALL_SERVICE_CATEGORY = { label: "All", icon: "grid-outline", keywords: [], custom: false };

const SERVICE_CATALOG = [
  { label: "Plumbing", icon: "water-outline", keywords: ["plumb", "drain", "pipe", "leak", "water", "toilet", "sink", "sewer"] },
  { label: "Electrical", icon: "flash-outline", keywords: ["electric", "wiring", "lighting", "breaker", "outlet", "panel"] },
  { label: "HVAC", icon: "thermometer-outline", keywords: ["hvac", "heating", "cooling", "air", "furnace", "ac", "a/c", "ventilation"] },
  { label: "Construction", icon: "construct-outline", keywords: ["construction", "build", "builder", "remodel", "renovation", "contractor"] },
  { label: "Roofing", icon: "home-outline", keywords: ["roof", "roofing", "gutter", "siding", "shingle"] },
  { label: "Painting", icon: "color-palette-outline", keywords: ["paint", "painting", "stain", "drywall", "wall"] },
  { label: "Cleaning", icon: "sparkles-outline", keywords: ["clean", "cleaning", "maid", "janitorial", "deep clean"] },
  { label: "Landscaping", icon: "leaf-outline", keywords: ["landscape", "landscaping", "lawn", "yard", "tree", "mulch"] },
  { label: "Handyman", icon: "hammer-outline", keywords: ["handyman", "repair", "maintenance", "general", "fix"] },
  { label: "Appliance Repair", icon: "cube-outline", keywords: ["appliance", "washer", "dryer", "fridge", "refrigerator", "oven", "dishwasher"] },
  { label: "Carpentry", icon: "hammer-outline", keywords: ["carpentry", "carpenter", "wood", "cabinet", "trim", "framing"] },
  { label: "Flooring", icon: "grid-outline", keywords: ["floor", "flooring", "tile", "hardwood", "carpet", "vinyl", "laminate"] },
  { label: "Windows", icon: "albums-outline", keywords: ["window", "windows", "glass", "screen", "door"] },
  { label: "Locksmith", icon: "lock-closed-outline", keywords: ["lock", "locksmith", "key", "deadbolt"] },
  { label: "Pest Control", icon: "bug-outline", keywords: ["pest", "bug", "termite", "exterminator", "rodent"] },
  { label: "Security", icon: "shield-checkmark-outline", keywords: ["security", "alarm", "camera", "surveillance", "smart lock"] },
  { label: "Snow Removal", icon: "snow-outline", keywords: ["snow", "ice", "plow", "salting"] },
  { label: "Masonry", icon: "business-outline", keywords: ["masonry", "brick", "stone", "concrete", "cement", "patio"] },
  { label: "Pressure Washing", icon: "water-outline", keywords: ["pressure wash", "power wash", "washing", "driveway"] },
  { label: "Junk Removal", icon: "trash-outline", keywords: ["junk", "trash", "haul", "hauling", "debris"] },
  { label: "Garage Doors", icon: "car-outline", keywords: ["garage", "garage door", "opener"] },
  { label: "Smart Home", icon: "desktop-outline", keywords: ["smart home", "wifi", "network", "thermostat", "device"] },
  { label: "Pool Service", icon: "water-outline", keywords: ["pool", "spa", "hot tub"] },
  { label: "Fencing", icon: "reorder-three-outline", keywords: ["fence", "fencing", "gate"] },
  { label: "Moving", icon: "cube-outline", keywords: ["moving", "mover", "packing"] },
];

function normalizeServiceText(value = "") {
  return String(value).trim().toLowerCase();
}

function splitCompanyServices(companyField = "") {
  return String(companyField)
    .split(/[,/&+;|]|\band\b/gi)
    .map((service) => service.trim())
    .filter(Boolean);
}

function titleCaseService(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function serviceMatchesCategory(company, category) {
  if (!category?.keywords?.length) return true;

  const serviceText = normalizeServiceText(company.CompanyField);
  return category.keywords.some((keyword) => serviceText.includes(normalizeServiceText(keyword)));
}

function buildServiceCategories(companies) {
  const companyCountByLabel = new Map();
  const customServices = new Map();

  companies.forEach((company) => {
    const serviceText = normalizeServiceText(company.CompanyField);
    if (!serviceText) return;

    SERVICE_CATALOG.forEach((service) => {
      if (service.keywords.some((keyword) => serviceText.includes(normalizeServiceText(keyword)))) {
        companyCountByLabel.set(service.label, (companyCountByLabel.get(service.label) || 0) + 1);
      }
    });

    splitCompanyServices(company.CompanyField).forEach((service) => {
      const normalizedService = normalizeServiceText(service);
      const isCoveredByCatalog = SERVICE_CATALOG.some((item) =>
        item.keywords.some((keyword) => normalizedService.includes(normalizeServiceText(keyword)))
      );

      if (!isCoveredByCatalog && normalizedService.length > 1) {
        const label = titleCaseService(service);
        const existing = customServices.get(label);
        customServices.set(label, {
          label,
          icon: "briefcase-outline",
          keywords: [normalizedService],
          custom: true,
          count: (existing?.count || 0) + 1,
        });
      }
    });
  });

  const catalogCategories = SERVICE_CATALOG.map((service) => ({
    ...service,
    custom: false,
    count: companyCountByLabel.get(service.label) || 0,
  }));

  const customCategories = Array.from(customServices.values()).sort((a, b) => a.label.localeCompare(b.label));

  return [
    { ...ALL_SERVICE_CATEGORY, count: companies.length },
    ...catalogCategories,
    ...customCategories,
  ];
}

export default function CustomerHome() {
  const layout = useFixieLayout();
  const [customerID, setCustomerID] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState("request");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedTrade, setSelectedTrade] = useState(ALL_SERVICE_CATEGORY);
  const [loading, setLoading] = useState(true);
  const [savedCompanyIDs, setSavedCompanyIDs] = useState([]);

  const serviceCategories = useMemo(() => buildServiceCategories(companies), [companies]);

  useEffect(() => {
    loadData();
  }, []);

  const refreshSavedCompanies = useCallback(async () => {
    const storedID = customerID || (await AsyncStorage.getItem("customerID"));
    if (!storedID) return;
    setSavedCompanyIDs(await loadSavedCompanyIDs(storedID));
  }, [customerID]);

  useFocusEffect(
    useCallback(() => {
      refreshSavedCompanies();
    }, [refreshSavedCompanies])
  );

  useEffect(() => {
    const query = search.trim().toLowerCase();
    const activeKeywords = selectedTrade.keywords || [];

    setFiltered(
      companies.filter((company) => {
        const name = company.CompanyName?.toLowerCase() || "";
        const serviceText = normalizeServiceText(company.CompanyField);
        const matchesSearch = !query || name.includes(query) || serviceText.includes(query);
        const matchesTrade = activeKeywords.length === 0 || serviceMatchesCategory(company, selectedTrade);

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
        setSavedCompanyIDs(await loadSavedCompanyIDs("guest"));
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
        setSavedCompanyIDs(await loadSavedCompanyIDs(parsedID));
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

  const handleToggleSaved = async (companyID) => {
    const storedID = customerID || (await AsyncStorage.getItem("customerID"));
    if (!storedID) return;
    setSavedCompanyIDs(await toggleSavedCompany(storedID, companyID));
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
      <View style={[styles.topHeader, layout.isDesktop && styles.desktopSection]}>
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

      <View style={[styles.searchWrap, layout.isDesktop && styles.desktopSearchWrap]}>
        <Ionicons name="search" size={18} color={fixieColors.textMuted} />
        <TextInput
          style={styles.searchBar}
          placeholder="Search companies or services..."
          placeholderTextColor={fixieColors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.content, layout.isDesktop && styles.desktopContent]} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, layout.isDesktop && styles.desktopHeroCard]}>
          <Text style={styles.heroTitle}>Find trusted contractors</Text>
          <Text style={styles.heroText}>Browse companies, review specialties, and manage your property repairs all in one place.</Text>
        </View>

        <View style={styles.tradeSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.boxTitle}>Browse by service</Text>
            {selectedTrade.label !== "All" && (
              <TouchableOpacity onPress={() => setSelectedTrade(ALL_SERVICE_CATEGORY)} style={styles.clearTradeButton}>
                <Text style={styles.clearTradeText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tradeScroller}>
            {serviceCategories.map((trade) => {
              const isActive = selectedTrade.label === trade.label;
              const isEmptyService = trade.label !== "All" && trade.count === 0 && !trade.custom;

              return (
                <TouchableOpacity
                  key={trade.label}
                  style={[styles.tradeButton, isEmptyService && styles.tradeButtonEmpty, isActive && styles.tradeButtonActive]}
                  onPress={() => setSelectedTrade(trade)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.tradeIconWrap, isActive && styles.tradeIconWrapActive]}>
                    <Ionicons name={trade.icon} size={24} color={isActive ? fixieColors.background : fixieColors.goldLight} />
                  </View>
                  <Text style={[styles.tradeLabel, isActive && styles.tradeLabelActive]} numberOfLines={1}>
                    {trade.label}
                  </Text>
                  <Text style={[styles.tradeCount, isActive && styles.tradeCountActive]}>
                    {trade.count || 0}
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

        <View style={[styles.cardsRow, layout.isDesktop && styles.desktopCardsRow]}>
          {filtered.map((company) => {
            const isSaved = savedCompanyIDs.includes(Number(company.CompanyID));

            return (
              <TouchableOpacity
                key={company.CompanyID}
                style={[styles.card, layout.isPhone && styles.phoneCard, layout.isDesktop && styles.desktopCard]}
                onPress={() => router.push({ pathname: "/customer/companyprofile", params: { id: company.CompanyID } })}
                activeOpacity={0.7}
              >
                <TouchableOpacity
                  style={[styles.saveButton, isSaved && styles.saveButtonActive]}
                  onPress={(e) => { e.stopPropagation(); handleToggleSaved(company.CompanyID); }}
                  activeOpacity={0.75}
                >
                  <Ionicons name={isSaved ? "heart" : "heart-outline"} size={18} color={isSaved ? fixieColors.background : fixieColors.goldLight} />
                </TouchableOpacity>

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
                </View>
              </TouchableOpacity>
            );
          })}
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
  desktopSection: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingTop: 22,
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
  desktopSearchWrap: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    marginHorizontal: 0,
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
  desktopContent: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingBottom: 34,
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
  desktopHeroCard: {
    padding: 28,
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
  tradeButtonEmpty: {
    opacity: 0.58,
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
  tradeCount: {
    marginTop: -4,
    color: fixieColors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  tradeLabelActive: {
    color: fixieColors.text,
    fontWeight: "800",
  },
  tradeCountActive: {
    color: fixieColors.goldLight,
  },
  cardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  desktopCardsRow: {
    gap: 16,
  },
  card: {
    width: "48%",
    backgroundColor: fixieColors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: fixieColors.border,
    position: "relative",
    ...fixieShadows.card,
  },
  saveButton: {
    position: "absolute",
    top: 22,
    right: 22,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(28, 28, 30, 0.82)",
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  saveButtonActive: {
    backgroundColor: fixieColors.gold,
    borderColor: fixieColors.goldLight,
  },
  phoneCard: {
    width: "100%",
  },
  desktopCard: {
    width: "23.9%",
    minWidth: 240,
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
});
