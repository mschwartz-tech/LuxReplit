import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import debounce from "lodash/debounce";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Search, ArrowLeft, Plus } from "lucide-react";
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
import { Exercise, insertExerciseSchema } from "@shared/schema";
import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";

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

type FormData = {
  name: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  primaryMuscleGroupId: number;
  secondaryMuscleGroupIds: number[];
  instructions: string[];
  tips: string[];
  equipment: string[];
};

type AIAnalysisResponse = {
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  primaryMuscleGroupId: number;
  secondaryMuscleGroupIds: number[];
  instructions: string[];
};

export default function ExerciseLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]); // Fix type

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<number | null>(null);

  // Form setup with validation schema
  const form = useForm<FormData>({
    resolver: zodResolver(insertExerciseSchema),
    defaultValues: {
      name: "",
      description: "",
      difficulty: "beginner",
      primaryMuscleGroupId: 1,
      secondaryMuscleGroupIds: [],
      instructions: [],
      tips: [],
      equipment: [],
    }
  });

  // AI Analysis mutation with better error handling
  const analyzeExerciseMutation = useMutation({
    mutationFn: async (exerciseName: string): Promise<AIAnalysisResponse> => {
      if (!exerciseName || exerciseName.length < 3) {
        throw new Error('Exercise name must be at least 3 characters');
      }

      const res = await apiRequest("POST", "/exercise-ai/analyze", { exerciseName });
      if (!res.ok) {
        const errorText = await res.text();
        try {
          // Try to parse as JSON first
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || 'Failed to analyze exercise');
        } catch (e) {
          // If not JSON, use text directly
          throw new Error(errorText || 'Failed to analyze exercise');
        }
      }
      const data = await res.json();
      return data as AIAnalysisResponse;
    },
    onSuccess: (data) => {
      form.reset({
        ...form.getValues(),
        description: data.description,
        difficulty: data.difficulty,
        primaryMuscleGroupId: data.primaryMuscleGroupId,
        secondaryMuscleGroupIds: data.secondaryMuscleGroupIds,
        instructions: data.instructions,
      });
      toast({
        title: "AI analysis complete",
        description: "Exercise details have been generated",
      });
      setIsAnalyzing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to analyze exercise",
        description: error.message,
        variant: "destructive",
      });
      setIsAnalyzing(false);
    },
  });

  // Debounced analysis function
  const debouncedAnalyze = useCallback(
    debounce((name: string) => {
      if (name.length >= 3 && !isAnalyzing) {
        setIsAnalyzing(true);
        analyzeExerciseMutation.mutate(name);
      }
    }, 1000), // Wait 1 second after the user stops typing
    [isAnalyzing]
  );

  // Handle exercise name input with validation
  const handleExerciseNameChange = (name: string) => {
    form.setValue("name", name);
    if (!isAnalyzing) {
      debouncedAnalyze(name);
    }
  };

  // Create exercise mutation
  const createExerciseMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/exercises", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create exercise");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Exercise created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Query for exercises
  const { data: exercises = [], isLoading: isLoadingExercises } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
    enabled: !!user,
  });

  // Filtered exercises logic
  const filteredExercises = exercises.filter((exercise: Exercise) => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = !selectedDifficulty || exercise.difficulty === selectedDifficulty;
    const matchesMuscleGroup = !selectedMuscleGroup ||
      exercise.primaryMuscleGroupId === selectedMuscleGroup ||
      (exercise.secondaryMuscleGroupIds && exercise.secondaryMuscleGroupIds.includes(selectedMuscleGroup));

    return matchesSearch && matchesDifficulty && matchesMuscleGroup;
  });

  // Loading state
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
            Browse exercises with detailed descriptions and muscle groups
          </p>
        </div>
        {(user?.role === "trainer" || user?.role === "admin") && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Exercise
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Create New Exercise</DialogTitle>
                <DialogDescription>
                  Enter the exercise name and let AI help you generate the details
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
                          <Input
                            {...field}
                            placeholder="e.g. Barbell Back Squat"
                            onChange={(e) => handleExerciseNameChange(e.target.value)}
                            disabled={isAnalyzing}
                          />
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
                          <Input {...field} disabled={isAnalyzing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isAnalyzing}
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
                          value={field.value.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          disabled={isAnalyzing}
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
                        <div className="grid grid-cols-3 gap-2 p-4 border rounded-lg">
                          {MUSCLE_GROUPS.map((group) => (
                            <div key={group.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.value.includes(group.id)}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...field.value, group.id]
                                    : field.value.filter((id) => id !== group.id);
                                  field.onChange(newValue);
                                }}
                                disabled={group.id === form.getValues("primaryMuscleGroupId") || isAnalyzing}
                              />
                              <label className="text-sm">{group.name}</label>
                            </div>
                          ))}
                        </div>
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
                          <div className="space-y-2">
                            {field.value.map((instruction: string, index: number) => (
                              <Input
                                key={index}
                                value={instruction}
                                onChange={(e) => {
                                  const newInstructions = [...field.value];
                                  newInstructions[index] = e.target.value;
                                  field.onChange(newInstructions);
                                }}
                                disabled={isAnalyzing}
                              />
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={createExerciseMutation.isPending || isAnalyzing}
                  >
                    {createExerciseMutation.isPending || isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isAnalyzing ? "Analyzing..." : "Creating..."}
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