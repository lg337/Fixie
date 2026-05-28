import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import CompanyPostsGrid from "../../components/CompanyPostsGrid";
import FixieLogo from "../../components/FixieLogo";
import { EMAIL_ALLOWED_TEXT, PHONE_ALLOWED_TEXT, formatPhoneInput, isValidEmail, isValidPhone, normalizePhoneDigits } from "../../lib/auth-validation";
import { loadCompanyPosts, saveCompanyPosts, uploadCompanyPostMedia } from "../../lib/company-posts";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";
import { supabase } from "../../lib/supabase";

export default function CompanyProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyID, setCompanyID] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [companyField, setCompanyField] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [posts, setPosts] = useState([]);
  const [postCaption, setPostCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  const loadCompanyProfile = async () => {
    try {
      const storedCompanyID = await AsyncStorage.getItem("companyID");
      if (!storedCompanyID) {
        router.replace("/company/login");
        return;
      }
      if (storedCompanyID === "demo") {
        setCompanyName("Demo Company");
        setCompanyField("Demo");
        setLoading(false);
        return;
      }
      const parsedCompanyID = Number(storedCompanyID);
      setCompanyID(parsedCompanyID);
      const { data, error } = await supabase.from("CompanyTable").select("*").eq("CompanyID", parsedCompanyID).single();
      if (error) throw error;
      setCompanyName(data.CompanyName || "");
      setCompanyField(data.CompanyField || "");
      setCompanyPhone(data.CompanyPhone ? formatPhoneInput(String(data.CompanyPhone)) : "");
      setCompanyEmail(data.CompanyEmail || "");
      setProfileImageUrl(data.ProfileImageUrl || "");
      setPosts(await loadCompanyPosts(parsedCompanyID));

      const { data: reviewData, error: reviewError } = await supabase
        .from("ReviewTable")
        .select(`CustomerID, Stars, Review, CustomerTable (CustomerName)`)
        .eq("CompanyID", parsedCompanyID);
      if (reviewError) throw reviewError;
      const formattedReviews = reviewData || [];
      setReviews(formattedReviews);
      if (formattedReviews.length > 0) {
        const total = formattedReviews.reduce((sum, item) => sum + Number(item.Stars || 0), 0);
        setAvgRating((total / formattedReviews.length).toFixed(1));
      } else {
        setAvgRating(0);
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Could not load profile.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;
    const image = result.assets[0];
    await uploadImage(image.uri);
  };

  const uploadImage = async (uri) => {
    try {
      setSaving(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `company-${companyID}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("company-images").upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("company-images").getPublicUrl(fileName);
      const publicUrl = data.publicUrl;
      const { error: updateError } = await supabase
        .from("CompanyTable")
        .update({ ProfileImageUrl: publicUrl })
        .eq("CompanyID", companyID);
      if (updateError) throw updateError;
      setProfileImageUrl(publicUrl);
      Alert.alert("Success", "Image uploaded and saved.");
    } catch (error) {
      Alert.alert("Upload failed", error.message);
    } finally {
      setSaving(false);
    }
  };

  const addPost = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.8,
        allowsEditing: true,
      });

      if (result.canceled) return;

      setPosting(true);
      const newPost = await uploadCompanyPostMedia(companyID, result.assets[0]);
      const nextPosts = [{ ...newPost, caption: postCaption.trim() }, ...posts];
      await saveCompanyPosts(companyID, nextPosts);
      setPosts(nextPosts);
      setPostCaption("");
      Alert.alert("Success", "Post published.");
    } catch (error) {
      Alert.alert("Error", error.message || "Could not create post.");
    } finally {
      setPosting(false);
    }
  };

  const removePost = async (postID) => {
    try {
      const nextPosts = posts.filter((post) => post.id !== postID);
      await saveCompanyPosts(companyID, nextPosts);
      setPosts(nextPosts);
    } catch (error) {
      Alert.alert("Error", error.message || "Could not remove post.");
    }
  };

  const saveProfile = async () => {
    try {
      if (!isValidEmail(companyEmail)) {
        Alert.alert("Error", EMAIL_ALLOWED_TEXT);
        return;
      }

      if (companyPhone.trim() && !isValidPhone(companyPhone)) {
        Alert.alert("Error", PHONE_ALLOWED_TEXT);
        return;
      }

      setSaving(true);
      const phoneDigits = normalizePhoneDigits(companyPhone);
      const { error } = await supabase.from("CompanyTable").update({ CompanyName: companyName, CompanyField: companyField, CompanyPhone: phoneDigits ? Number(phoneDigits) : null, CompanyEmail: companyEmail, ProfileImageUrl: profileImageUrl }).eq("CompanyID", companyID);
      if (error) throw error;
      Alert.alert("Success", "Company profile updated.");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const [deleting, setDeleting] = useState(false);

  const handleDeleteCompany = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("This will permanently delete your company account and all associated data. This cannot be undone.");
      if (confirmed) deleteCompany();
    } else {
      Alert.alert(
        "Delete Company",
        "This will permanently delete your company account and all associated data. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: deleteCompany },
        ]
      );
    }
  };

  const deleteCompany = async () => {
    if (!companyID) return;
    setDeleting(true);
    try {
      await supabase.from("ReviewTable").delete().eq("CompanyID", companyID);
      await supabase.from("CRMTable").delete().eq("CompanyID", companyID);
      await supabase.from("RequestTable").delete().eq("CompanyID", companyID);
      await supabase.from("company_users").delete().eq("companyID", companyID);
      await supabase.from("employees").delete().eq("companyID", companyID);
      const { error } = await supabase.from("CompanyTable").delete().eq("CompanyID", companyID);
      if (error) throw error;
      await AsyncStorage.removeItem("companyID");
      router.replace("/");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to delete company.");
    } finally {
      setDeleting(false);
    }
  };

  const signOut = async () => {
    await AsyncStorage.removeItem("companyID");
    router.replace("/");
  };

  if (loading) {
    return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" color={fixieColors.gold} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.replace("/company/home")} style={styles.iconButton}><Ionicons name="arrow-back" size={20} color={fixieColors.text} /></TouchableOpacity>
        <Text style={styles.title}>Company Profile</Text>
        <TouchableOpacity onPress={signOut} style={styles.iconButton}><Ionicons name="log-out-outline" size={20} color={fixieColors.error} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <TouchableOpacity style={styles.imageWrap} onPress={pickImage}>
            {profileImageUrl ? <Image source={{ uri: profileImageUrl }} style={styles.profileImage} /> : <FixieLogo size={94} />}
          </TouchableOpacity>
          <Text style={styles.heroName}>{companyName || "Company"}</Text>
          <Text style={styles.heroSubtitle}>Tap the image area to keep your public company image current.</Text>
        </View>

        <View style={styles.formCard}>
          {[
            ["Company Name", companyName, setCompanyName, {}],
            ["Company Field", companyField, setCompanyField, {}],
            ["Phone", companyPhone, (value) => setCompanyPhone(formatPhoneInput(value)), { keyboardType: "phone-pad" }],
            ["Email", companyEmail, setCompanyEmail, { autoCapitalize: "none", keyboardType: "email-address" }],
          ].map(([label, value, onChangeText, extra]) => (
            <View key={label}>
              <Text style={styles.label}>{label}</Text>
              <TextInput value={value} onChangeText={onChangeText} placeholder={`Enter ${label.toLowerCase()}`} placeholderTextColor={fixieColors.textMuted} style={styles.input} {...extra} />
            </View>
          ))}

          <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Profile"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.postSection}>
          <Text style={styles.sectionTitle}>Past Work Posts</Text>
          <TextInput
            style={styles.postCaptionInput}
            value={postCaption}
            onChangeText={setPostCaption}
            placeholder="Write a caption for your next photo or video"
            placeholderTextColor={fixieColors.textMuted}
          />
          <TouchableOpacity style={styles.saveButton} onPress={addPost} disabled={posting}>
            <Text style={styles.saveButtonText}>{posting ? "Publishing..." : "Add Photo or Video"}</Text>
          </TouchableOpacity>
          <View style={styles.postGridWrap}>
            <CompanyPostsGrid posts={posts} emptyText="No posts yet. Add your first project update." onDelete={removePost} />
          </View>
        </View>

        <View style={styles.reviewSection}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewTitle}>Customer Reviews</Text>
            <Text style={styles.reviewAverage}>{avgRating || "0.0"} ★</Text>
          </View>
          {reviews.length === 0 ? <Text style={styles.emptyText}>No reviews yet.</Text> : reviews.map((item, index) => (
            <View key={`${item.CustomerID}-${index}`} style={styles.reviewCard}>
              <View style={styles.reviewTopRow}>
                <Text style={styles.reviewName}>{item.CustomerTable?.CustomerName || "Customer"}</Text>
                <Text style={styles.reviewStars}>{"★".repeat(Number(item.Stars || 0))}</Text>
              </View>
              <Text style={styles.reviewBody}>{item.Review || ""}</Text>
            </View>
          ))}
        </View>

        {companyID && companyID !== "demo" && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteCompany} disabled={deleting}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.deleteButtonText}>{deleting ? "Deleting..." : "Delete Company"}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fixieColors.background },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 14 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 30 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: fixieColors.background },
  title: { fontSize: 24, fontWeight: "800", color: fixieColors.text },
  heroCard: { alignItems: "center", backgroundColor: fixieColors.surfaceElevated, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: fixieColors.border, marginBottom: 18, ...fixieShadows.card },
  imageWrap: { alignSelf: "center", marginBottom: 12 },
  profileImage: { width: 120, height: 120, borderRadius: 60 },
  heroName: { fontSize: 24, fontWeight: "800", color: fixieColors.text },
  heroSubtitle: { marginTop: 8, textAlign: "center", color: fixieColors.textSecondary, lineHeight: 20 },
  formCard: { backgroundColor: fixieColors.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: fixieColors.border, marginBottom: 18, ...fixieShadows.card },
  postSection: { backgroundColor: fixieColors.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: fixieColors.border, marginBottom: 18, ...fixieShadows.card },
  label: { fontSize: 14, fontWeight: "700", marginBottom: 8, color: fixieColors.text },
  input: { backgroundColor: fixieColors.backgroundAlt, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 16, borderWidth: 1, borderColor: fixieColors.border, color: fixieColors.text },
  postCaptionInput: { backgroundColor: fixieColors.backgroundAlt, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 16, borderWidth: 1, borderColor: fixieColors.border, color: fixieColors.text },
  postGridWrap: { marginTop: 16 },
  saveButton: { backgroundColor: fixieColors.gold, paddingVertical: 15, borderRadius: 16, alignItems: "center" },
  saveButtonText: { color: fixieColors.background, fontSize: 16, fontWeight: "800" },
  reviewSection: { backgroundColor: fixieColors.surface, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: fixieColors.border, ...fixieShadows.card },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  reviewTitle: { fontSize: 22, fontWeight: "800", color: fixieColors.text },
  reviewAverage: { fontSize: 18, fontWeight: "800", color: fixieColors.goldLight },
  emptyText: { fontSize: 15, color: fixieColors.textMuted },
  reviewCard: { backgroundColor: fixieColors.surfaceElevated, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: fixieColors.border },
  reviewTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, alignItems: "center" },
  reviewName: { fontSize: 16, fontWeight: "700", color: fixieColors.text },
  reviewStars: { fontSize: 16, color: fixieColors.goldLight, fontWeight: "700" },
  reviewBody: { fontSize: 14, color: fixieColors.textSecondary, lineHeight: 20 },
  deleteButton: { marginTop: 18, backgroundColor: fixieColors.error, borderRadius: 16, paddingVertical: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  deleteButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
