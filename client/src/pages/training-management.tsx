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
import { Plus, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkoutPlan, WorkoutLog, insertWorkoutPlanSchema, insertWorkoutLogSchema, Member } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocation, Link } from "wouter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import React from 'react';

export default function TrainingManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";
  const isTrainer = user?.role === "trainer";
  const isMember = user?.role === "member";

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedPlanId, setSelectedPlanId] = React.useState<number | null>(null);

  const { data: workoutPlans, isLoading: isLoadingPlans } = useQuery<WorkoutPlan[]>({
    queryKey: ["/api/workout-plans"],
    enabled: !!user,
  });

  const { data: workoutLogs, isLoading: isLoadingLogs } = useQuery<WorkoutLog[]>({
    queryKey: ["/api/workout-logs/member", user?.id],
    enabled: !!user && !isAdmin,
  });

  // Updated to fetch assigned clients for trainers
  const { data: members, isLoading: isLoadingMembers } = useQuery<Member[]>({
    queryKey: [isAdmin ? "/api/members" : `/api/members/trainer/${user?.id}`],
    enabled: !!user && (isAdmin || isTrainer),
  });

  const createWorkoutPlanMutation = useMutation({
    mutationFn: async (data: typeof insertWorkoutPlanSchema._type) => {
      if (!data.memberId) {
        throw new Error("Member ID is required");
      }
      const newPlan = {
        ...data,
        status: "active" as const,
        trainerId: isTrainer ? user?.id : undefined,
        memberId: data.memberId,
        frequencyPerWeek: Number(data.frequencyPerWeek),
        completionRate: 0,
      };
      const res = await apiRequest("POST", "/api/workout-plans", newPlan);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create workout plan");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workout plan created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-plans"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logWorkoutMutation = useMutation({
    mutationFn: async (planId: number) => {
      const workoutLog = {
        memberId: user?.id,
        workoutPlanId: planId,
        completedAt: new Date().toISOString(),
        duration: 60, // Default duration in minutes
        notes: "Workout completed",
      };
      const res = await apiRequest("POST", "/api/workout-logs", workoutLog);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to log workout");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workout logged successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-logs/member", user?.id] });
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
      memberId: undefined as number | undefined,
      status: "active" as const,
      completionRate: "0",
    },
  });

  // Transform workout logs into chart data
  const chartData = React.useMemo(() => {
    if (!workoutLogs) return [];

    const last30Days = [...Array(30)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const logsByDate = workoutLogs.reduce((acc, log) => {
      const date = new Date(log.completedAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return last30Days.map(date => ({
      date,
      workouts: logsByDate[date] || 0
    }));
  }, [workoutLogs]);

  if (isLoadingPlans || isLoadingLogs || isLoadingMembers) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex flex-col gap-6">
        <Button
          variant="ghost"
          className="w-fit"
          onClick={(e) => {
            e.preventDefault();
            window.history.back();
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Training Management</h1>
            <p className="text-muted-foreground">
              {isAdmin
                ? "Manage workout plans and track progress across all clients"
                : "Manage workout plans and track progress for your assigned clients"}
            </p>
          </div>
          {(isAdmin || isTrainer) && (
            <Link href="/clients/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add New Client
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Clients</CardTitle>
            <CardDescription>
              View and manage your assigned clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {!members || members.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No clients assigned yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">Client #{member.id}</h3>
                        <p className="text-sm text-muted-foreground">
                          Status: {member.membershipStatus}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/client/${member.id}`}>
                          <Button variant="outline" size="sm">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workout Plans</CardTitle>
            <CardDescription>
              Active workout plans and their completion rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {workoutPlans?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No workout plans found.
                </p>
              ) : (
                workoutPlans?.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-4 border-b last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{plan.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.frequencyPerWeek}x per week
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{plan.completionRate || '0'}%</p>
                        <p className="text-sm text-muted-foreground">
                          completed
                        </p>
                      </div>
                      {isMember && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => logWorkoutMutation.mutate(plan.id)}
                          disabled={logWorkoutMutation.isPending}
                        >
                          {logWorkoutMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progress Overview</CardTitle>
            <CardDescription>
              Workout completion trends over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No workout data available yet.
              </p>
            ) : (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <Line type="monotone" dataKey="workouts" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="5 5" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                      }}
                      labelStyle={{
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}