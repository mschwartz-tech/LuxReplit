import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { Loader2, Users, Calendar, DollarSign, BarChart } from "lucide-react";

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
        {/* Background container with logo */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.15] dark:opacity-[0.08]"
          style={{
            backgroundImage: 'url("/assets/branding/logo.png")',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '75% auto',
            filter: 'grayscale(0.5)'
          }}
        />

        {/* Content overlay */}
        <main className="relative z-10 p-8 overflow-auto">
          <h1 className="text-3xl font-bold mb-8">
            Welcome back, {user.name}
          </h1>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Members
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Sessions
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$4,250</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Plans
                </CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">18</div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}