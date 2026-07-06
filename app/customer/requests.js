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
import {
  PROJECT_TRACKER_STAGES,
  getTrackerProgress,
  getTrackerPriority,
  getTrackerStage,
  getTrackerStageIndex,
  isCompletedRequestStatus,
} from "../../lib/project-tracker";
import { subscribeToRequestChanges } from "../../lib/request-updates";
import { supabase } from "../../lib/supabase";
import CustomerBottomNav from "./components/CustomerBottomNav";

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
        const statusDiff = getTrackerPriority(a.RequestStatus) - getTrackerPriority(b.RequestStatus);
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
    const trackerStage = getTrackerStage(item.RequestStatus);
    const activeIndex = getTrackerStageIndex(item.RequestStatus);
    const progress = getTrackerProgress(item.RequestStatus);
    const statusColor = fixieStatusColors[item.RequestStatus] || fixieColors.gold;
    const hasReview = !!reviewedCompanies[item.CompanyID];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{item.RequestTitle || item.CompanyTable?.CompanyField || "Request"}</Text>
            <Text style={styles.company}>{item.CompanyTable?.CompanyName || "Unknown Company"}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{trackerStage.label}</Text>
          </View>
        </View>

        <Text style={styles.description}>{item.RequestNotes || "No request details were provided."}</Text>
        <View style={styles.trackerPanel}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressLabel}>Project tracker</Text>
              <Text style={styles.progressStage}>{progress}% complete</Text>
            </View>
            <Text style={styles.scheduleText}>{trackerStage.schedule}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.stageRow}>
            {PROJECT_TRACKER_STAGES.map((stage, index) => {
              const reached = index <= activeIndex;
              return (
                <View key={stage.key} style={styles.stageItem}>
                  <View style={[styles.stageDot, reached && styles.stageDotActive]}>
                    {reached ? <Text style={styles.stageDotText}>{index + 1}</Text> : null}
                  </View>
                  <Text style={[styles.stageText, reached && styles.stageTextActive]} numberOfLines={2}>
                    {stage.shortLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
        <Text style={styles.meta}>Request #{item.RequestID}</Text>

        {isCompletedRequestStatus(item.RequestStatus) && (
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
  trackerPanel: {
    marginTop: 14,
    backgroundColor: fixieColors.backgroundAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: fixieColors.border,
    padding: 14,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: fixieColors.goldLight,
    textTransform: "uppercase",
  },
  progressStage: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "800",
    color: fixieColors.text,
  },
  scheduleText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: fixieColors.textSecondary,
    textAlign: "right",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: fixieColors.surfaceElevated,
    overflow: "hidden",
    marginTop: 14,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: fixieColors.gold,
  },
  stageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 14,
  },
  stageItem: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  stageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: fixieColors.surfaceElevated,
    borderWidth: 1,
    borderColor: fixieColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stageDotActive: {
    backgroundColor: fixieColors.gold,
    borderColor: fixieColors.goldLight,
  },
  stageDotText: {
    fontSize: 11,
    fontWeight: "800",
    color: fixieColors.background,
  },
  stageText: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 13,
    color: fixieColors.textMuted,
    textAlign: "center",
  },
  stageTextActive: {
    color: fixieColors.text,
    fontWeight: "800",
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
