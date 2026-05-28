import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";

export default function TasksScreen() {
  const router = useRouter();
  const tasks = [
    { id: "1", title: "TV Mounting", status: "completed", company: "FixIt Pros", date: "Mar 20" },
    { id: "2", title: "Plumbing Fix", status: "in_progress", company: "QuickPlumb", date: "Mar 22" },
    { id: "3", title: "Cleaning Service", status: "completed", company: "SparkleClean", date: "Mar 18" },
    { id: "4", title: "Wall Painting", status: "completed", company: "ProPainters", date: "Mar 15" },
  ];

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={[styles.statusBadge, item.status === "completed" && styles.completed, item.status === "in_progress" && styles.inProgress]}>
          <Text style={styles.statusText}>{item.status.replace("_", " ")}</Text>
        </View>
      </View>
      <Text style={styles.company}>{item.company}</Text>
      <Text style={styles.date}>{item.date}</Text>
      {item.status === "completed" && (
        <TouchableOpacity style={styles.button} onPress={() => router.push({ pathname: "/review", params: { id: item.id } })}>
          <Ionicons name="star" size={16} color={fixieColors.background} />
          <Text style={styles.buttonText}>Leave Review</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Tasks</Text>
      <FlatList data={tasks} keyExtractor={(item) => item.id} renderItem={renderItem} showsVerticalScrollIndicator={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 60, backgroundColor: fixieColors.background },
  header: { fontSize: 30, fontWeight: "800", marginBottom: 25, color: fixieColors.text },
  card: { backgroundColor: fixieColors.surface, padding: 18, borderRadius: 18, marginBottom: 16, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: fixieColors.text },
  company: { color: fixieColors.textSecondary, marginTop: 6 },
  date: { color: fixieColors.textMuted, fontSize: 13, marginTop: 2 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "700", color: fixieColors.background, textTransform: "capitalize" },
  completed: { backgroundColor: fixieColors.success },
  inProgress: { backgroundColor: fixieColors.pending },
  button: { marginTop: 14, backgroundColor: fixieColors.gold, paddingVertical: 10, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  buttonText: { color: fixieColors.background, fontWeight: "800" },
});
