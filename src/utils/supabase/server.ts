import { createServerClient } from "@supabase/ssr";
import type { cookies as nextCookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./shared";

type CookieStore = Awaited<ReturnType<typeof nextCookies>>;

export function createClient(cookieStore: CookieStore) {
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                } catch {
                    // Server components may not be allowed to mutate cookies.
                }
            },
        },
    });
}
