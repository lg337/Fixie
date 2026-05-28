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

export default function EmployeeSignup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignup = async () => {
    setErrorMsg("");
    if (!name.trim() || !username.trim() || !pw.trim() || !confirmPw.trim()) {
      setErrorMsg("Name, username, password, and confirm password are required.");
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

    if (!isValidPassword(pw)) {
      setErrorMsg(PASSWORD_ALLOWED_TEXT);
      return;
    }

    if (pw !== confirmPw) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (phone.trim() && !isValidPhone(phone)) {
      setErrorMsg(PHONE_ALLOWED_TEXT);
      return;
    }

    if (email.trim() && !isValidEmail(email)) {
      setErrorMsg(EMAIL_ALLOWED_TEXT);
      return;
    }

    const phoneDigits = normalizePhoneDigits(phone);
    const phoneValue = phoneDigits ? Number(phoneDigits) : null;

    setLoading(true);
    try {
      const { data: existing, error: existingErr } = await supabase
        .from("EmployeeTable")
        .select("EmployeeID")
        .eq("EmployeeUsername", username.trim())
        .maybeSingle();

      if (existingErr) {
        setErrorMsg(existingErr.message);
        return;
      }
      if (existing) {
        setErrorMsg("That username is already taken.");
        return;
      }

      const { error: insertErr } = await supabase.from("EmployeeTable").insert({
        EmployeeName: name.trim(),
        EmployeePhone: phoneValue,
        EmployeeEmail: email.trim() || null,
        EmployeeUsername: username.trim(),
        EmployeePw: pw,
        CompanyIDS: null,
      });

      if (insertErr) {
        setErrorMsg(insertErr.message);
        return;
      }

      router.replace("/employee/login");
    } catch {
      setErrorMsg("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FixieAuthScreen
      eyebrow="Employee Portal"
      title="Create a team profile"
      subtitle="Create your employee account first, then companies can add you to their team by username."
      scroll
      footer={
        <View style={styles.footerLinks}>
          <Link href="/employee/login" style={styles.linkText}>
            Back to login
          </Link>
          <Link href="/" style={styles.linkText}>
            Back to main
          </Link>
        </View>
      }
    >
      <View style={styles.inputStack}>
        {[
          ["Full Name *", name, setName, { maxLength: NAME_MAX }, name.trim() && !isValidPersonName(name) ? PERSON_NAME_ALLOWED_TEXT : null],
          ["Phone (optional)", phone, (value) => setPhone(formatPhoneInput(value)), { keyboardType: "phone-pad" }, phone.trim() && !isValidPhone(phone) ? PHONE_ALLOWED_TEXT : null],
          ["Email (optional)", email, setEmail, { autoCapitalize: "none", keyboardType: "email-address", maxLength: 254 }, email.trim() && !isValidEmail(email) ? EMAIL_ALLOWED_TEXT : null],
          ["Username *", username, setUsername, { autoCapitalize: "none", maxLength: USERNAME_MAX }, username.trim() && !isValidUsername(username) ? USERNAME_ALLOWED_TEXT : null],
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
          <View style={[styles.passwordInputWrap, pw && !isValidPassword(pw) ? styles.inputInvalid : null]}>
            <TextInput
              placeholder="Password *"
              placeholderTextColor={fixieColors.textMuted}
              value={pw}
              onChangeText={setPw}
              style={styles.passwordInput}
              secureTextEntry={!showPw}
              maxLength={PASSWORD_MAX}
            />
            <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPw((current) => !current)}>
              <Ionicons name={showPw ? "eye-off" : "eye"} size={20} color={fixieColors.textMuted} />
            </TouchableOpacity>
          </View>
          {pw && !isValidPassword(pw) ? <Text style={styles.fieldHint}>{PASSWORD_ALLOWED_TEXT}</Text> : null}
        </View>
        <View>
          <View style={[styles.passwordInputWrap, confirmPw && pw !== confirmPw ? styles.inputInvalid : null]}>
            <TextInput
              placeholder="Confirm Password *"
              placeholderTextColor={fixieColors.textMuted}
              value={confirmPw}
              onChangeText={setConfirmPw}
              style={styles.passwordInput}
              secureTextEntry={!showConfirmPw}
              maxLength={PASSWORD_MAX}
            />
            <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowConfirmPw((current) => !current)}>
              <Ionicons name={showConfirmPw ? "eye-off" : "eye"} size={20} color={fixieColors.textMuted} />
            </TouchableOpacity>
          </View>
          {confirmPw && pw !== confirmPw ? <Text style={styles.fieldHint}>Passwords do not match.</Text> : null}
        </View>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <TouchableOpacity style={styles.primaryButton} onPress={handleSignup} disabled={loading}>
        {loading ? <ActivityIndicator color={fixieColors.background} /> : <Text style={styles.primaryButtonText}>Create Employee</Text>}
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
