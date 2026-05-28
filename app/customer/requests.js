import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RequestModal from "../../components/request";
import { fixieColors, fixieShadows, fixieStatusColors } from "../../lib/fixie-theme";
import { subscribeToRequestChanges } from "../../lib/request-updates";
import { supabase } from "../../lib/supabase";
import CustomerBottomNav from "./components/CustomerBottomNav";

const STATUS_LABELS = {
  new: "New",
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

const STATUS_PRIORITY = {
  new: 0,
  pending: 1,
  in_progress: 2,
  completed: 3,
};

export default function CustomerRequests() {
  const [loading, setLoading] = useState(true);
  const [customerID, setCustomerID] = useState(null);
  const [requests, setRequests] = useState([]);
  const [reviewedCompanies, setReviewedCompanies] = useState({});
  const [selectedCompanyID, setSelectedCompanyID] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  const loadData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const storedID = await AsyncStorage.getItem("customerID");

      if (!storedID) {
        router.replace("/");
        return;
      }

      if (storedID === "guest") {
        setCustomerID("guest");
        setRequests([]);
        setReviewedCompanies({});
        return;
      }

      const parsedCustomerID = Number(storedID);
      setCustomerID(parsedCustomerID);

      const [requestResult, reviewResult] = await Promise.all([
        supabase
          .from("RequestTable")
          .select(`
            RequestID,
            CompanyID,
            RequestTitle,
            RequestNotes,
            RequestStatus,
            CompanyTable ( CompanyName, CompanyField )
          `)
          .eq("CustomerID", parsedCustomerID)
          .order("RequestID", { ascending: false }),
        supabase
          .from("ReviewTable")
          .select("CompanyID")
          .eq("CustomerID", parsedCustomerID),
      ]);

      if (requestResult.error) throw requestResult.error;
      if (reviewResult.error) throw reviewResult.error;

      const requestData = requestResult.data;
      const reviewData = reviewResult.data;

      const sortedRequests = [...(requestData || [])].sort((a, b) => {
        const statusDiff = (STATUS_PRIORITY[a.RequestStatus] ?? 99) - (STATUS_PRIORITY[b.RequestStatus] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return Number(b.RequestID || 0) - Number(a.RequestID || 0);
      });

      const reviewLookup = (reviewData || []).reduce((acc, item) => {
        acc[item.CompanyID] = true;
        return acc;
      }, {});

      setRequests(sortedRequests);
      setReviewedCompanies(reviewLookup);
    } catch (error) {
      Alert.alert("Error", error.message || "Could not load your requests.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = subscribeToRequestChanges(() => loadData(false));
      const interval = setInterval(() => loadData(false), 5000);

      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }, [])
  );

  const openReview = (companyID) => {
    setSelectedCompanyID(companyID);
    setReviewModalVisible(true);
  };

  const closeReviewModal = () => {
    setReviewModalVisible(false);
    setSelectedCompanyID(null);
  };

  const renderRequest = ({ item }) => {
    const statusColor = fixieStatusColors[item.RequestStatus] || fixieColors.info;
    const hasReview = !!reviewedCompanies[item.CompanyID];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{item.RequestTitle || item.CompanyTable?.CompanyField || "Request"}</Text>
            <Text style={styles.company}>{item.CompanyTable?.CompanyName || "Unknown Company"}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{STATUS_LABELS[item.RequestStatus] || "Open"}</Text>
          </View>
        </View>

        <Text style={styles.description}>{item.RequestNotes || "No request details were provided."}</Text>
        <Text style={styles.meta}>Request #{item.RequestID}</Text>

        {item.RequestStatus === "completed" && (
          <TouchableOpacity
            style={[styles.reviewButton, hasReview && styles.reviewedButton]}
            onPress={() => {
              if (!hasReview) openReview(item.CompanyID);
            }}
            disabled={hasReview}
          >
            <Text style={[styles.reviewButtonText, hasReview && styles.reviewedButtonText]}>
              {hasReview ? "Reviewed" : "Write Review"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.titleText}>My Requests</Text>
          <Text style={styles.subtitle}>Open requests stay at the top, and completed work moves below once it&apos;s done.</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={fixieColors.gold} />
        </View>
      ) : customerID === "guest" ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Sign in to view your requests.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.RequestID)}
          renderItem={renderRequest}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No requests yet.</Text>
              <Text style={styles.emptyText}>When you send requests to companies, they&apos;ll show up here.</Text>
            </View>
          }
        />
      )}

      <RequestModal
        visible={reviewModalVisible}
        onClose={closeReviewModal}
        companyID={selectedCompanyID}
        customerID={customerID}
        mode="review"
        onSubmitted={loadData}
      />

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
    paddingHorizontal: 24,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: fixieColors.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: fixieColors.border,
    ...fixieShadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: fixieColors.text,
  },
  company: {
    marginTop: 4,
    fontSize: 14,
    color: fixieColors.goldLight,
    fontWeight: "700",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: fixieColors.background,
    fontSize: 12,
    fontWeight: "800",
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: fixieColors.textSecondary,
  },
  meta: {
    marginTop: 10,
    fontSize: 12,
    color: fixieColors.textMuted,
  },
  reviewButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: fixieColors.gold,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...fixieShadows.glow,
  },
  reviewedButton: {
    backgroundColor: fixieColors.surfaceElevated,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  reviewButtonText: {
    color: fixieColors.background,
    fontWeight: "800",
  },
  reviewedButtonText: {
    color: fixieColors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
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
});
