import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nxbxpcrvbsdmgyoxjjkl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YnhwY3J2YnNkbWd5b3hqamtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjMxMTUsImV4cCI6MjA4MDQ5OTExNX0.qNnvg7F-aOmN74Z9FB5w_YUYH1Z9OMiw_BymFNukL4A'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Import the supabase client like this:
// For React:
// import { supabase } from "@/integrations/supabase/client";
// For React Native:
// import { supabase } from "@/src/integrations/supabase/client";
