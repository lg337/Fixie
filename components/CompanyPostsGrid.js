import { Ionicons } from "@expo/vector-icons";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fixieColors, fixieShadows } from "../lib/fixie-theme";

export default function CompanyPostsGrid({ posts, emptyText, onDelete, onPostPress }) {
  if (!posts?.length) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {posts.map((post) => (
        <View key={post.id} style={styles.card}>
          {post.mediaType === "image" ? (
            <TouchableOpacity activeOpacity={onPostPress ? 0.85 : 1} onPress={() => onPostPress?.(post)}>
              <Image source={{ uri: post.url }} style={styles.media} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.media, styles.videoCard]}>
              <Ionicons name="play-circle" size={44} color={fixieColors.goldLight} />
              <Text style={styles.videoLabel}>Video Post</Text>
            </View>
          )}
          {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : <Text style={styles.captionMuted}>No caption</Text>}
          {onDelete ? (
            <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(post.id)}>
              <Text style={styles.deleteButtonText}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingRight: 6,
    gap: 14,
  },
  card: {
    width: 220,
    backgroundColor: fixieColors.surfaceElevated,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: fixieColors.border,
    ...fixieShadows.card,
  },
  media: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    backgroundColor: fixieColors.backgroundAlt,
  },
  videoCard: {
    alignItems: "center",
    justifyContent: "center",
  },
  videoLabel: {
    marginTop: 8,
    color: fixieColors.textSecondary,
    fontWeight: "700",
  },
  caption: {
    marginTop: 10,
    color: fixieColors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  captionMuted: {
    marginTop: 10,
    color: fixieColors.textMuted,
    fontSize: 13,
  },
  deleteButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: fixieColors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  deleteButtonText: {
    color: fixieColors.textSecondary,
    fontWeight: "700",
    fontSize: 12,
  },
  emptyText: {
    color: fixieColors.textMuted,
    fontSize: 15,
  },
});
