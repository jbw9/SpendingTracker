import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pbfzzctwvwmgxorybyfd.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiZnp6Y3R3dndtZ3hvcnlieWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MjA0NjMsImV4cCI6MjA2NDQ5NjQ2M30.bHgfAzCi5pynMZTL2WnfKOtAzDSqv9bl0ZNv5IWVYWY";
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

export default supabase;
