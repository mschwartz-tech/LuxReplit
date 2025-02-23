import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout";

export function ProtectedRoute({
  component: Component,
  excludeLayout = false,
}: {
  component: () => React.JSX.Element;
  excludeLayout?: boolean;
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Only redirect if we're sure the user isn't authenticated
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!user) {
    return null;
  }

  // Render the protected component
  const content = <Component />;

  // Wrap with layout unless explicitly excluded
  return excludeLayout ? content : <DashboardLayout>{content}</DashboardLayout>;
}