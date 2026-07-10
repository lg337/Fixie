import { Platform, StyleSheet, Text, View } from "react-native";
import { fixieColors, fixieShadows } from "../lib/fixie-theme";

export default function FixieLogo({ size = 108, width, framed = false }) {
  const logoWidth = width ?? size * 2.55;
  const logoHeight = size;
  const framePadding = Math.max(10, size * 0.08);
  const frameWidth = framed ? logoWidth + framePadding * 2 : logoWidth;
  const frameHeight = framed ? logoHeight + framePadding * 2 : logoHeight;
  const wordmarkSize = size * 0.48;
  const wordmarkLineHeight = size * 0.56;
  const wordmarkStyle = {
    fontSize: wordmarkSize,
    lineHeight: wordmarkLineHeight,
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          width: frameWidth,
          height: frameHeight,
          padding: framed ? framePadding : 0,
        },
        framed && styles.frame,
      ]}
    >
      <View style={[styles.wordmarkStack, { width: logoWidth, height: wordmarkLineHeight }]}>
        <Text style={[styles.wordmarkBase, styles.wordmarkShadow, wordmarkStyle]} numberOfLines={1} adjustsFontSizeToFit>
          FIXIE
        </Text>
        <Text style={[styles.wordmarkBase, styles.wordmarkHighlight, wordmarkStyle]} numberOfLines={1} adjustsFontSizeToFit>
          FIXIE
        </Text>
        <Text style={[styles.wordmarkBase, styles.wordmark, wordmarkStyle]} numberOfLines={1} adjustsFontSizeToFit>
          FIXIE
        </Text>
      </View>
      <View style={[styles.underline, { width: logoWidth * 0.62, height: Math.max(1, size * 0.012) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    ...fixieShadows.glow,
  },
  frame: {
    borderRadius: 24,
    backgroundColor: fixieColors.surfaceElevated,
    borderColor: "rgba(229, 200, 140, 0.22)",
    borderWidth: 1,
  },
  wordmarkStack: {
    alignItems: "center",
    justifyContent: "center",
  },
  wordmarkBase: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    fontFamily: Platform.select({
      ios: "Didot",
      android: "serif",
      default: "Didot, Bodoni 72, Baskerville, Georgia, Times New Roman, serif",
    }),
    fontStyle: "italic",
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  wordmarkShadow: {
    color: "#6F521A",
    transform: [{ translateY: 2 }],
    textShadowColor: "rgba(0, 0, 0, 0.88)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 7,
  },
  wordmarkHighlight: {
    color: "#FFF1B8",
    transform: [{ translateY: -1 }],
    opacity: 0.55,
  },
  wordmark: {
    color: "#D4AF37",
    textShadowColor: "rgba(255, 218, 104, 0.42)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  underline: {
    marginTop: -4,
    borderRadius: 999,
    backgroundColor: "#D4AF37",
    opacity: 0.68,
  },
});
