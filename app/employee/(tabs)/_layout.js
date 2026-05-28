import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fixieColors } from "../../../lib/fixie-theme";

export default function EmployeeTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: fixieColors.background,
        tabBarInactiveTintColor: fixieColors.textMuted,
        tabBarStyle: {
          backgroundColor: fixieColors.surface,
          borderTopWidth: 1,
          borderTopColor: fixieColors.border,
          paddingBottom: 20,
          paddingTop: 12,
          height: 92,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
        },
        tabBarActiveBackgroundColor: fixieColors.gold,
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 8,
          marginVertical: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
