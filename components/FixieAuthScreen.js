import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import FixieLogo from "./FixieLogo";
import { fixieColors, fixieShadows } from "../lib/fixie-theme";

export default function FixieAuthScreen({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  scroll = false,
}) {
  const Content = scroll ? ScrollView : View;
  const contentProps = scroll
    ? { contentContainerStyle: styles.scrollContent, showsVerticalScrollIndicator: false }
    : { style: styles.scrollContent };

  return (
    <SafeAreaView style={styles.screen}>
      <Content {...contentProps}>
        <View style={styles.hero}>
          <FixieLogo size={120} />
          <Text style={styles.brand}>FIXIE</Text>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.card}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Content>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: fixieColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  hero: {
    alignItems: "center",
    marginBottom: 26,
  },
  brand: {
    marginTop: 14,
    fontSize: 32,
    fontWeight: "800",
    color: fixieColors.text,
    letterSpacing: 5,
  },
  eyebrow: {
    marginTop: 12,
    color: fixieColors.goldLight,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: "700",
    color: fixieColors.text,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: fixieColors.textSecondary,
    textAlign: "center",
    maxWidth: 320,
  },
  card: {
    backgroundColor: fixieColors.surface,
    borderWidth: 1,
    borderColor: fixieColors.border,
    borderRadius: 26,
    padding: 22,
    ...fixieShadows.card,
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
    gap: 12,
  },
});
