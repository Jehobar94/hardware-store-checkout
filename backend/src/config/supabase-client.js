import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig, hasSupabaseConfig } from './supabase.js';

export function createSupabaseClient(environment = process.env) {
  if (!hasSupabaseConfig(environment)) {
    return null;
  }

  const config = getSupabaseConfig(environment);
  return createClient(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
