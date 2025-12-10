import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'qorbooks-desktop@0.1.0',
    },
  },
});

// Check if we're online
export const isOnline = () => {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return false;
};

// Test connection to Supabase
export const testConnection = async (): Promise<boolean> => {
  try {
    if (!isOnline()) {
      return false;
    }

    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    return !error;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};
