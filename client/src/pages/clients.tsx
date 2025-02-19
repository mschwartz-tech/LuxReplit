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
import { Plus, Loader2, Search, Filter, BarChart, UserPlus, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Member } from "@shared/schema";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Link } from "wouter";

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTrainer = user?.role === "trainer";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const { data: clients, isLoading } = useQuery<Member[]>({
    queryKey: [isAdmin ? "/api/members" : `/api/members/trainer/${user?.id}`],
    enabled: !!user && (isAdmin || isTrainer),
  });

  const filteredClients = clients?.filter(client => 
    (statusFilter === "all" || client.status === statusFilter) &&
    (searchQuery === "" || `Client #${client.id}`.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!user || (!isAdmin && !isTrainer)) {
    return <div className="p-8">Not authorized to view this page</div>;
  }

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {/* Background container with logo */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.15] dark:opacity-[0.08]"
        style={{
          backgroundImage: 'url("/assets/branding/logoinvisicon.svg")',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          filter: 'grayscale(0.5)'
        }}
      />

      {/* Content overlay */}
      <div className="relative z-10 p-8">
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
              <UserPlus className="h-4 w-4" />
              Add New Client
            </Button>
          )}
        </div>

        {/* Search and Filter Bar */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All Clients
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                Active Clients
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>
                Inactive Clients
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Client Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {!filteredClients || filteredClients.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 col-span-full">
              No clients found.
            </p>
          ) : (
            filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Client #{client.id}</CardTitle>
                  <CardDescription>
                    Status: <span className={`font-medium ${client.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
                      {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Member since:</span>
                      <span className="text-sm font-medium">
                        {new Date(client.joinDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/training-management?client=${client.id}`}>
                        <Button variant="outline" size="sm" className="flex-1 gap-2">
                          <BarChart className="h-4 w-4" />
                          Progress
                        </Button>
                      </Link>
                      <Link href={`/schedule?client=${client.id}`}>
                        <Button variant="outline" size="sm" className="flex-1 gap-2">
                          <Calendar className="h-4 w-4" />
                          Schedule
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}