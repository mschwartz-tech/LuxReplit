import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Member } from "@shared/schema";

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTrainer = user?.role === "trainer";

  const { data: clients, isLoading } = useQuery<Member[]>({
    queryKey: [isAdmin ? "/api/members" : `/api/members/trainer/${user?.id}`],
    enabled: !!user && (isAdmin || isTrainer),
  });

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Manage all clients and their assignments"
              : "Manage your assigned clients"}
          </p>
        </div>
        {isAdmin && (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Client
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
          <CardDescription>
            {isAdmin ? "All registered clients" : "Your assigned clients"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {clients?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No clients found.
              </p>
            ) : (
              <div className="space-y-4">
                {clients?.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">Client #{client.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {client.email}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
