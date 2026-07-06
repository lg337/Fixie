import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fixieColors } from "../../../lib/fixie-theme";
import useFixieLayout from "../../../lib/useFixieLayout";

export default function CompanyBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const layout = useFixieLayout();

  const navItems = [
    { label: "Home", icon: "home-outline", route: "/company/home" },
    { label: "Requests", icon: "document-text-outline", route: "/company/requests" },
    { label: "Employees", icon: "people-outline", route: "/company/employees" },
    { label: "CRM", icon: "briefcase-outline", route: "/company/crm" },
  ];

  return (
    <View style={[styles.container, layout.isDesktop && styles.desktopContainer]}>
      {navItems.map((item) => {
        const active = pathname === item.route;
        return (
          <TouchableOpacity
            key={item.route}
            style={[styles.button, layout.isDesktop && styles.desktopButton, active && styles.buttonActive]}
            onPress={() => router.push(item.route)}
          >
            <Ionicons
              name={item.icon}
              size={layout.isDesktop ? 18 : 20}
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
  desktopContainer: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    marginBottom: 18,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: fixieColors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
  },
  desktopButton: {
    flexDirection: "row",
    gap: 8,
    maxWidth: 170,
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
