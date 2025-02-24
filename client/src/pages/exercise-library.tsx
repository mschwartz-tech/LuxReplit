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


interface AIStatus {
  status: 'idle' | 'generating' | 'success' | 'error';
  message: string;
}

export default function ExerciseLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const isTrainer = user?.role === "trainer";
  const canEdit = isAdmin || isTrainer;

  // State management
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [aiStatus, setAIStatus] = useState<AIStatus>({
    status: 'idle',
    message: ''
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<number | null>(null);

  // Form setup with enhanced validation
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

  // Optimized mutation for creating exercises
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
      setAIStatus({ status: 'idle', message: '' });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Optimized mutation for AI predictions
  const predictExerciseDetailsMutation = useMutation({
    mutationFn: async (name: string) => {
      setAIStatus({
        status: 'generating',
        message: 'Analyzing exercise...'
      });

      try {
        const response = await fetch('/api/exercises/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exerciseName: name }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to analyze exercise';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error in exercise prediction:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Update form with AI predictions
      const fieldsToUpdate = {
        description: data.description,
        instructions: data.instructions,
        difficulty: data.difficulty,
        primaryMuscleGroupId: data.primaryMuscleGroupId,
        secondaryMuscleGroupIds: data.secondaryMuscleGroupIds,
      };

      Object.entries(fieldsToUpdate).forEach(([field, value]) => {
        form.setValue(field as any, value, { shouldValidate: true });
      });

      setAIStatus({
        status: 'success',
        message: 'AI analysis complete! Exercise details have been populated.'
      });

      toast({
        title: "Success",
        description: "Exercise details predicted successfully",
      });
    },
    onError: (error: Error) => {
      setAIStatus({
        status: 'error',
        message: error.message
      });

      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Debounced exercise name watcher
  const exerciseName = form.watch("name");
  const debouncedExerciseName = useDebounce(exerciseName, 1000);

  useEffect(() => {
    if (debouncedExerciseName && debouncedExerciseName.length >= 3 && !form.formState.errors.name) {
      predictExerciseDetailsMutation.mutate(debouncedExerciseName);
    }
  }, [debouncedExerciseName]);

  // Query for exercises
  const { data: exercises = [], isLoading: isLoadingExercises } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
    enabled: !!user,
  });

  // Filtered exercises logic
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

  // Loading state
  if (isLoadingExercises) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // JSX rendering
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Exercise</DialogTitle>
                <DialogDescription>
                  Create a new exercise with AI-powered analysis. Enter the exercise name and our AI will help predict the details.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createExerciseMutation.mutate(data))} className="space-y-6">
                  {/* Basic Information Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exercise Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Barbell Back Squat" {...field} />
                            </FormControl>
                            {aiStatus.status !== 'idle' && (
                              <div className={`text-sm mt-2 flex items-center gap-2 ${
                                aiStatus.status === 'generating' ? 'text-yellow-600' :
                                aiStatus.status === 'success' ? 'text-green-600' :
                                aiStatus.status === 'error' ? 'text-red-600' : ''
                              }`}>
                                {aiStatus.status === 'generating' && <Loader2 className="h-4 w-4 animate-spin" />}
                                {aiStatus.message}
                              </div>
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
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Instructions Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Exercise Instructions</CardTitle>
                      <CardDescription>
                        Step-by-step guide for performing the exercise safely and effectively
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="instructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Enter each instruction on a new line. Maximum 10 steps, each step limited to 200 characters."
                                value={Array.isArray(field.value) ? field.value.map((step, i) => `${i + 1}. ${step}`).join('\n') : ''}
                                onChange={(e) => {
                                  const steps = e.target.value
                                    .split('\n')
                                    .map(step => step.trim())
                                    .filter(Boolean)
                                    .map(step => step.replace(/^\d+\.\s*/, ''))
                                    .slice(0, 10) 
                                    .map(step => step.substring(0, 200)); 
                                  field.onChange(steps);
                                }}
                                className="min-h-[200px] max-h-[400px] font-mono text-sm"
                                maxLength={2500} 
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground mt-1">
                              {field.value?.length || 0}/10 steps
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Exercise Details Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Exercise Details</CardTitle>
                      <CardDescription>
                        Specify the difficulty and targeted muscle groups
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="difficulty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Difficulty Level</FormLabel>
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

                      <div className="space-y-4">
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
                                    <SelectValue placeholder="Select primary muscle" />
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
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 border rounded-lg">
                                {MUSCLE_GROUPS.map((group) => {
                                  const isPrimary = group.id === form.getValues("primaryMuscleGroupId");
                                  return (
                                    <div
                                      key={group.id}
                                      className={`flex items-center space-x-2 ${
                                        isPrimary ? 'opacity-50' : ''
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        id={`muscle-${group.id}`}
                                        className="h-4 w-4 rounded border-gray-300"
                                        checked={field.value.includes(group.id)}
                                        onChange={(e) => {
                                          const value = group.id;
                                          if (e.target.checked) {
                                            field.onChange([...field.value, value]);
                                          } else {
                                            field.onChange(field.value.filter((id: number) => id !== value));
                                          }
                                        }}
                                        disabled={isPrimary}
                                      />
                                      <label
                                        htmlFor={`muscle-${group.id}`}
                                        className="text-sm"
                                      >
                                        {group.name}
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createExerciseMutation.isPending}
                  >
                    {createExerciseMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Exercise...
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