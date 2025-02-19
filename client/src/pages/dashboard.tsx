import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { Loader2, Users, Calendar, DollarSign, BarChart } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

const DashboardCard = ({ title, value, icon }: DashboardCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const dashboardCards = [
    { title: "Total Members", value: "24", icon: <Users className="h-4 w-4 text-muted-foreground" /> },
    { title: "Active Sessions", value: "12", icon: <Calendar className="h-4 w-4 text-muted-foreground" /> },
    { title: "Revenue", value: "$4,250", icon: <DollarSign className="h-4 w-4 text-muted-foreground" /> },
    { title: "Active Plans", value: "18", icon: <BarChart className="h-4 w-4 text-muted-foreground" /> }
  ];

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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {dashboardCards.map((card, index) => (
              <DashboardCard key={index} {...card} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}