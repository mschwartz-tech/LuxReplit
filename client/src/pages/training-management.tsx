import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartContainer } from "@/components/ui/chart";
import { WorkoutPlan, WorkoutLog, insertWorkoutPlanSchema } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function TrainingManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const { data: workoutPlans } = useQuery<WorkoutPlan[]>({
    queryKey: ["/api/workout-plans"],
  });

  const { data: workoutLogs } = useQuery<WorkoutLog[]>({
    queryKey: ["/api/workout-logs"],
  });

  const createWorkoutPlanMutation = useMutation({
    mutationFn: async (data: WorkoutPlan) => {
      const res = await apiRequest("POST", "/api/workout-plans", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workout plan created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-plans"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertWorkoutPlanSchema),
    defaultValues: {
      title: "",
      description: "",
      frequencyPerWeek: 3,
      memberId: 0,
      completionRate: 0,
    },
  });

  // Transform workout logs into chart data
  const chartData = workoutLogs?.map(log => ({
    date: new Date(log.createdAt).toLocaleDateString(),
    workouts: 1
  })) || [];

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
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Workout Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workout Plan</DialogTitle>
              <DialogDescription>
                Create a new workout plan for a member. You can set the title, description, and weekly frequency.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createWorkoutPlanMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Full Body Workout" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="A comprehensive workout targeting all major muscle groups..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="frequencyPerWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weekly Frequency</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          max={7}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="memberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member ID</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={1}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createWorkoutPlanMutation.isPending}>
                  Create Plan
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
                    <p className="font-medium">{plan.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{plan.completionRate || '0'}%</p>
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <Line type="monotone" dataKey="workouts" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="5 5" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}