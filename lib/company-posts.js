import { supabase } from "./supabase";

const BUCKET = "company-images";

const getManifestPath = (companyID) => `company-posts/${companyID}/manifest.json`;

const getPublicUrl = (path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

const inferExtension = (uri, mediaType) => {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (match?.[1]) return match[1].toLowerCase();
  return mediaType === "video" ? "mp4" : "jpg";
};

export async function loadCompanyPosts(companyID) {
  try {
    const response = await fetch(getPublicUrl(getManifestPath(companyID)));
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function saveCompanyPosts(companyID, posts) {
  const path = getManifestPath(companyID);
  const payload = JSON.stringify(posts);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, payload, { contentType: "application/json", upsert: true });

  if (error) throw error;
}

export async function uploadCompanyPostMedia(companyID, asset) {
  const mediaType = asset.type === "video" ? "video" : "image";
  const extension = inferExtension(asset.uri, mediaType);
  const path = `company-posts/${companyID}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const contentType = asset.mimeType || (mediaType === "video" ? "video/mp4" : "image/jpeg");
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType, upsert: true });

  if (error) throw error;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    mediaType,
    url: getPublicUrl(path),
    caption: "",
    createdAt: new Date().toISOString(),
  };
}
