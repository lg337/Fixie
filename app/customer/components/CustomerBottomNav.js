import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fixieColors, fixieShadows } from "../../../lib/fixie-theme";

const NAV_ITEMS = [
  { label: "Home", icon: "home-outline", activeIcon: "home", route: "/customer/home" },
  { label: "Ideas", icon: "images-outline", activeIcon: "images", route: "/customer/inspiration" },
  { label: "Planner", icon: "create-outline", activeIcon: "create", route: "/customer/planner" },
  { label: "Saved", icon: "heart-outline", activeIcon: "heart", route: "/customer/saved" },
  { label: "Requests", icon: "briefcase-outline", activeIcon: "briefcase", route: "/customer/requests" },
  { label: "Profile", icon: "person-outline", activeIcon: "person", route: "/customer/profile" },
];

export default function CustomerBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.route;

        return (
          <TouchableOpacity
            key={item.route}
            style={[styles.button, active && styles.buttonActive]}
            onPress={() => router.replace(item.route)}
          >
            <Ionicons
              name={active ? item.activeIcon : item.icon}
              size={20}
              color={active ? fixieColors.background : fixieColors.textSecondary}
            />
            <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: fixieColors.border,
    backgroundColor: fixieColors.surface,
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 58,
    paddingVertical: 8,
    borderRadius: 14,
  },
  buttonActive: {
    backgroundColor: fixieColors.gold,
    ...fixieShadows.glow,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: fixieColors.textSecondary,
  },
  activeLabel: {
    color: fixieColors.background,
    fontWeight: "800",
  },
});
