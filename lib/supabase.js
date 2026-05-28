import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

export const supabase = createClient(
  "https://kansmvlazcsnqisxrsyg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthbnNtdmxhemNzbnFpc3hyc3lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjE1NDgsImV4cCI6MjA4NTYzNzU0OH0.4QDm8mqEP0MJt0xGdsfdl8xgPlmUpRHBBlgkx9Q_JAM",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);