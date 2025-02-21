import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";
import {
  Users,
  Calendar,
  DollarSign,
  BarChart,
  Settings,
  LogOut,
  FileText,
  Dumbbell,
  UserPlus,
  CreditCard,
} from "lucide-react";

export function SidebarNav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const userRole = user?.role?.toLowerCase() || '';

  // Ensure we have a valid role or default to restricted access
  if (!user || !userRole) {
    console.warn('User or role not properly initialized');
    return null;
  }

  const items = [
    {
      title: "Dashboard",
      icon: BarChart,
      href: "/",
      roles: ["admin", "trainer", "member"],
    },
    {
      title: "Gym Members",
      icon: Users,
      href: "/gym-members",
      roles: ["admin"],
    },
    {
      title: "Training Clients",
      icon: UserPlus,
      href: "/training-clients",
      roles: ["admin", "trainer"],
    },
    {
      title: "Training Management",
      icon: Dumbbell,
      href: "/training-management",
      roles: ["admin", "trainer"],
    },
    {
      title: "Exercise Library",
      icon: Dumbbell,
      href: "/exercise-library",
      roles: ["admin", "trainer", "member"],
    },
    {
      title: "Schedule",
      icon: Calendar,
      href: "/schedule",
      roles: ["admin", "trainer", "member"],
    },
    {
      title: "Invoices",
      icon: FileText,
      href: "/invoices",
      roles: ["admin"],
    },
    {
      title: "Pricing",
      icon: CreditCard,
      href: "/pricing",
      roles: ["admin"],
    },
    {
      title: "Billing",
      icon: DollarSign,
      href: "/billing",
      roles: ["admin"],
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings",
      roles: ["admin", "trainer", "member"],
    },
  ];

  // Filter items based on user role
  const visibleItems = items.filter(item => item.roles.includes(userRole));

  // If no items are visible for the user's role, something might be wrong
  if (visibleItems.length === 0) {
    console.error('No navigation items available for role:', userRole);
    return null;
  }

  return (
    <div className="border-r bg-sidebar h-screen w-64 flex flex-col">
      <div className="flex-1">
        <div className="px-3 py-2">
          <div className="mb-6 px-4">
            <Logo size="xl" type="banner" />
          </div>
          <ScrollArea className="h-[calc(100vh-10rem)]">
            <div className="space-y-1">
              {visibleItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={location === item.href ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2",
                      location === item.href && "bg-sidebar-accent"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Button>
                </Link>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}