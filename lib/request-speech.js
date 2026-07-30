import { Alert, Platform } from "react-native";
import { getRequestSummary } from "./request-dates";

function cleanSpeechText(value) {
  return String(value || "")
    .replace(/\n-{3,}\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

export function getRequestSpeechText(request = {}, fallbackTitle = "Request") {
  const summary = getRequestSummary(request, fallbackTitle);
  const notes = cleanSpeechText(request.RequestNotes || request.RequestDescription || "");
  const parts = [`Request: ${summary}`];

  if (notes && notes !== summary) parts.push(`Details: ${notes}`);
  if (request.CustomerTable?.CustomerName) parts.push(`Customer: ${request.CustomerTable.CustomerName}`);

  return parts.join(". ");
}

export function speakRequest(request, fallbackTitle = "Request") {
  const text = getRequestSpeechText(request, fallbackTitle);

  if (!text) {
    Alert.alert("Nothing to read", "This request does not have any details yet.");
    return;
  }

  if (Platform.OS === "web" && typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = document?.documentElement?.lang || "en-US";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
    return;
  }

  Alert.alert("Voice not available", "Request audio is available in the web app.");
}
