import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 relative">
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.15] dark:opacity-[0.08]"
          style={{
            backgroundImage: 'url("/assets/branding/logobanner.svg")',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '90% auto',
            filter: 'grayscale(0.5)'
          }}
        />

        <main className="relative z-10 p-8 overflow-auto">
          <h1 className="text-3xl font-bold mb-8">
            Welcome back, {user.name}
          </h1>

          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-lg">
              <CardContent className="p-6 text-center">
                <h2 className="text-2xl font-semibold text-muted-foreground">
                  Dashboard Coming Soon
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We're working on bringing you an amazing dashboard experience.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}