import { Platform } from "react-native";

export const fixieColors = {
  background: "#1C1C1E",
  backgroundAlt: "#232326",
  surface: "#2A2A2D",
  surfaceElevated: "#323236",
  border: "#3A3A3C",
  text: "#EAEAEA",
  textSecondary: "#A1A1A6",
  textMuted: "#6E6E73",
  gold: "#C8A96A",
  goldLight: "#E5C88C",
  goldDeep: "#A3834A",
  success: "#4CAF50",
  pending: "#D4A373",
  error: "#C75C5C",
  info: "#5DADE2",
  overlay: "rgba(12, 12, 13, 0.78)",
  glow: "rgba(200, 169, 106, 0.25)",
  shadow: "rgba(0, 0, 0, 0.4)",
};

const cardShadow =
  Platform.OS === "web"
    ? {}
    : {
        shadowColor: "#000",
        shadowOpacity: 0.38,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
      };

const glowShadow =
  Platform.OS === "web"
    ? {}
    : {
        shadowColor: fixieColors.gold,
        shadowOpacity: 0.28,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      };

export const fixieShadows = {
  card: cardShadow,
  glow: glowShadow,
};

export const fixieStatusColors = {
  new: fixieColors.info,
  pending: fixieColors.pending,
  in_progress: fixieColors.gold,
  completed: fixieColors.success,
  error: fixieColors.error,
};
