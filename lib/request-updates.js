import { Platform } from "react-native";

const REQUEST_UPDATE_EVENT = "fixie:requests-updated";
const REQUEST_UPDATE_STORAGE_KEY = "fixie.requestsUpdatedAt";

export function notifyRequestsChanged() {
  if (Platform.OS !== "web" || typeof window === "undefined") return;

  const detail = { updatedAt: Date.now() };
  window.dispatchEvent(new CustomEvent(REQUEST_UPDATE_EVENT, { detail }));

  try {
    window.localStorage.setItem(REQUEST_UPDATE_STORAGE_KEY, String(detail.updatedAt));
  } catch {
    // Some browsers disable storage in private contexts. Same-tab events still work.
  }
}

export function subscribeToRequestChanges(callback) {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return () => {};
  }

  const handleCustomEvent = () => callback();
  const handleStorageEvent = (event) => {
    if (event.key === REQUEST_UPDATE_STORAGE_KEY) callback();
  };

  window.addEventListener(REQUEST_UPDATE_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(REQUEST_UPDATE_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
