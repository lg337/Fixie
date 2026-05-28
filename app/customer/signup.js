import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FixieAuthScreen from "../../components/FixieAuthScreen";
import { EMAIL_ALLOWED_TEXT, NAME_MAX, PASSWORD_ALLOWED_TEXT, PASSWORD_MAX, PERSON_NAME_ALLOWED_TEXT, PHONE_ALLOWED_TEXT, USERNAME_ALLOWED_TEXT, USERNAME_MAX, formatPhoneInput, isValidEmail, isValidPassword, isValidPersonName, isValidPhone, isValidUsername, normalizePhoneDigits } from "../../lib/auth-validation";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";
import { supabase } from "../../lib/supabase";

export default function CustomerSignup() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignup = async () => {
    setErrorMsg("");
    if (!name.trim() || !username.trim() || !email.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMsg("Please fill out all fields.");
      return;
    }

    if (!isValidPersonName(name)) {
      setErrorMsg(PERSON_NAME_ALLOWED_TEXT);
      return;
    }

    if (!isValidUsername(username)) {
      setErrorMsg(USERNAME_ALLOWED_TEXT);
      return;
    }

    if (!isValidPassword(password)) {
      setErrorMsg(PASSWORD_ALLOWED_TEXT);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMsg(EMAIL_ALLOWED_TEXT);
      return;
    }

    if (!isValidPhone(phone)) {
      setErrorMsg(PHONE_ALLOWED_TEXT);
      return;
    }

    setLoading(true);

    try {
      const { data: existingUser } = await supabase
        .from("CustomerTable")
        .select("CustomerID")
        .eq("CustomerUsername", username.trim())
        .maybeSingle();

      if (existingUser) {
        setErrorMsg("Username already taken.");
        return;
      }

      const { data, error } = await supabase
        .from("CustomerTable")
        .insert([
          {
            CustomerName: name.trim(),
            CustomerUsername: username.trim(),
            CustomerEmail: email.trim(),
            CustomerPhone: normalizePhoneDigits(phone),
            CustomerPw: password,
          },
        ])
        .select("CustomerID")
        .single();

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      await AsyncStorage.setItem("customerID", String(data.CustomerID));
      router.replace("/customer/home");
    } catch {
      setErrorMsg("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FixieAuthScreen
      eyebrow="Customer Portal"
      title="Create your account"
      subtitle="Set up your profile once, then request help from trusted companies without changing the current app flow."
      scroll
      footer={
        <View style={styles.footerLinks}>
          <Link href="/customer/login" style={styles.linkText}>
            Already have an account? Login
          </Link>
          <Link href="/" style={styles.linkText}>
            Back to main
          </Link>
        </View>
      }
    >
      <View style={styles.inputStack}>
        {[
          ["Full Name", name, setName, { maxLength: NAME_MAX }, name.trim() && !isValidPersonName(name) ? PERSON_NAME_ALLOWED_TEXT : null],
          ["Username", username, setUsername, { autoCapitalize: "none", maxLength: USERNAME_MAX }, username.trim() && !isValidUsername(username) ? USERNAME_ALLOWED_TEXT : null],
          ["Email", email, setEmail, { autoCapitalize: "none", keyboardType: "email-address", maxLength: 254 }, email.trim() && !isValidEmail(email) ? EMAIL_ALLOWED_TEXT : null],
          ["Phone", phone, (value) => setPhone(formatPhoneInput(value)), { keyboardType: "phone-pad" }, phone.trim() && !isValidPhone(phone) ? PHONE_ALLOWED_TEXT : null],
        ].map(([placeholder, value, onChangeText, extra, hint]) => (
          <View key={placeholder}>
            <TextInput
              placeholder={placeholder}
              placeholderTextColor={fixieColors.textMuted}
              value={value}
              onChangeText={onChangeText}
              style={[styles.input, hint ? styles.inputInvalid : null]}
              {...extra}
            />
            {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
          </View>
        ))}
        <View>
          <View style={[styles.passwordInputWrap, password && !isValidPassword(password) ? styles.inputInvalid : null]}>
            <TextInput
              placeholder="Password"
              placeholderTextColor={fixieColors.textMuted}
              value={password}
              onChangeText={setPassword}
              style={styles.passwordInput}
              secureTextEntry={!showPassword}
              maxLength={PASSWORD_MAX}
            />
            <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword((current) => !current)}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={fixieColors.textMuted} />
            </TouchableOpacity>
          </View>
          {password && !isValidPassword(password) ? <Text style={styles.fieldHint}>{PASSWORD_ALLOWED_TEXT}</Text> : null}
        </View>
        <View>
          <View style={[styles.passwordInputWrap, confirmPassword && password !== confirmPassword ? styles.inputInvalid : null]}>
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor={fixieColors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.passwordInput}
              secureTextEntry={!showConfirmPassword}
              maxLength={PASSWORD_MAX}
            />
            <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowConfirmPassword((current) => !current)}>
              <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color={fixieColors.textMuted} />
            </TouchableOpacity>
          </View>
          {confirmPassword && password !== confirmPassword ? <Text style={styles.fieldHint}>Passwords do not match.</Text> : null}
        </View>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <TouchableOpacity style={styles.primaryButton} onPress={handleSignup} disabled={loading}>
        {loading ? <ActivityIndicator color={fixieColors.background} /> : <Text style={styles.primaryButtonText}>Sign Up</Text>}
      </TouchableOpacity>
    </FixieAuthScreen>
  );
}

const styles = StyleSheet.create({
  inputStack: {
    gap: 14,
  },
  input: {
    backgroundColor: fixieColors.backgroundAlt,
    borderWidth: 1,
    borderColor: fixieColors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: fixieColors.text,
    fontSize: 16,
  },
  inputInvalid: {
    borderColor: fixieColors.error,
  },
  passwordInputWrap: {
    backgroundColor: fixieColors.backgroundAlt,
    borderWidth: 1,
    borderColor: fixieColors.border,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: fixieColors.text,
    fontSize: 16,
  },
  passwordToggle: {
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  fieldHint: {
    color: fixieColors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  errorText: {
    color: fixieColors.error,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: fixieColors.gold,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    ...fixieShadows.glow,
  },
  primaryButtonText: {
    color: fixieColors.background,
    fontSize: 17,
    fontWeight: "800",
  },
  footerLinks: {
    gap: 12,
    alignItems: "center",
  },
  linkText: {
    color: fixieColors.goldLight,
    fontSize: 15,
  },
});
