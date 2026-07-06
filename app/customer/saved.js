import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import FixieLogo from "../../components/FixieLogo";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";
import { loadSavedCompanyIDs, toggleSavedCompany } from "../../lib/saved-companies";
import { supabase } from "../../lib/supabase";
import CustomerBottomNav from "./components/CustomerBottomNav";

export default function SavedCompanies() {
  const [loading, setLoading] = useState(true);
  const [customerID, setCustomerID] = useState(null);
  const [savedCompanies, setSavedCompanies] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const storedID = await AsyncStorage.getItem("customerID");

      if (!storedID) {
        router.replace("/");
        return;
      }

      setCustomerID(storedID);
      const savedCompanyIDs = await loadSavedCompanyIDs(storedID);

      if (savedCompanyIDs.length === 0) {
        setSavedCompanies([]);
        return;
      }

      const { data, error } = await supabase
        .from("CompanyTable")
        .select("CompanyID, CompanyName, CompanyField, ProfileImageUrl")
        .in("CompanyID", savedCompanyIDs);

      if (error) throw error;

      const companyLookup = (data || []).reduce((acc, company) => {
        acc[Number(company.CompanyID)] = company;
        return acc;
      }, {});

      setSavedCompanies(savedCompanyIDs.map((id) => companyLookup[id]).filter(Boolean));
    } catch (error) {
      console.log("Saved companies load error:", error);
      setSavedCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const removeSavedCompany = async (companyID) => {
    const nextSavedCompanyIDs = await toggleSavedCompany(customerID, companyID);
    setSavedCompanies((currentCompanies) =>
      currentCompanies.filter((company) => nextSavedCompanyIDs.includes(Number(company.CompanyID)))
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleText}>Saved Companies</Text>
        <Text style={styles.subtitle}>Keep track of contractors you would like to work with later.</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={fixieColors.gold} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {savedCompanies.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={34} color={fixieColors.goldLight} />
              <Text style={styles.emptyTitle}>No saved companies yet.</Text>
              <Text style={styles.emptyText}>Tap the heart on any company to build your shortlist.</Text>
              <TouchableOpacity style={styles.browseButton} onPress={() => router.replace("/customer/home")}>
                <Text style={styles.browseButtonText}>Browse Companies</Text>
              </TouchableOpacity>
            </View>
          ) : (
            savedCompanies.map((company) => (
              <TouchableOpacity
                key={company.CompanyID}
                style={styles.card}
                onPress={() => router.push({ pathname: "/customer/companyprofile", params: { id: company.CompanyID } })}
                activeOpacity={0.75}
              >
                {company.ProfileImageUrl ? (
                  <Image source={{ uri: company.ProfileImageUrl }} style={styles.image} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <FixieLogo size={44} />
                  </View>
                )}

                <View style={styles.cardBody}>
                  <Text style={styles.companyName} numberOfLines={1}>{company.CompanyName}</Text>
                  <Text style={styles.companyField} numberOfLines={2}>{company.CompanyField || "General services"}</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={(e) => { e.stopPropagation(); router.push({ pathname: "/customer/companyprofile", params: { id: company.CompanyID } }); }}
                    >
                      <Text style={styles.viewButtonText}>View Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={(e) => { e.stopPropagation(); removeSavedCompany(company.CompanyID); }}
                    >
                      <Ionicons name="heart-dislike-outline" size={17} color={fixieColors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <CustomerBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: fixieColors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },
  card: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: fixieColors.surface,
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: fixieColors.border,
    ...fixieShadows.card,
  },
  image: {
    width: 92,
    height: 92,
    borderRadius: 18,
  },
  imagePlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 18,
    backgroundColor: fixieColors.surfaceElevated,
    borderWidth: 1,
    borderColor: fixieColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    justifyContent: "space-between",
  },
  companyName: {
    fontSize: 18,
    fontWeight: "800",
    color: fixieColors.text,
  },
  companyField: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: fixieColors.textSecondary,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  viewButton: {
    flex: 1,
    backgroundColor: fixieColors.gold,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  viewButtonText: {
    color: fixieColors.background,
    fontWeight: "800",
  },
  removeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fixieColors.surfaceElevated,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  emptyState: {
    minHeight: 360,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: fixieColors.border,
    backgroundColor: fixieColors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: fixieColors.text,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: fixieColors.textSecondary,
    textAlign: "center",
  },
  browseButton: {
    marginTop: 18,
    backgroundColor: fixieColors.gold,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  browseButtonText: {
    color: fixieColors.background,
    fontWeight: "800",
  },
});
