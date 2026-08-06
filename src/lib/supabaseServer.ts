import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  console.log("[supabase env check]", {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 15),
    keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
  });

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component context where cookies
            // can't be written — safe to ignore, middleware refreshes them.
          }
        },
      },
    },
  );
}