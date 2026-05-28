import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FixieLogo from "../../components/FixieLogo";
import { EMAIL_ALLOWED_TEXT, PHONE_ALLOWED_TEXT, formatPhoneInput, isValidEmail, isValidPhone, normalizePhoneDigits } from "../../lib/auth-validation";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";
import { supabase } from "../../lib/supabase";
import CustomerBottomNav from "./components/CustomerBottomNav";

export default function CustomerProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerID, setCustomerID] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const storedID = await AsyncStorage.getItem("customerID");
      if (!storedID) {
        router.replace("/customer/login");
        return;
      }
      setCustomerID(Number(storedID));

      const { data, error } = await supabase
        .from("CustomerTable")
        .select("*")
        .eq("CustomerID", Number(storedID))
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCustomerName(data.CustomerName || "");
        setCustomerPhone(data.CustomerPhone ? formatPhoneInput(String(data.CustomerPhone)) : "");
        setCustomerEmail(data.CustomerEmail || "");
      }
    } catch (error) {
      console.log("Profile load error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      if (!customerID || isNaN(customerID)) {
        Alert.alert("Error", "Guest accounts cannot update profile. Please sign in.");
        return;
      }

      if (!isValidEmail(customerEmail)) {
        Alert.alert("Error", EMAIL_ALLOWED_TEXT);
        return;
      }

      if (!isValidPhone(customerPhone)) {
        Alert.alert("Error", PHONE_ALLOWED_TEXT);
        return;
      }

      setSaving(true);
      const { data, error } = await supabase
        .from("CustomerTable")
        .update({
          CustomerName: customerName,
          CustomerPhone: Number(normalizePhoneDigits(customerPhone)),
          CustomerEmail: customerEmail,
        })
        .eq("CustomerID", customerID)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        Alert.alert("Error", "Profile update failed. Please sign out and sign back in.");
        return;
      }

      Alert.alert("Success", "Profile updated.");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("customerID");
    router.replace("/");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={fixieColors.gold} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={20} color={fixieColors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
          <Ionicons name="log-out-outline" size={20} color={fixieColors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <FixieLogo size={76} />
          <Text style={styles.heroName}>{customerName || "Customer"}</Text>
          <Text style={styles.heroSubtitle}>Keep your contact details current while the underlying profile flow stays unchanged.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="Enter your name" placeholderTextColor={fixieColors.textMuted} />

          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={customerPhone} onChangeText={(value) => setCustomerPhone(formatPhoneInput(value))} placeholder="Enter your phone" placeholderTextColor={fixieColors.textMuted} keyboardType="phone-pad" />

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={customerEmail} onChangeText={setCustomerEmail} placeholder="Enter your email" placeholderTextColor={fixieColors.textMuted} keyboardType="email-address" autoCapitalize="none" />

          <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Profile"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CustomerBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: fixieColors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: fixieColors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: fixieColors.surface,
    borderWidth: 1,
    borderColor: fixieColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: fixieColors.text,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: fixieColors.surfaceElevated,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: fixieColors.border,
    marginBottom: 18,
    ...fixieShadows.card,
  },
  heroName: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: "800",
    color: fixieColors.text,
  },
  heroSubtitle: {
    marginTop: 8,
    textAlign: "center",
    color: fixieColors.textSecondary,
    lineHeight: 21,
  },
  formCard: {
    backgroundColor: fixieColors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: fixieColors.border,
    ...fixieShadows.card,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    color: fixieColors.text,
  },
  input: {
    backgroundColor: fixieColors.backgroundAlt,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: fixieColors.border,
    color: fixieColors.text,
  },
  saveButton: {
    backgroundColor: fixieColors.gold,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
    ...fixieShadows.glow,
  },
  saveButtonText: {
    color: fixieColors.background,
    fontSize: 16,
    fontWeight: "800",
  },
  signOutButton: {
    backgroundColor: fixieColors.surfaceElevated,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  signOutText: {
    color: fixieColors.text,
    fontSize: 16,
    fontWeight: "700",
  },
});
