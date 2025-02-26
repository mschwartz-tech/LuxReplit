import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InteractiveMealPlanDialog } from "@/components/ui/interactive-meal-plan-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MealPlanView } from "@/components/ui/meal-plan-view";
import { Textarea } from "@/components/ui/textarea";
import { type MealItem, type MealPlan, type AiMealPlan } from '@shared/schema';

// Define all your hooks at the top level
export default function MealPlansPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generatedMealPlan, setGeneratedMealPlan] = useState<MealPlan | null>(null);
  const [isRegeneratingMeal, setIsRegeneratingMeal] = useState(false);

  // Form initialization
  const aiForm = useForm({
    resolver: zodResolver(aiMealPlanSchema),
    defaultValues: {
      foodPreferences: "",
      calorieTarget: 2000,
      mealsPerDay: 3,
      daysInPlan: 1,
      dietaryRestrictions: [],
      fitnessGoals: [],
      macroDistribution: {
        protein: 30,
        carbs: 40,
        fats: 30,
      },
      cookingSkillLevel: 'intermediate',
      maxPrepTime: '30_min',
    },
  });

  // Query hooks - always called in the same order
  const { 
    data: mealPlans = [], 
    isLoading: isLoadingPlans, 
    error: plansError 
  } = useQuery<MealPlan[]>({
    queryKey: ['/api/meal-plans'],
    queryFn: async () => {
      const response = await fetch('/api/meal-plans');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch meal plans');
      }
      return response.json();
    }
  });

  const { 
    data: members = [], 
    isLoading: isLoadingMembers, 
    error: membersError 
  } = useQuery({
    queryKey: ['/api/members'],
    queryFn: async () => {
      const response = await fetch('/api/members');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch members');
      }
      return response.json();
    }
  });

  // Mutation hooks - always called in the same order
  const generateMealPlan = useMutation<MealPlan, Error, AiMealPlan>({
    mutationFn: async (data: AiMealPlan) => {
      const response = await fetch('/api/meal-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to generate meal plan');
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedMealPlan(data);
      setIsAiDialogOpen(true);
      toast({
        title: 'Success',
        description: 'AI meal plan generated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to generate AI meal plan',
        variant: 'destructive',
      });
    },
  });

  const regenerateMeal = useMutation({
    mutationFn: async ({ meal, preferences }: { meal: MealItem; preferences: z.infer<typeof aiMealPlanSchema> }) => {
      const response = await fetch('/api/meal-plans/regenerate-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodPreferences: preferences.foodPreferences,
          calorieTarget: meal.calories,
          mealType: meal.meal,
          dayNumber: meal.dayNumber,
          mealNumber: meal.mealNumber,
          macroDistribution: preferences.macroDistribution,
        }),
      });
      if (!response.ok) throw new Error('Failed to regenerate meal');
      return response.json();
    },
    onSuccess: (newMeal) => {
      if (generatedMealPlan) {
        const updatedMeals = generatedMealPlan.meals.map(m =>
          (m.dayNumber === newMeal.dayNumber && m.mealNumber === newMeal.mealNumber) ? newMeal : m
        );
        setGeneratedMealPlan({ ...generatedMealPlan, meals: updatedMeals });
      }
      toast({
        title: 'Success',
        description: 'Meal regenerated successfully',
      });
      setIsRegeneratingMeal(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to regenerate meal',
        variant: 'destructive',
      });
      setIsRegeneratingMeal(false);
    },
  });

  const assignMealPlan = useMutation({
    mutationFn: async () => {
      if (!selectedMember || !selectedPlan || !startDate) {
        throw new Error('Please fill in all required fields');
      }

      const response = await fetch(`/api/members/${selectedMember}/meal-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealPlanId: selectedPlan,
          startDate,
          endDate: endDate || null,
          status: 'active'
        }),
      });

      if (!response.ok) throw new Error('Failed to assign meal plan');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Meal plan assigned successfully',
      });
      setSelectedMember(null);
      setSelectedPlan(null);
      setStartDate('');
      setEndDate('');
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to assign meal plan',
        variant: 'destructive',
      });
    },
  });

  // Show error states
  if (plansError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">Error loading meal plans</h2>
          <p className="text-sm text-gray-600">{(plansError as Error).message}</p>
        </div>
      </div>
    );
  }

  if (membersError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">Error loading members</h2>
          <p className="text-sm text-gray-600">{(membersError as Error).message}</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingPlans || isLoadingMembers) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Rest of your component remains the same...
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Meal Plans</h1>

      {(user?.role === 'admin' || user?.role === 'trainer') && (
        <div className="flex gap-4 mb-6">
          <Card className="flex-1 p-4">
            <CardHeader>
              <CardTitle>Generate AI Meal Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...aiForm}>
                <form onSubmit={aiForm.handleSubmit((data) => generateMealPlan.mutate(data))} className="space-y-6">
                  {/* Basic Settings */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Basic Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={aiForm.control}
                        name="calorieTarget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Daily Calories</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={aiForm.control}
                        name="mealsPerDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meals Per Day</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Macro Distribution */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Macro Distribution (%)</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={aiForm.control}
                        name="macroDistribution.protein"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Protein</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={aiForm.control}
                        name="macroDistribution.carbs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Carbs</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={aiForm.control}
                        name="macroDistribution.fats"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fats</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Food Preferences */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Food Preferences</h3>
                    <FormField
                      control={aiForm.control}
                      name="foodPreferences"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Food Preferences (max 1000 words)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your food preferences, ingredients you like, favorite cuisines, etc..."
                              className="h-24"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>


                  {/* Cooking Preferences */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Cooking Preferences</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={aiForm.control}
                        name="cookingSkillLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Skill Level</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select skill level" />
                                </SelectTrigger>
                                <SelectContent>
                                  {cookingSkillLevels.map((level) => (
                                    <SelectItem key={level.value} value={level.value}>
                                      {level.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={aiForm.control}
                        name="maxPrepTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Prep Time</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select prep time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {mealPrepTimeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={generateMealPlan.isPending}
                    className="w-full"
                  >
                    {generateMealPlan.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Plan
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Interactive Meal Plan Dialog */}
          <InteractiveMealPlanDialog
            open={isAiDialogOpen}
            onOpenChange={setIsAiDialogOpen}
            mealPlan={generatedMealPlan}
            onRegenerateMeal={(meal) => {
              setIsRegeneratingMeal(true);
              regenerateMeal.mutate({
                meal,
                preferences: aiForm.getValues(),
              });
            }}
            onConfirm={async (memberId, dates) => {
              if (!generatedMealPlan) return;

              try {
                const response = await fetch('/api/meal-plans/confirm', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    mealPlanId: generatedMealPlan.id,
                    memberId,
                    startDate: dates.startDate,
                    endDate: dates.endDate,
                  }),
                });

                if (!response.ok) throw new Error('Failed to confirm meal plan');

                queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
                setIsAiDialogOpen(false);
                setGeneratedMealPlan(null);

                toast({
                  title: 'Success',
                  description: 'Meal plan confirmed and assigned successfully',
                });
              } catch (error) {
                toast({
                  title: 'Error',
                  description: 'Failed to confirm meal plan',
                  variant: 'destructive',
                });
              }
            }}
            isRegeneratingMeal={isRegeneratingMeal}
          />

          {/* Assign Meal Plan Card */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Assign Meal Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select onValueChange={(value) => setSelectedMember(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member: Member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={(value) => setSelectedPlan(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Meal Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {mealPlans.map((plan: MealPlan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start Date"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End Date (Optional)"
                />
                <Button
                  onClick={() => assignMealPlan.mutate()}
                  disabled={!selectedMember || !selectedPlan || !startDate}
                  className="w-full"
                >
                  {assignMealPlan.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    'Assign Plan'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Display Meal Plans */}
      <div className="grid grid-cols-1 gap-4">
        {mealPlans.map((plan: MealPlan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent>
              <MealPlanView meals={plan.meals as MealItem[]} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Types
interface Member {
  id: number;
  name: string;
}

// Update the Meal interface to match MealItem
interface Meal extends MealItem {
  meal: string;
  food: string;
}


// Constants
const dietaryRestrictionOptions = [
  { value: 'gluten_free', label: 'Gluten-Free' },
  { value: 'dairy_free', label: 'Dairy-Free' },
  { value: 'nut_free', label: 'Nut-Free' },
  { value: 'shellfish_free', label: 'Shellfish-Free' },
  { value: 'soy_free', label: 'Soy-Free' },
  { value: 'egg_free', label: 'Egg-Free' },
];

const cookingSkillLevels = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

const mealPrepTimeOptions = [
  { label: '15 minutes or less', value: '15_min' },
  { label: '15-30 minutes', value: '30_min' },
  { label: '30-60 minutes', value: '60_min' },
  { label: '60+ minutes', value: 'over_60_min' },
];

const dietaryOptions = [
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Keto', value: 'keto' },
  { label: 'Paleo', value: 'paleo' },
  { label: 'Mediterranean', value: 'mediterranean' },
];

const fitnessGoalOptions = [
  { label: 'Weight Loss', value: 'weight_loss' },
  { label: 'Muscle Gain', value: 'muscle_gain' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Athletic Performance', value: 'athletic_performance' },
];

// Validation Schemas
const aiMealPlanSchema = z.object({
  foodPreferences: z.string().max(1000),
  calorieTarget: z.number().min(500).max(10000),
  mealsPerDay: z.number().min(1).max(6),
  daysInPlan: z.number().min(1).max(30),
  dietaryRestrictions: z.array(z.string()).optional(),
  fitnessGoals: z.array(z.string()).optional(),
  macroDistribution: z.object({
    protein: z.number().min(0).max(100),
    carbs: z.number().min(0).max(100),
    fats: z.number().min(0).max(100),
  }).refine(data => data.protein + data.carbs + data.fats === 100, "Macro distribution must total 100%"),
  cookingSkillLevel: z.string(),
  maxPrepTime: z.string(),
});