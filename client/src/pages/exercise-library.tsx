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
import { Loader2, Plus, Search, Filter } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Exercise, MuscleGroup, MovementPattern, insertExerciseSchema } from "@shared/schema";
import React from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ExerciseLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const isTrainer = user?.role === "trainer";
  const canEdit = isAdmin || isTrainer;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string | null>(null);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = React.useState<number | null>(null);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = React.useState(false);

  const { data: exercises, isLoading: isLoadingExercises } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
    enabled: !!user,
  });

  const { data: muscleGroups, isLoading: isLoadingMuscleGroups } = useQuery<MuscleGroup[]>({
    queryKey: ["/api/muscle-groups"],
    enabled: !!user,
  });

  const { data: movementPatterns, isLoading: isLoadingMovementPatterns } = useQuery<MovementPattern[]>({
    queryKey: ["/api/movement-patterns"],
    enabled: !!user,
  });

  const createExerciseMutation = useMutation({
    mutationFn: async (data: typeof insertExerciseSchema._type) => {
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

  const generatePatternMutation = useMutation({
    mutationFn: async (exerciseName: string) => {
      const res = await apiRequest("POST", "/api/exercises/generate-pattern", { exerciseName });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate pattern description");
      }
      return res.json();
    },
    onSuccess: (data) => {
      form.setValue("description", data.description);
      toast({
        title: "Success",
        description: "Movement pattern description generated successfully",
      });
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
    resolver: zodResolver(insertExerciseSchema),
    defaultValues: {
      name: "",
      description: "",
      difficulty: "beginner",
      movementPatternId: 1, // Default to first movement pattern since it's AI-generated
      primaryMuscleGroupId: undefined,
      secondaryMuscleGroupIds: [],
      instructions: [""],
      tips: [],
      equipment: [],
      videoUrl: "",
    },
  });

  // Watch the exercise name field to trigger pattern generation
  const exerciseName = form.watch("name");
  React.useEffect(() => {
    if (exerciseName && exerciseName.length >= 3 && !form.formState.errors.name) {
      generatePatternMutation.mutate(exerciseName);
    }
  }, [exerciseName]);

  const filteredExercises = React.useMemo(() => {
    if (!exercises) return [];

    return exercises.filter(exercise => {
      const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exercise.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDifficulty = !selectedDifficulty || exercise.difficulty === selectedDifficulty;
      const matchesMuscleGroup = !selectedMuscleGroup || 
                               exercise.primaryMuscleGroupId === selectedMuscleGroup ||
                               exercise.secondaryMuscleGroupIds.includes(selectedMuscleGroup);

      return matchesSearch && matchesDifficulty && matchesMuscleGroup;
    });
  }, [exercises, searchQuery, selectedDifficulty, selectedMuscleGroup]);

  if (isLoadingExercises || isLoadingMuscleGroups || isLoadingMovementPatterns) {
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
          <h1 className="text-3xl font-bold tracking-tight">Exercise Library</h1>
          <p className="text-muted-foreground">
            Browse and manage exercises with detailed movement patterns and muscle groups
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
                  Create a new exercise. The movement pattern will be automatically generated based on the exercise name.
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
                          <Input placeholder="Barbell Back Squat" {...field} />
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
                            placeholder="Movement pattern description will be generated automatically..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
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
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select muscle group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {muscleGroups?.map((group) => (
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
                  </div>
                  <FormField
                    control={form.control}
                    name="secondaryMuscleGroupIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Muscle Groups</FormLabel>
                        <Select
                          value={field.value?.map(String)}
                          onValueChange={(values) => field.onChange(values.map(Number))}
                          multiple
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select muscle groups" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {muscleGroups?.map((group) => (
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
              <Select value={selectedDifficulty || ""} onValueChange={(value) => setSelectedDifficulty(value || null)}>
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
                value={selectedMuscleGroup?.toString() || ""}
                onValueChange={(value) => setSelectedMuscleGroup(value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Muscle Group" />
                </SelectTrigger>
                <SelectContent>
                  {muscleGroups?.map((group) => (
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
                {filteredExercises.map((exercise) => {
                  const muscleGroup = muscleGroups?.find(g => g.id === exercise.primaryMuscleGroupId);
                  const movementPattern = movementPatterns?.find(p => p.id === exercise.movementPatternId);

                  return (
                    <Card key={exercise.id}>
                      <CardHeader>
                        <CardTitle>{exercise.name}</CardTitle>
                        <CardDescription>
                          <div className="flex gap-2 flex-wrap">
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium">
                              {exercise.difficulty}
                            </span>
                            {muscleGroup && (
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                {muscleGroup.name}
                              </span>
                            )}
                            {movementPattern && (
                              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                {movementPattern.name}
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