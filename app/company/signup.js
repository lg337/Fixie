import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
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
import { COMPANY_NAME_ALLOWED_TEXT, COMPANY_NAME_MAX, EMAIL_ALLOWED_TEXT, PASSWORD_ALLOWED_TEXT, PASSWORD_MAX, PHONE_ALLOWED_TEXT, USERNAME_ALLOWED_TEXT, USERNAME_MAX, formatPhoneInput, isValidCompanyName, isValidEmail, isValidPassword, isValidPhone, isValidUsername, normalizePhoneDigits } from "../../lib/auth-validation";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";
import { supabase } from "../../lib/supabase";

export default function CompanySignUp() {
  const [companyName, setCompanyName] = useState("");
  const [companyField, setCompanyField] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [createdCompanyId, setCreatedCompanyId] = useState(null);

  const router = useRouter();

  const generateUniqueID = async () => {
    while (true) {
      const candidate = Math.floor(1000 + Math.random() * 9000);
      const { data, error } = await supabase
        .from("CompanyTable")
        .select("CompanyID")
        .eq("CompanyID", candidate)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }
      if (!data) return candidate;
    }
  };

  const handleSignUp = async () => {
    setErrorMsg("");
    if (!companyName.trim() || !username.trim() || !password.trim() || !confirmPassword.trim() || !companyEmail.trim()) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (!isValidCompanyName(companyName)) {
      setErrorMsg(COMPANY_NAME_ALLOWED_TEXT);
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

    if (!isValidEmail(companyEmail)) {
      setErrorMsg(EMAIL_ALLOWED_TEXT);
      return;
    }

    if (companyPhone.trim() && !isValidPhone(companyPhone)) {
      setErrorMsg(PHONE_ALLOWED_TEXT);
      return;
    }

    const phoneDigits = normalizePhoneDigits(companyPhone);
    const phoneNum = phoneDigits ? Number(phoneDigits) : null;

    setLoading(true);

    try {
      const { data: existing, error: existingErr } = await supabase
        .from("CompanyTable")
        .select("CompanyID")
        .eq("CompanyUsername", username.trim())
        .maybeSingle();

      if (existingErr) {
        setErrorMsg(existingErr.message);
        return;
      }

      if (existing) {
        setErrorMsg("That username is already taken.");
        return;
      }

      const uniqueID = await generateUniqueID();

      const { error } = await supabase.from("CompanyTable").insert({
        CompanyID: uniqueID,
        CompanyName: companyName.trim(),
        CompanyField: companyField.trim() || null,
        CompanyPhone: phoneNum,
        CompanyEmail: companyEmail.trim(),
        CompanyUsername: username.trim(),
        CompanyPw: password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setCreatedCompanyId(uniqueID);
    } catch (err) {
      setErrorMsg(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (createdCompanyId !== null) {
    return (
      <FixieAuthScreen
        eyebrow="Company Portal"
        title="Account created"
        subtitle="Keep this company ID safe. Your login flow stays the same, but now it lives inside the Fixie brand system."
        footer={
          <View style={styles.footerLinks}>
            <Link href="/" style={styles.linkText}>
              Back to main
            </Link>
          </View>
        }
      >
        <View style={styles.successCard}>
          <Text style={styles.successLabel}>Your Company ID</Text>
          <Text style={styles.successId}>{createdCompanyId}</Text>
          <Text style={styles.successNote}>Save this ID. You will need it to log in as a Company Manager.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace("/company/login")}>
            <Text style={styles.primaryButtonText}>Go to Company Login</Text>
          </TouchableOpacity>
        </View>
      </FixieAuthScreen>
    );
  }

  return (
    <FixieAuthScreen
      eyebrow="Company Portal"
      title="Set up your business"
      subtitle="Add the same company details you already use, now presented with the premium Fixie look."
      scroll
      footer={
        <View style={styles.footerLinks}>
          <Link href="/company/login" style={styles.linkText}>
            Already have an account? Log in
          </Link>
          <Link href="/" style={styles.linkText}>
            Back to main
          </Link>
        </View>
      }
    >
      <View style={styles.inputStack}>
        {[
          ["Company Name *", companyName, setCompanyName, { maxLength: COMPANY_NAME_MAX }, companyName.trim() && !isValidCompanyName(companyName) ? COMPANY_NAME_ALLOWED_TEXT : null],
          ["Industry / Field", companyField, setCompanyField, {}, null],
          ["Phone Number", companyPhone, (value) => setCompanyPhone(formatPhoneInput(value)), { keyboardType: "phone-pad" }, companyPhone.trim() && !isValidPhone(companyPhone) ? PHONE_ALLOWED_TEXT : null],
          ["Email *", companyEmail, setCompanyEmail, { keyboardType: "email-address", autoCapitalize: "none", maxLength: 254 }, companyEmail.trim() && !isValidEmail(companyEmail) ? EMAIL_ALLOWED_TEXT : null],
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
          <View style={[styles.passwordInputWrap, password && !isValidPassword(password) ? styles.inputInvalid : null]}>
            <TextInput
              placeholder="Password *"
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
              placeholder="Confirm Password *"
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

      <Text style={styles.requiredNote}>Required fields are marked with an asterisk.</Text>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp} disabled={loading}>
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
  requiredNote: {
    marginTop: 12,
    color: fixieColors.textMuted,
    fontSize: 12,
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
  successCard: {
    alignItems: "center",
  },
  successLabel: {
    color: fixieColors.textSecondary,
    fontSize: 14,
  },
  successId: {
    marginTop: 10,
    fontSize: 56,
    fontWeight: "800",
    color: fixieColors.goldLight,
  },
  successNote: {
    marginTop: 12,
    textAlign: "center",
    color: fixieColors.textSecondary,
    lineHeight: 21,
  },
});
