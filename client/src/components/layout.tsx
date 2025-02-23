import { SidebarNav } from "@/components/ui/sidebar-nav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen">
      <SidebarNav />
      {children}
    </div>
  );
}
