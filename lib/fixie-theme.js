import { Platform } from "react-native";

export const fixieColors = {
  background: "#000000",
  backgroundAlt: "#0D0D0D",
  surface: "#1A1A1A",
  surfaceElevated: "#242424",
  border: "#333333",
  text: "#FFFFFF",
  textSecondary: "#B3B3B3",
  textMuted: "#808080",
  gold: "#D8C690",
  goldLight: "#F3E7C2",
  goldDeep: "#A99158",
  success: "#58B77A",
  pending: "#D8C690",
  error: "#D66A5F",
  info: "#6FA8C9",
  overlay: "rgba(0, 0, 0, 0.78)",
  glow: "rgba(216, 198, 144, 0.22)",
  shadow: "rgba(0, 0, 0, 0.48)",
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
        elevation: 7,
      };

export const fixieShadows = {
  card: cardShadow,
  glow: glowShadow,
};

export const fixieStatusColors = {
  new: fixieColors.info,
  pending: fixieColors.pending,
  source_parts: fixieColors.info,
  labor: fixieColors.gold,
  in_progress: fixieColors.gold,
  final_touches: fixieColors.pending,
  completed: fixieColors.success,
  error: fixieColors.error,
};
