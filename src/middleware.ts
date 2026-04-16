import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { normalizeRole, roleToPath } from '@/lib/roles';

// Role-based routing middleware
// When NEXT_PUBLIC_APP_ROLE is set, restrict the app to that role only
export function middleware(request: NextRequest) {
    const appRole = normalizeRole(process.env.NEXT_PUBLIC_APP_ROLE); // driver | supervisor | manager (admin alias -> manager)
    const { pathname } = request.nextUrl;
    const normalizedRolePath = roleToPath(appRole);

    // If no role env set, allow everything (unified mode for local dev)
    if (appRole === null) return NextResponse.next();

    // Always allow these paths
    if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/login') ||
        pathname === '/favicon.ico' ||
        pathname === '/manifest.json' ||
        pathname.startsWith('/icon')
    ) {
        return NextResponse.next();
    }

    // Root → redirect to role dashboard
    if (pathname === '/') {
        return NextResponse.redirect(new URL(normalizedRolePath, request.url));
    }

    // Allow access to the configured role's routes
    if (pathname.startsWith(normalizedRolePath)) {
        return NextResponse.next();
    }

    // Manager deployments also accept /admin alias
    if (appRole === 'manager' && pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    // Block access to other roles' routes → redirect to configured role
    const roleRoutes = ['driver', 'supervisor', 'manager', 'admin'];
    const isOtherRole = roleRoutes.some((r) => {
        const normalizedRouteRole = normalizeRole(r);
        return normalizedRouteRole !== appRole && pathname.startsWith(`/${r}`);
    });
    if (isOtherRole) {
        return NextResponse.redirect(new URL(normalizedRolePath, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Match all paths except static files
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.json$).*)',
    ],
};
