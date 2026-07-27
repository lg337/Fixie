import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { applyFixieLanguage, LANGUAGES, LANGUAGE_STORAGE_KEY } from "../lib/fixie-language";
import { fixieColors, fixieShadows } from "../lib/fixie-theme";

export default function LanguageMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((storedCode) => {
      const storedLanguage = LANGUAGES.find((language) => language.code === storedCode);
      const nextLanguage = storedLanguage || LANGUAGES[0];
      if (isMounted) setSelectedLanguage(nextLanguage);
      if (!storedLanguage && storedCode) AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage.code);
      applyFixieLanguage(nextLanguage.code);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectLanguage = async (language) => {
    setSelectedLanguage(language);
    setOpen(false);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language.code);
    applyFixieLanguage(language.code);
  };

  useEffect(() => {
    const timers = [0, 80, 250, 600].map((delay) =>
      setTimeout(() => applyFixieLanguage(selectedLanguage.code), delay)
    );
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [pathname, selectedLanguage.code]);

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <TouchableOpacity style={styles.button} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Ionicons name="language-outline" size={18} color={fixieColors.goldLight} />
        <Text style={styles.buttonText}>{selectedLanguage.code.toUpperCase()}</Text>
        <Ionicons name="chevron-down" size={14} color={fixieColors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Language</Text>
            {LANGUAGES.map((language) => {
              const active = selectedLanguage.code === language.code;

              return (
                <TouchableOpacity
                  key={language.code}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => selectLanguage(language)}
                  activeOpacity={0.78}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{language.label}</Text>
                  {active ? <Ionicons name="checkmark" size={18} color={fixieColors.background} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 34,
    right: 112,
    zIndex: 1000,
    elevation: 1000,
  },
  button: {
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(26, 26, 26, 0.94)",
    borderWidth: 1,
    borderColor: fixieColors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    ...fixieShadows.card,
  },
  buttonText: {
    color: fixieColors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    alignItems: "flex-end",
    paddingTop: 82,
    paddingRight: 104,
  },
  menu: {
    width: 230,
    borderRadius: 18,
    backgroundColor: fixieColors.surface,
    borderWidth: 1,
    borderColor: fixieColors.border,
    padding: 10,
    ...fixieShadows.card,
  },
  menuTitle: {
    color: fixieColors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  option: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionActive: {
    backgroundColor: fixieColors.gold,
  },
  optionText: {
    color: fixieColors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  optionTextActive: {
    color: fixieColors.background,
    fontWeight: "900",
  },
});
