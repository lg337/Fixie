import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fixieColors, fixieShadows } from "../lib/fixie-theme";

export default function ReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const handleSubmit = () => {
    if (!rating || !review) {
      Alert.alert("Please complete the review");
      return;
    }
    Alert.alert("Review submitted!");
    router.push("/tasks");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Leave a Review</Text>
      <Text style={styles.subHeader}>Task #{id}</Text>
      <View style={styles.card}>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((num) => (
            <TouchableOpacity key={num} onPress={() => setRating(num)}>
              <Ionicons name={num <= rating ? "star" : "star-outline"} size={30} color={fixieColors.goldLight} />
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Write your review..." placeholderTextColor={fixieColors.textMuted} multiline value={review} onChangeText={setReview} />
        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Submit Review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: fixieColors.background },
  header: { fontSize: 28, fontWeight: "800", marginBottom: 5, color: fixieColors.text },
  subHeader: { color: fixieColors.textSecondary, marginBottom: 20 },
  card: { backgroundColor: fixieColors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  stars: { flexDirection: "row", gap: 8, marginBottom: 20 },
  input: { backgroundColor: fixieColors.backgroundAlt, borderRadius: 16, padding: 12, minHeight: 120, borderWidth: 1, borderColor: fixieColors.border, color: fixieColors.text, textAlignVertical: "top" },
  button: { marginTop: 20, backgroundColor: fixieColors.gold, padding: 15, borderRadius: 16, alignItems: "center" },
  buttonText: { color: fixieColors.background, fontWeight: "800" },
});
