import { cookies } from "next/headers";
import type { SupabaseClient, User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { Driver, User } from "@/lib/types";
import { mapProfileRow, isAdminRole } from "@/lib/supabase-data";
import { createClient } from "@/utils/supabase/server";

export class AppRouteError extends Error {
    status: number;

    constructor(message: string, status = 500) {
        super(message);
        this.name = "AppRouteError";
        this.status = status;
    }
}

export type RequestContext = {
    supabase: SupabaseClient;
    authUser: SupabaseAuthUser;
    profile: User | Driver;
    isAdmin: boolean;
};

export async function getRequestContext(): Promise<RequestContext> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new AppRouteError("Unauthorized", 401);
    }

    const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (profileError || !profileRow) {
        throw new AppRouteError("Profile not found", 403);
    }

    const profile = mapProfileRow(profileRow);

    return {
        supabase,
        authUser: user,
        profile,
        isAdmin: isAdminRole(profile.role),
    };
}

export function ensureAdmin(context: RequestContext) {
    if (!context.isAdmin) {
        throw new AppRouteError("Forbidden", 403);
    }
}

export function toErrorResponse(error: unknown, fallbackMessage: string) {
    if (error instanceof AppRouteError) {
        return Response.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error && error.message ? error.message : fallbackMessage;
    return Response.json({ error: message }, { status: 500 });
}
