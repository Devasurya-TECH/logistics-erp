import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Role-based routing middleware
// When NEXT_PUBLIC_APP_ROLE is set, restrict the app to that role only
export function middleware(request: NextRequest) {
    const appRole = process.env.NEXT_PUBLIC_APP_ROLE; // 'driver' | 'supervisor' | 'manager'
    const { pathname } = request.nextUrl;

    // If no role env set, allow everything (unified mode for local dev)
    if (!appRole) return NextResponse.next();

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
        return NextResponse.redirect(new URL(`/${appRole}`, request.url));
    }

    // Allow access to the configured role's routes
    if (pathname.startsWith(`/${appRole}`)) {
        return NextResponse.next();
    }

    // Block access to other roles' routes → redirect to configured role
    const roleRoutes = ['driver', 'supervisor', 'manager'];
    const isOtherRole = roleRoutes.some(r => r !== appRole && pathname.startsWith(`/${r}`));
    if (isOtherRole) {
        return NextResponse.redirect(new URL(`/${appRole}`, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Match all paths except static files
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.json$).*)',
    ],
};
