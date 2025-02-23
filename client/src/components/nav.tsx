import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Dumbbell, 
  Home, 
  Users, 
  Calendar, 
  Settings, 
  Utensils,
  UserCog,
  BookOpen,
  GraduationCap,
  ClipboardList,
  CreditCard,
  Tags
} from "lucide-react";
import { LogoutButton } from "./logout-button";
import { useAuth } from "@/hooks/use-auth";

export function Navigation() {
  const [path] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTrainer = user?.role === 'trainer';

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

          {isAdmin && (
            <>
              <Link
                to="/member-management"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  path === "/member-management" && "bg-muted text-primary"
                )}
              >
                <Users className="h-4 w-4" />
                Member Management
              </Link>

              <Link
                to="/trainer-management"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  path === "/trainer-management" && "bg-muted text-primary"
                )}
              >
                <UserCog className="h-4 w-4" />
                Trainer Management
              </Link>

              <Link
                to="/billing"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  path === "/billing" && "bg-muted text-primary"
                )}
              >
                <CreditCard className="h-4 w-4" />
                Billing
              </Link>

              <Link
                to="/pricing"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  path === "/pricing" && "bg-muted text-primary"
                )}
              >
                <Tags className="h-4 w-4" />
                Pricing
              </Link>
            </>
          )}

          {(isAdmin || isTrainer) && (
            <>
              <Link
                to="/exercise-library"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  path === "/exercise-library" && "bg-muted text-primary"
                )}
              >
                <BookOpen className="h-4 w-4" />
                Exercise Library
              </Link>

              <Link
                to="/training-programs"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  path === "/training-programs" && "bg-muted text-primary"
                )}
              >
                <GraduationCap className="h-4 w-4" />
                Training Programs
              </Link>

              <Link
                to="/training-management"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  path === "/training-management" && "bg-muted text-primary"
                )}
              >
                <ClipboardList className="h-4 w-4" />
                Training Management
              </Link>
            </>
          )}

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

          {(isAdmin || isTrainer) && (
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