import { SidebarNav } from "@/components/ui/sidebar-nav";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <SidebarNav />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
