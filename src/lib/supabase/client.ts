const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseReadConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export async function readSupabaseTable<T>(path: string): Promise<T[] | null> {
  if (!supabaseUrl || !supabasePublishableKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    console.warn(`Supabase read failed for ${path}: ${response.status}`);
    return null;
  }

  return response.json();
}
