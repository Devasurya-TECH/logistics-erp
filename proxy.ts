import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { normalizeRole, roleToPath } from "@/lib/roles";

export function proxy(request: NextRequest) {
    const appRole = normalizeRole(process.env.NEXT_PUBLIC_APP_ROLE);
    const { pathname } = request.nextUrl;
    const normalizedRolePath = roleToPath(appRole);

    if (appRole !== null) {
        if (pathname === "/") {
            return Response.redirect(new URL(normalizedRolePath, request.url));
        }

        if (!pathname.startsWith("/api") && !pathname.startsWith("/login")) {
            const roleRoutes = ["driver", "supervisor", "manager", "admin"];
            const isOtherRole = roleRoutes.some((routeRole) => {
                const normalizedRouteRole = normalizeRole(routeRole);
                return normalizedRouteRole !== appRole && pathname.startsWith(`/${routeRole}`);
            });

            if (isOtherRole) {
                return Response.redirect(new URL(normalizedRolePath, request.url));
            }
        }
    }

    return updateSession(request);
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-192x192.png|icon-512x512.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
