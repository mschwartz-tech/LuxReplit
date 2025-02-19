import { SidebarNav } from "@/components/ui/sidebar-nav";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/use-auth";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader className="border-b">
            <div className="flex items-center justify-between px-4">
              <Logo variant="banner" size="md" className="py-2" />
              <SidebarTrigger />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav />
          </SidebarContent>
          <SidebarFooter className="border-t">
            <div className="flex items-center gap-2 px-4 py-2">
              <Logo variant="icon" size="sm" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.username}</span>
                <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-y-auto">
          <div className="container p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
