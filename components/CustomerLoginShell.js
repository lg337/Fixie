import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FixieLogo from "./FixieLogo";
import { PASSWORD_ALLOWED_TEXT, USERNAME_ALLOWED_TEXT, isValidPassword, isValidUsername } from "../lib/auth-validation";
import { fixieColors, fixieShadows } from "../lib/fixie-theme";
import { supabase } from "../lib/supabase";

function RoleSwitch({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.switchButton, active && styles.switchButtonActive]}>
      <Text style={[styles.switchText, active && styles.switchTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InputRow({ icon, value, onChangeText, onBlur, placeholder, secureTextEntry = false, trailingIcon, onTrailingPress }) {
  return (
    <View style={styles.inputRow}>
      <Ionicons name={icon} size={20} color={fixieColors.textMuted} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={fixieColors.textMuted}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
      {trailingIcon ? (
        <TouchableOpacity onPress={onTrailingPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={trailingIcon} size={20} color={fixieColors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function CustomerLoginShell() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isPhone = width < 640;
  const isDesktopWeb = Platform.OS === "web" && width >= 900;
  const isShort = height < 760;
  const logoSize = isDesktopWeb ? 350 : isPhone ? 200 : 250;
  const shellMaxWidth = isDesktopWeb ? 720 : isPhone ? 420 : 560;
  const shellPadding = isDesktopWeb ? 54 : isPhone ? 20 : 36;
  const topSpacing = isDesktopWeb ? 10 : isPhone ? 8 : 10;
  const showValidationRules = passwordEntered && password.length > 0 && !isValidPassword(password);

  const handleGuestLogin = async () => {
    await AsyncStorage.setItem("customerID", "guest");
    router.replace("/customer/home");
  };

  const handleLogin = async () => {
    setErrorMsg("");
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Enter username and password.");
      return;
    }

    if (!isValidUsername(username)) {
      setErrorMsg(USERNAME_ALLOWED_TEXT);
      return;
    }

    if (!isValidPassword(password)) {
      setPasswordEntered(true);
      setErrorMsg(PASSWORD_ALLOWED_TEXT);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("CustomerTable")
        .select("CustomerID")
        .eq("CustomerUsername", username.trim())
        .eq("CustomerPw", password)
        .maybeSingle();

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (!data) {
        setErrorMsg("Invalid username or password.");
        return;
      }

      await AsyncStorage.setItem("customerID", String(data.CustomerID));
      router.replace("/customer/home");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingVertical: isPhone ? 8 : 12, justifyContent: "flex-start" },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.shell,
            {
              maxWidth: shellMaxWidth,
              paddingHorizontal: shellPadding,
              paddingTop: topSpacing,
              paddingBottom: isDesktopWeb ? 38 : isPhone ? 24 : 32,
              minHeight: undefined,
            },
          ]}
        >
          <View style={styles.switchRow}>
            <RoleSwitch label="Company" onPress={() => router.replace("/company/login")} />
            <RoleSwitch label="Employee" onPress={() => router.replace("/employee/login")} />
          </View>

          <View
            style={[
              styles.logoBlock,
              {
                marginBottom: isDesktopWeb ? 10 : isPhone ? 6 : 10,
                marginTop: isDesktopWeb ? 0 : 0,
              },
            ]}
          >
            <FixieLogo size={logoSize} />
          </View>

          <View style={styles.form}>
            <Text style={styles.roleHeading}>Customer</Text>
            <InputRow
              icon="person-outline"
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
            />
            <InputRow
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              onBlur={() => setPasswordEntered(true)}
              placeholder="Password"
              secureTextEntry={!showPassword}
              trailingIcon={showPassword ? "eye-off-outline" : "eye-outline"}
              onTrailingPress={() => setShowPassword((current) => !current)}
            />

            {showValidationRules ? (
              <>
                <Text style={styles.validationText}>{USERNAME_ALLOWED_TEXT}</Text>
                <Text style={styles.validationText}>{PASSWORD_ALLOWED_TEXT}</Text>
              </>
            ) : null}

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color={fixieColors.background} /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
              <Ionicons name="eye-outline" size={18} color={fixieColors.goldLight} />
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </TouchableOpacity>

            <View style={styles.footerLinks}>
              <Text style={styles.footerText}>Don&apos;t have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/customer/signup")}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#3A3A3C",
    paddingHorizontal: Platform.OS === "web" ? 0 : 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  shell: {
    alignSelf: "center",
    width: "100%",
    backgroundColor: "transparent",
  },
  switchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    alignSelf: "stretch",
  },
  switchButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#C8A96A",
  },
  switchButtonActive: {
    backgroundColor: fixieColors.goldLight,
  },
  switchText: {
    color: fixieColors.background,
    fontWeight: "700",
    fontSize: 13,
  },
  switchTextActive: {
    color: fixieColors.background,
  },
  logoBlock: {
    alignItems: "center",
  },
  form: {
    gap: 10,
    width: "100%",
  },
  roleHeading: {
    color: fixieColors.goldLight,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "#343438",
    borderWidth: 1,
    borderColor: "#3A3A3C",
    minHeight: 52,
  },
  input: {
    flex: 1,
    color: fixieColors.text,
    fontSize: 15,
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  errorText: {
    color: fixieColors.error,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  validationText: {
    color: fixieColors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: -2,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: fixieColors.gold,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    ...fixieShadows.glow,
  },
  primaryButtonText: {
    color: fixieColors.background,
    fontSize: 17,
    fontWeight: "800",
  },
  guestButton: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: fixieColors.goldLight,
  },
  guestButtonText: {
    color: fixieColors.goldLight,
    fontSize: 15,
    fontWeight: "700",
  },
  footerLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  footerText: {
    color: fixieColors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: fixieColors.goldLight,
    fontSize: 14,
    fontWeight: "700",
  },
});
