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
import { Plus, Loader2, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkoutPlan, Exercise, insertWorkoutPlanSchema } from "@shared/schema";
import { useLocation } from "wouter";
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
import { useState } from "react";

export default function WorkoutPlansPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isTrainer = user?.role === "trainer";
  const isAdmin = user?.role === "admin";
  const [selectedExercises, setSelectedExercises] = useState([]);

  const { data: workoutPlans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["/api/workout-plans"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/workout-plans");
      return res.json();
    }
  });

  const { data: exercises, isLoading: isLoadingExercises } = useQuery({
    queryKey: ["/api/exercises"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/exercises");
      return res.json();
    }
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/workout-plans", { ...data, exercises: selectedExercises });
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
      status: "active" as const,
      completionRate: "0",
    },
  });

  if (isLoadingPlans || isLoadingExercises) {
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

        {(isTrainer || isAdmin) && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-fit">
                <Plus className="mr-2 h-4 w-4" />
                Create New Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Create New Workout Plan</DialogTitle>
                <DialogDescription>
                  Create a new workout plan for a client. Select exercises and set the frequency.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createPlanMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Textarea {...field} />
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
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <FormLabel>Exercises</FormLabel>
                    <ScrollArea className="h-[200px] border rounded-md p-4">
                      <div className="space-y-2">
                        {exercises?.map((exercise) => (
                          <div key={exercise.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedExercises.includes(exercise.id.toString())}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedExercises([...selectedExercises, exercise.id.toString()]);
                                } else {
                                  setSelectedExercises(selectedExercises.filter(id => id !== exercise.id.toString()));
                                }
                              }}
                              className="h-4 w-4"
                            />
                            <div>
                              <p className="font-medium">{exercise.name}</p>
                              <p className="text-sm text-muted-foreground">{exercise.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={createPlanMutation.isPending || selectedExercises.length === 0}
                  >
                    {createPlanMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create Plan"
                    )}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}

        <div className="grid gap-8 grid-cols-1">
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
                      onClick={() => setLocation(`/workout-plans/${plan.id}`)}
                      style={{ cursor: 'pointer' }}
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
                      <div className="text-right">
                        <p className="font-medium">{plan.completionRate || '0'}%</p>
                        <p className="text-sm text-muted-foreground">
                          completed
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}