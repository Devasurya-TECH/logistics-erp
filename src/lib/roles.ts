import { UserRole } from "@/lib/types";

const ROLE_ALIASES: Record<string, UserRole> = {
    admin: "manager",
    manager: "manager",
    supervisor: "supervisor",
    driver: "driver",
};

export function normalizeRole(role: string | null | undefined): UserRole | null {
    if (!role) return null;
    const normalized = ROLE_ALIASES[role.toLowerCase()];
    return normalized ?? null;
}

export function roleToPath(role: string | null | undefined): string {
    const normalized = normalizeRole(role);
    return normalized ? `/${normalized}` : "/login";
}

