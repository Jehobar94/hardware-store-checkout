export function getSupabaseConfig(environment = process.env) {
  return {
    url: environment.SUPABASE_URL || '',
    anonKey: environment.SUPABASE_ANON_KEY || '',
    serviceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

export function hasSupabaseConfig(environment = process.env) {
  const config = getSupabaseConfig(environment);
  return Boolean(config.url && config.serviceRoleKey);
}
