import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { fixieColors, fixieShadows } from "../lib/fixie-theme";
import { notifyRequestsChanged } from "../lib/request-updates";
import { supabase } from "../lib/supabase";

export default function RequestModal({ visible, onClose, companyID, customerID, mode, onSubmitted }) {
  const [notes, setNotes] = useState("");
  const [stars, setStars] = useState(0);
  const [loading, setLoading] = useState(false);

  const isReviewMode = mode === "review";

  const resetForm = () => {
    setNotes("");
    setStars(0);
  };

  const handleSubmit = async () => {
    if (!notes.trim()) {
      Alert.alert("Missing info", `Please provide ${isReviewMode ? "your review" : "details"}.`);
      return;
    }

    if (isReviewMode && stars === 0) {
      Alert.alert("Missing info", "Please select a star rating.");
      return;
    }

    setLoading(true);

    try {
      if (isReviewMode) {
        const { error } = await supabase.from("ReviewTable").upsert(
          {
            CustomerID: customerID,
            CompanyID: companyID,
            Stars: stars,
            Review: notes.trim(),
          },
          { onConflict: "CustomerID,CompanyID" }
        );

        if (error) throw error;

        Alert.alert("Success", "Review submitted!");
      } else {
        const { error } = await supabase.from("RequestTable").insert({
          CompanyID: companyID,
          CustomerID: customerID,
          RequestNotes: notes.trim(),
          RequestStatus: "new",
        });
        if (error) throw error;
        Alert.alert("Success", "Request sent!");
      }

      notifyRequestsChanged();
      resetForm();
      onClose();
      if (onSubmitted) onSubmitted();
    } catch (error) {
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{isReviewMode ? "Leave a Review" : "Send a Request"}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={fixieColors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.caption}>
            {isReviewMode
              ? "Keep the stars and comments, just in the new Fixie style."
              : "Share the job details and keep the current workflow exactly the same."}
          </Text>

          {isReviewMode && (
            <View style={styles.starContainer}>
              {[1, 2, 3, 4, 5].map((num) => (
                <TouchableOpacity key={num} onPress={() => setStars(num)}>
                  <Ionicons
                    name={stars >= num ? "star" : "star-outline"}
                    size={32}
                    color={fixieColors.goldLight}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder={isReviewMode ? "Write your review here..." : "Describe your request..."}
            placeholderTextColor={fixieColors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={fixieColors.background} />
            ) : (
              <Text style={styles.buttonText}>
                {isReviewMode ? "Submit Review" : "Submit Request"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: fixieColors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: fixieColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderTopWidth: 1,
    borderColor: fixieColors.border,
    ...fixieShadows.card,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "800", color: fixieColors.text },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: fixieColors.surfaceElevated },
  caption: { fontSize: 13, lineHeight: 18, color: fixieColors.textSecondary, marginBottom: 12 },
  starContainer: { flexDirection: "row", gap: 8, marginBottom: 16, justifyContent: "center" },
  input: {
    borderWidth: 1,
    borderColor: fixieColors.border,
    borderRadius: 16,
    padding: 14,
    minHeight: 120,
    marginBottom: 12,
    backgroundColor: fixieColors.backgroundAlt,
    color: fixieColors.text,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: fixieColors.gold,
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 10,
    ...fixieShadows.glow,
  },
  buttonText: { color: fixieColors.background, fontWeight: "800" },
  cancelButton: { alignItems: "center", marginTop: 8, paddingVertical: 8 },
  cancelText: { color: fixieColors.textSecondary },
});
