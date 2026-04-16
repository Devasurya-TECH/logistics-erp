import DashboardLayout from "@/components/common/DashboardLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
    return <DashboardLayout requiredRole="supervisor">{children}</DashboardLayout>;
}
