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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
interface Member {
  id: number;
  name: string;
}

interface Meal {
  meal: string;
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MealPlan {
  id: number;
  name: string;
  description: string;
  meals: Meal[];
  trainerId: number;
  createdAt: string;
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
  foodPreferences: z.array(z.string()),
  calorieTarget: z.number().min(500).max(10000),
  mealsPerDay: z.number().min(1).max(6),
  daysInPlan: z.number().min(1).max(30),
  dietaryRestrictions: z.array(z.string()).optional(),
  fitnessGoals: z.array(z.string()).optional(),
  macroDistribution: z.object({
    protein: z.number().min(0).max(100),
    carbs: z.number().min(0).max(100),
    fats: z.number().min(0).max(100),
  }).refine(data => {
    const total = data.protein + data.carbs + data.fats;
    return total === 100;
  }, "Macro distribution must total 100%"),
  cookingSkillLevel: z.string(),
  maxPrepTime: z.string(),
});

// Placeholder for CustomMultiSelect -  Needs implementation based on your UI library
const CustomMultiSelect = ({ options, selected, onChange, placeholder, allowCustom }: any) => {
  // Implement your custom multi-select logic here.  This is a placeholder.
  return <div>Custom Multiselect Placeholder</div>;
};


export default function MealPlansPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form initialization
  const aiForm = useForm({
    resolver: zodResolver(aiMealPlanSchema),
    defaultValues: {
      foodPreferences: [],
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

  // React Query hooks
  const { data: mealPlans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ['/api/meal-plans'],
    queryFn: async () => {
      const response = await fetch('/api/meal-plans');
      if (!response.ok) throw new Error('Failed to fetch meal plans');
      return response.json();
    }
  });

  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['/api/members'],
    queryFn: async () => {
      const response = await fetch('/api/members');
      if (!response.ok) throw new Error('Failed to fetch members');
      return response.json();
    }
  });

  // Generate meal plan mutation
  const generateMealPlan = useMutation({
    mutationFn: async (data: z.infer<typeof aiMealPlanSchema>) => {
      const response = await fetch('/api/meal-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to generate meal plan');
      return response.json();
    },
    onSuccess: (data) => {
      setIsAiDialogOpen(false);
      toast({
        title: 'Success',
        description: 'AI meal plan generated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to generate AI meal plan',
        variant: 'destructive',
      });
    },
  });

  // Add assignMealPlan mutation after generateMealPlan mutation
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

  // Loading state
  if (isLoadingPlans || isLoadingMembers) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Main render
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
                          <FormLabel>Food Preferences</FormLabel>
                          <FormControl>
                            <CustomMultiSelect
                              options={dietaryOptions}
                              selected={field.value}
                              onChange={field.onChange}
                              placeholder="Select or add food preferences..."
                              allowCustom={true}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mealPlans.map((plan: MealPlan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{plan.description}</p>
              <div className="space-y-2">
                {plan.meals.map((meal, index) => (
                  <div key={index} className="border p-2 rounded">
                    <h3 className="font-semibold">{meal.meal}</h3>
                    <p>{meal.food}</p>
                    <div className="text-sm text-gray-500 space-x-2">
                      <span>Calories: {meal.calories}</span>
                      <span>|</span>
                      <span>Protein: {meal.protein}g</span>
                      <span>|</span>
                      <span>Carbs: {meal.carbs}g</span>
                      <span>|</span>
                      <span>Fats: {meal.fats}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}