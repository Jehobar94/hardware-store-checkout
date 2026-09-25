export function getSupabaseConfig(environment = process.env) {
  return {
    url: normalizeSupabaseUrl(environment.SUPABASE_URL || ''),
    anonKey: environment.SUPABASE_ANON_KEY || '',
    serviceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

function normalizeSupabaseUrl(value) {
  return value.replace(/\/rest\/v1\/?$/, '');
}

export function hasSupabaseConfig(environment = process.env) {
  const config = getSupabaseConfig(environment);
  return Boolean(config.url && config.serviceRoleKey);
}
