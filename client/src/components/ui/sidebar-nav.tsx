import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";
import {
  Users,
  Calendar,
  BarChart,
  Settings,
  LogOut,
  Dumbbell,
  Utensils,
  UserPlus,
  ClipboardList,
  UserCog,
  BookOpen,
  GraduationCap,
  CreditCard,
  Tags
} from "lucide-react";
import { Loader2 } from "lucide-react";

export function SidebarNav() {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const userRole = user?.role?.toLowerCase() || '';

  const items = [
    {
      title: "Dashboard",
      icon: BarChart,
      href: "/",
      roles: ["admin", "trainer", "member"],
    },
    {
      title: "Member Management",
      icon: Users,
      href: "/members", 
      roles: ["admin"],
    },
    {
      title: "Trainer Management",
      icon: UserCog,
      href: "/trainer-management",
      roles: ["admin"],
    },
    {
      title: "Exercise Library",
      icon: BookOpen,
      href: "/exercise-library",
      roles: ["admin", "trainer"],
    },
    {
      title: "Training Programs",
      icon: GraduationCap,
      href: "/training-programs",
      roles: ["admin", "trainer"],
    },
    {
      title: "Training Management",
      icon: ClipboardList,
      href: "/training-management",
      roles: ["admin", "trainer"],
    },
    {
      title: "Meal Plans",
      icon: Utensils,
      href: "/meal-plans",
      roles: ["admin", "trainer", "member"],
    },
    {
      title: "Workout Plans",
      icon: Dumbbell,
      href: "/workout-plans",
      roles: ["admin", "trainer", "member"],
    },
    {
      title: "Members",
      icon: UserPlus,
      href: "/members",
      roles: ["admin"],
    },
    {
      title: "Billing",
      icon: CreditCard,
      href: "/billing",
      roles: ["admin"],
    },
    {
      title: "Pricing",
      icon: Tags,
      href: "/pricing",
      roles: ["admin"],
    },
    {
      title: "Schedule",
      icon: Calendar,
      href: "/schedule",
      roles: ["admin", "trainer", "member"],
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings",
      roles: ["admin", "trainer", "member"],
    },
  ];

  const visibleItems = items.filter(item =>
    userRole && item.roles.includes(userRole)
  );

  if (!visibleItems.length) {
    return (
      <div className="border-r bg-sidebar h-screen w-64 flex flex-col">
        <div className="flex-1">
          <div className="px-3 py-2">
            <div className="mb-6 px-4">
              <Logo size="xl" type="banner" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setLocation('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

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
          className={cn(
            "w-full justify-start gap-2",
            "text-muted-foreground hover:text-foreground",
            "transition-colors duration-200",
            logoutMutation.isPending && "opacity-70 cursor-not-allowed"
          )}
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          {logoutMutation.isPending ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </div>
  );
}