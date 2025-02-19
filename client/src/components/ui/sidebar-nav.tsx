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
} from "lucide-react";

export function SidebarNav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const items = [
    {
      title: "Dashboard",
      icon: BarChart,
      href: "/",
      roles: ["admin", "trainer", "member"],
    },
    {
      title: "Members",
      icon: Users,
      href: "/members",
      roles: ["admin", "trainer"],
    },
    {
      title: "Training",
      icon: Dumbbell,
      href: "/training",
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

  return (
    <div className="border-r bg-sidebar h-screen w-64">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="mb-2 px-4 py-2">
            <Logo size="lg" type="banner" />
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="space-y-1">
              {items
                .filter((item) => item.roles.includes(user?.role || ""))
                .map((item) => (
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
        <div className="px-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}