import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartContainer } from "@/components/ui/chart";
import { WorkoutPlan, WorkoutLog } from "@shared/schema";

export default function TrainingManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: workoutPlans } = useQuery<WorkoutPlan[]>({
    queryKey: ["/api/workout-plans"],
  });

  const { data: workoutLogs } = useQuery<WorkoutLog[]>({
    queryKey: ["/api/workout-logs"],
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Management</h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Manage workout plans and track progress across all members" 
              : "Manage workout plans and track progress for your assigned members"}
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Workout Plan
        </Button>
      </div>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workout Plans</CardTitle>
            <CardDescription>
              Active workout plans and their completion rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {workoutPlans?.map((plan) => (
                <div 
                  key={plan.id} 
                  className="flex items-center justify-between p-4 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{plan.completionRate}%</p>
                    <p className="text-sm text-muted-foreground">
                      {plan.frequencyPerWeek}x per week
                    </p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progress Overview</CardTitle>
            <CardDescription>
              Workout completion trends over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              className="h-[400px]" 
              config={{
                workouts: {
                  label: "Workouts",
                  theme: {
                    light: "hsl(var(--primary))",
                    dark: "hsl(var(--primary))",
                  },
                },
              }}
            >
              {/* Add chart implementation here */}
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
