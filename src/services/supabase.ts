import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Get Supabase configuration from runtime or build-time environment
 */
function getSupabaseConfig(): { url: string; anonKey: string } | null {
  // Try runtime configuration first (Railway deployment)
  let supabaseUrl = '';
  let supabaseAnonKey = '';

  const runtimeEnv = (window as any).ENV;
  if (runtimeEnv) {
    supabaseUrl = runtimeEnv.REACT_APP_SUPABASE_URL || '';
    supabaseAnonKey = runtimeEnv.REACT_APP_SUPABASE_ANON_KEY || '';
  }

  // Fallback to build-time environment variables
  if (!supabaseUrl) {
    supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
  }
  if (!supabaseAnonKey) {
    supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
  }

  // Return null if configuration is incomplete
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase configuration incomplete - database features disabled', {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey
    });
    return null;
  }

  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}

// Initialize Supabase client safely
let supabaseInstance: SupabaseClient | null = null;

try {
  const config = getSupabaseConfig();
  if (config) {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    console.log('✅ Supabase client initialized successfully');
  } else {
    console.log('ℹ️ Supabase client not initialized - configuration missing');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error);
  supabaseInstance = null;
}

// Export supabase client - use a safe default if not configured
export const supabase = supabaseInstance || createClient(
  'https://dummy.supabase.co', 
  'dummy-anon-key', 
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Helper function to check if Supabase is available
export const isSupabaseAvailable = (): boolean => {
  return supabaseInstance !== null;
};

// Helper function to get Supabase client with error handling
export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseInstance) {
    throw new Error('Supabase client not available. Please check configuration.');
  }
  return supabaseInstance;
};