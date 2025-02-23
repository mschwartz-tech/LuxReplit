import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const { logoutMutation } = useAuth();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
      className="w-full justify-start"
    >
      <LogOut className="mr-2 h-4 w-4" />
      {logoutMutation.isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}
