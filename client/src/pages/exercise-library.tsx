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
import { Loader2, Plus, Search, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Exercise, insertExerciseSchema } from "@shared/schema";
import { useState, useEffect, useMemo } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import * as z from 'zod';


// Predefined muscle groups
const MUSCLE_GROUPS = [
  { id: 1, name: "Quadriceps" },
  { id: 2, name: "Hamstrings" },
  { id: 3, name: "Calves" },
  { id: 4, name: "Chest" },
  { id: 5, name: "Back" },
  { id: 6, name: "Shoulders" },
  { id: 7, name: "Biceps" },
  { id: 8, name: "Triceps" },
  { id: 9, name: "Forearms" },
  { id: 10, name: "Abs" },
  { id: 11, name: "Obliques" },
  { id: 12, name: "Lower Back" },
  { id: 13, name: "Glutes" },
  { id: 14, name: "Hip Flexors" },
  { id: 15, name: "Traps" }
];

// Debounce utility
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ExerciseLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const isTrainer = user?.role === "trainer";
  const canEdit = isAdmin || isTrainer;
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<number | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  const form = useForm({
    resolver: zodResolver(insertExerciseSchema),
    defaultValues: {
      name: "",
      description: "",
      instructions: [] as string[],
      difficulty: "beginner" as const,
      primaryMuscleGroupId: 0,
      secondaryMuscleGroupIds: [] as number[],
      equipment: [] as string[],
      videoUrl: "",
    },
  });

  const createExerciseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertExerciseSchema>) => {
      const response = await apiRequest("POST", "/api/exercises", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create exercise");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Exercise created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      setIsAddExerciseOpen(false);
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

  const predictExerciseDetailsMutation = useMutation({
    mutationFn: async (name: string) => {
      setIsAIThinking(true);
      const response = await fetch('/api/exercises/predict-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ exerciseName: name }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        try {
          const parsedError = JSON.parse(errorData);
          throw new Error(parsedError.message || 'Failed to predict exercise details');
        } catch {
          throw new Error(errorData || 'Failed to predict exercise details');
        }
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('Received AI predictions:', data);

      try {
        // Update form with AI predictions
        if (typeof data.description === 'string') {
          form.setValue("description", data.description, { shouldValidate: true });
        }

        // Handle instructions as an array
        if (Array.isArray(data.instructions) && data.instructions.length > 0) {
          console.log('Setting instructions:', data.instructions);
          form.setValue("instructions", data.instructions, { shouldValidate: true });
        }

        if (typeof data.difficulty === 'string' &&
            ['beginner', 'intermediate', 'advanced'].includes(data.difficulty)) {
          form.setValue("difficulty", data.difficulty, { shouldValidate: true });
        }

        // Update muscle groups
        if (typeof data.primaryMuscleGroupId === 'number' &&
            data.primaryMuscleGroupId >= 1 && 
            data.primaryMuscleGroupId <= 15) {
          form.setValue("primaryMuscleGroupId", data.primaryMuscleGroupId, { shouldValidate: true });
        }

        if (Array.isArray(data.secondaryMuscleGroupIds)) {
          const validSecondaryIds = data.secondaryMuscleGroupIds.filter(
            (id: number) => typeof id === 'number' && id >= 1 && id <= 15 && id !== data.primaryMuscleGroupId
          );
          form.setValue("secondaryMuscleGroupIds", validSecondaryIds, { shouldValidate: true });
        }

        // Force form to update
        form.trigger();

        toast({
          title: "Success",
          description: "Exercise details predicted successfully",
        });
      } catch (error) {
        console.error('Error updating form with AI predictions:', error);
        toast({
          title: "Warning",
          description: "Received predictions but couldn't update all form fields",
          variant: "destructive",
        });
      } finally {
        setIsAIThinking(false);
      }
    },
    onError: (error: Error) => {
      console.error('AI prediction error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsAIThinking(false);
    },
  });

  // Watch the exercise name field and debounce it
  const exerciseName = form.watch("name");
  const debouncedExerciseName = useDebounce(exerciseName, 1000); // 1 second delay

  useEffect(() => {
    if (debouncedExerciseName && debouncedExerciseName.length >= 3 && !form.formState.errors.name) {
      predictExerciseDetailsMutation.mutate(debouncedExerciseName);
    }
  }, [debouncedExerciseName]);

  const { data: exercises = [], isLoading: isLoadingExercises } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
    enabled: !!user,
  });

  const filteredExercises = useMemo(() => {
    if (!exercises) return [];

    return exercises.filter((exercise: Exercise) => {
      const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDifficulty = !selectedDifficulty || exercise.difficulty === selectedDifficulty;
      const matchesMuscleGroup = !selectedMuscleGroup ||
        exercise.primaryMuscleGroupId === selectedMuscleGroup ||
        (exercise.secondaryMuscleGroupIds && exercise.secondaryMuscleGroupIds.includes(selectedMuscleGroup));

      return matchesSearch && matchesDifficulty && matchesMuscleGroup;
    });
  }, [exercises, searchQuery, selectedDifficulty, selectedMuscleGroup]);

  if (isLoadingExercises) {
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
          <div className="flex items-center gap-4 mb-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Exercise Library</h1>
          </div>
          <p className="text-muted-foreground">
            Browse and manage exercises with detailed descriptions and muscle groups
          </p>
        </div>
        {canEdit && (
          <Dialog open={isAddExerciseOpen} onOpenChange={setIsAddExerciseOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Exercise
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Exercise</DialogTitle>
                <DialogDescription>
                  Create a new exercise. The muscle groups will be automatically predicted based on the exercise name.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createExerciseMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exercise Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Barbell Back Squat" {...field} />
                        </FormControl>
                        {isAIThinking && (
                          <p className="text-sm text-muted-foreground mt-2">
                            SentravisionAI is thinking...
                          </p>
                        )}
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
                            placeholder="Brief description of the exercise..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instructions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Step-by-step instructions for performing the exercise..."
                            value={Array.isArray(field.value) ? field.value.join('\n') : field.value}
                            onChange={(e) => {
                              const steps = e.target.value.split('\n').filter(step => step.trim());
                              field.onChange(steps);
                            }}
                            className="min-h-[150px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select difficulty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="primaryMuscleGroupId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Muscle Group</FormLabel>
                          <Select
                            value={field.value ? field.value.toString() : undefined}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select primary muscle group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MUSCLE_GROUPS.map((group) => (
                                <SelectItem key={group.id} value={group.id.toString()}>
                                  {group.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="secondaryMuscleGroupIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secondary Muscle Groups</FormLabel>
                          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                            {MUSCLE_GROUPS.map((group) => (
                              <div key={group.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`muscle-${group.id}`}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  checked={field.value.includes(group.id)}
                                  onChange={(e) => {
                                    const value = group.id;
                                    if (e.target.checked) {
                                      field.onChange([...field.value, value]);
                                    } else {
                                      field.onChange(field.value.filter((id: number) => id !== value));
                                    }
                                  }}
                                  disabled={group.id === form.getValues("primaryMuscleGroupId")}
                                />
                                <label
                                  htmlFor={`muscle-${group.id}`}
                                  className={`text-sm ${
                                    group.id === form.getValues("primaryMuscleGroupId")
                                      ? "text-gray-400"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {group.name}
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createExerciseMutation.isPending}
                  >
                    {createExerciseMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Exercise"
                    )}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Filters</CardTitle>
                <CardDescription>
                  Refine the exercise list based on your preferences
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDifficulty(null);
                  setSelectedMuscleGroup(null);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={selectedDifficulty || undefined}
                onValueChange={(value) => setSelectedDifficulty(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={selectedMuscleGroup?.toString()}
                onValueChange={(value) => setSelectedMuscleGroup(value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Muscle Group" />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exercises ({filteredExercises.length})</CardTitle>
            <CardDescription>
              Browse through our comprehensive exercise library
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredExercises.map((exercise: Exercise) => {
                  const muscleGroup = MUSCLE_GROUPS.find(g => g.id === exercise.primaryMuscleGroupId);

                  return (
                    <Card key={exercise.id}>
                      <CardHeader>
                        <CardTitle>{exercise.name}</CardTitle>
                        <CardDescription>
                          <div className="flex gap-2 flex-wrap">
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium">
                              {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                            </span>
                            {muscleGroup && (
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                {muscleGroup.name}
                              </span>
                            )}
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {exercise.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}