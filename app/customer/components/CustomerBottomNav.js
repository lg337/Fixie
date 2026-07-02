import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fixieColors, fixieShadows } from "../../../lib/fixie-theme";
import useFixieLayout from "../../../lib/useFixieLayout";

const NAV_ITEMS = [
  { label: "Home", icon: "home-outline", activeIcon: "home", route: "/customer/home" },
  { label: "Requests", icon: "briefcase-outline", activeIcon: "briefcase", route: "/customer/requests" },
  { label: "Profile", icon: "person-outline", activeIcon: "person", route: "/customer/profile" },
];

export default function CustomerBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const layout = useFixieLayout();

  return (
    <View style={[styles.container, layout.isDesktop && styles.desktopContainer]}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.route;

        return (
          <TouchableOpacity
            key={item.route}
            style={[styles.button, layout.isDesktop && styles.desktopButton, active && styles.buttonActive]}
            onPress={() => router.replace(item.route)}
          >
            <Ionicons
              name={active ? item.activeIcon : item.icon}
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
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: fixieColors.border,
    backgroundColor: fixieColors.surface,
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 16,
  },
  desktopButton: {
    flexDirection: "row",
    gap: 8,
    maxWidth: 170,
  },
  buttonActive: {
    backgroundColor: fixieColors.gold,
    ...fixieShadows.glow,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: fixieColors.textSecondary,
  },
  activeLabel: {
    color: fixieColors.background,
    fontWeight: "800",
  },
});
