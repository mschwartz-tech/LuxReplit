import { useState } from "react";
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
import {
  Calendar,
  Plus,
  Users,
  UserCheck,
  Filter,
  Loader2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function SchedulePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [selectedView, setSelectedView] = useState<"classes" | "trainers">("classes");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "upcoming" | "past">("upcoming");

  // Fetch classes data
  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ["/api/classes"],
    enabled: !!user,
  });

  // Fetch trainer schedules
  const { data: trainerSchedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ["/api/trainer-schedules"],
    enabled: !!user,
  });

  if (!user) {
    return <div className="p-8">Please log in to access the schedule.</div>;
  }

  if (!isAdmin) {
    return <div className="p-8">Only administrators can access this page.</div>;
  }

  if (classesLoading || schedulesLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {/* Background with logo */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.15] dark:opacity-[0.08]"
        style={{
          backgroundImage: 'url("/assets/branding/logoinvisicon.svg")',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          filter: 'grayscale(0.5)'
        }}
      />

      {/* Content overlay */}
      <div className="relative z-10 p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Schedule Management</h1>
            <p className="text-muted-foreground">
              Manage group fitness classes and trainer schedules
            </p>
          </div>
          <div className="flex gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedFilter("all")}>
                  All Sessions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedFilter("upcoming")}>
                  Upcoming Sessions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedFilter("past")}>
                  Past Sessions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Session
            </Button>
          </div>
        </div>

        <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as "classes" | "trainers")}>
          <TabsList className="mb-8">
            <TabsTrigger value="classes" className="gap-2">
              <Users className="h-4 w-4" />
              Group Classes
            </TabsTrigger>
            <TabsTrigger value="trainers" className="gap-2">
              <UserCheck className="h-4 w-4" />
              Trainer Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Group Classes</CardTitle>
                  <CardDescription>
                    View and manage scheduled group fitness classes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Calendar or list view will go here */}
                  <div className="text-center py-8 text-muted-foreground">
                    Calendar view coming soon
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trainers">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trainer Schedules</CardTitle>
                  <CardDescription>
                    View and manage personal training sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Trainer schedule grid will go here */}
                  <div className="text-center py-8 text-muted-foreground">
                    Trainer schedule view coming soon
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
