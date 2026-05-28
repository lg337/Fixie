import { Image, StyleSheet, View } from "react-native";
import { fixieColors, fixieShadows } from "../lib/fixie-theme";

export default function FixieLogo({ size = 108, width, framed = false }) {
  const logoWidth = width ?? size;
  const logoHeight = size;

  return (
    <View
      style={[
        styles.wrap,
        framed && {
          width: logoWidth + 500,
          height: logoHeight + 500,
          borderRadius: 24,
          backgroundColor: fixieColors.surfaceElevated,
          borderColor: "rgba(229, 200, 140, 0.22)",
          borderWidth: 1,
        },
      ]}
    >
      <Image
        source={require("../assets/images/fixie-logo.png")}
        style={{ width: logoWidth, height: logoHeight }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    ...fixieShadows.glow,
  },
});
