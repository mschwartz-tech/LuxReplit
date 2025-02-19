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
import { Plus, Loader2, Search, Filter, User, Calendar, BarChart, ArrowLeft } from "lucide-react";
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

export default function TrainingClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTrainer = user?.role === "trainer";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "suspended">("all");

  const { data: clients, isLoading } = useQuery<Member[]>({
    queryKey: [isAdmin ? "/api/members" : `/api/members/trainer/${user?.id}`],
    enabled: !!user && (isAdmin || isTrainer),
  });

  const filteredClients = clients?.filter(client =>
    (statusFilter === "all" || client.membershipStatus === statusFilter) &&
    (searchQuery === "" || 
     `Client #${client.id}`.toLowerCase().includes(searchQuery.toLowerCase()))
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

      <div className="relative z-10 p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-3xl font-bold tracking-tight">Training Clients</h1>
            </div>
            <p className="text-muted-foreground">
              {isAdmin
                ? "Manage all training clients"
                : "Manage your assigned training clients"}
            </p>
          </div>
          {isAdmin && (
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Client
            </Button>
          )}
        </div>

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
              <DropdownMenuItem onClick={() => setStatusFilter("suspended")}>
                Suspended
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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
                    Status: <span className={`font-medium ${
                      client.membershipStatus === 'active' ? 'text-green-500' : 
                      client.membershipStatus === 'suspended' ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {client.membershipStatus.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Membership:</span>
                      <span className="text-sm font-medium capitalize">
                        {client.membershipType}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Start Date:</span>
                      <span className="text-sm font-medium">
                        {new Date(client.startDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Link href={`/client/${client.id}`}>
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <User className="h-4 w-4" />
                          Profile
                        </Button>
                      </Link>
                      <Link href={`/training-management?client=${client.id}`}>
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <BarChart className="h-4 w-4" />
                          Progress
                        </Button>
                      </Link>
                      <Link href={`/schedule?client=${client.id}`}>
                        <Button variant="outline" size="sm" className="w-full gap-2">
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