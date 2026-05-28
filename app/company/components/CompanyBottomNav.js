import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fixieColors } from "../../../lib/fixie-theme";

export default function CompanyBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: "Home", icon: "home-outline", route: "/company/home" },
    { label: "Requests", icon: "document-text-outline", route: "/company/requests" },
    { label: "Employees", icon: "people-outline", route: "/company/employees" },
    { label: "CRM", icon: "briefcase-outline", route: "/company/crm" },
  ];

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const active = pathname === item.route;
        return (
          <TouchableOpacity
            key={item.route}
            style={[styles.button, active && styles.buttonActive]}
            onPress={() => router.push(item.route)}
          >
            <Ionicons
              name={item.icon}
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
    borderTopWidth: 1,
    borderTopColor: fixieColors.border,
    backgroundColor: fixieColors.surface,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: "space-around",
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
  },
  buttonActive: {
    backgroundColor: fixieColors.gold,
  },
  label: {
    fontSize: 12,
    color: fixieColors.textSecondary,
    marginTop: 5,
    fontWeight: "600",
  },
  activeLabel: {
    color: fixieColors.background,
    fontWeight: "800",
  },
});
