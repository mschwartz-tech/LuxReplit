import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Dumbbell, Home, Users, Calendar, Settings, Utensils } from "lucide-react";
import { LogoutButton } from "./logout-button";
import { useAuth } from "@/hooks/use-auth";

export function Navigation() {
  const [path] = useLocation();
  const { user } = useAuth();

  return (
    <nav className="flex flex-col gap-2 p-4 min-w-[200px] border-r h-screen">
      <div className="flex-1">
        <div className="space-y-1">
          <Link
            to="/"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              path === "/" && "bg-muted text-primary"
            )}
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>

          <Link
            to="/meal-plans"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              path === "/meal-plans" && "bg-muted text-primary"
            )}
          >
            <Utensils className="h-4 w-4" />
            Meal Plans
          </Link>

          <Link
            to="/workout-plans"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              path === "/workout-plans" && "bg-muted text-primary"
            )}
          >
            <Dumbbell className="h-4 w-4" />
            Workout Plans
          </Link>

          {/* Show members link only for admin users */}
          {user?.role === 'admin' && (
            <Link
              to="/members"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                path === "/members" && "bg-muted text-primary"
              )}
            >
              <Users className="h-4 w-4" />
              Members
            </Link>
          )}

          {/* Show schedule for both admins and trainers */}
          {(user?.role === 'admin' || user?.role === 'trainer') && (
            <Link
              to="/schedule"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                path === "/schedule" && "bg-muted text-primary"
              )}
            >
              <Calendar className="h-4 w-4" />
              Schedule
            </Link>
          )}

          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              path === "/settings" && "bg-muted text-primary"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>

      <div className="border-t pt-4">
        <LogoutButton />
      </div>
    </nav>
  );
}