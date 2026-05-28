import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCRM } from "../lib/crmStore";
import { fixieColors, fixieShadows } from "../lib/fixie-theme";

export default function CRM() {
  const router = useRouter();
  const [data, setData] = useState([]);
  useEffect(() => {
    setData(getCRM());
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={20} color={fixieColors.text} />
        </TouchableOpacity>
        <Text style={styles.header}>Customer History</Text>
        <View style={styles.spacer} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No requests yet</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.service}</Text>
            <Text style={styles.text}>Customer ID: {item.customerID}</Text>
            <Text style={styles.text}>Company ID: {item.companyID}</Text>
            <Text style={styles.date}>{item.date}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: fixieColors.background },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  spacer: { width: 42 },
  header: { fontSize: 26, fontWeight: "800", color: fixieColors.text },
  empty: { color: fixieColors.textMuted, marginTop: 20, textAlign: "center" },
  card: { backgroundColor: fixieColors.surface, padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  title: { fontWeight: "800", fontSize: 16, marginBottom: 6, color: fixieColors.text },
  text: { color: fixieColors.textSecondary, marginBottom: 2 },
  date: { color: fixieColors.textMuted, marginTop: 6 },
});
