import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MealPlanView } from "@/components/ui/meal-plan-view";
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import type { MealItem } from '@shared/schema';

interface InteractiveMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMeals: MealItem[];
  mealPlanRequest: any;
  onConfirm: (memberId: number, dates: { startDate: string; endDate?: string; meals:MealItem[] }) => void;
  isRegeneratingMeal: boolean;
}

export function InteractiveMealPlanDialog({
  open,
  onOpenChange,
  initialMeals,
  mealPlanRequest,
  onConfirm,
  isRegeneratingMeal
}: InteractiveMealPlanDialogProps) {
  const [meals, setMeals] = useState<MealItem[]>(initialMeals);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  const regenerateMeal = useMutation({
    mutationFn: async ({ meal, dayNumber, mealNumber }: { meal: MealItem, dayNumber: number, mealNumber: number }) => {
      const response = await fetch('/api/meal-plans/regenerate-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodPreferences: mealPlanRequest.foodPreferences,
          calorieTarget: mealPlanRequest.calorieTarget / mealPlanRequest.mealsPerDay, // Per meal calorie target
          mealType: meal.meal,
          dayNumber,
          mealNumber,
          macroDistribution: mealPlanRequest.macroDistribution
        }),
      });

      if (!response.ok) throw new Error('Failed to regenerate meal');
      return response.json();
    },
    onSuccess: (newMeal, { meal }) => {
      setMeals(currentMeals =>
        currentMeals.map(m =>
          (m.dayNumber === meal.dayNumber && m.mealNumber === meal.mealNumber) ? newMeal : m
        )
      );
      toast({
        title: 'Success',
        description: 'Meal regenerated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to regenerate meal',
        variant: 'destructive',
      });
    },
  });

  const handleRegenerateMeal = (meal: MealItem) => {
    regenerateMeal.mutate({ meal, dayNumber: meal.dayNumber, mealNumber: meal.mealNumber });
  };

  const handleConfirm = () => {
    if (!selectedMember || !startDate) return;

    onConfirm(selectedMember, {
      startDate,
      endDate: endDate || undefined,
      meals: meals
    });
  };

  // Fetch members list
  const { data: members = [] } = useQuery({
    queryKey: ['/api/members'],
    queryFn: async () => {
      const response = await fetch('/api/members');
      if (!response.ok) throw new Error('Failed to fetch members');
      return response.json();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review and Customize Meal Plan</DialogTitle>
          <DialogDescription>
            Review your generated meal plan, regenerate any meals you'd like to change, and assign it to a member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Meal Plan View with regeneration buttons */}
          <MealPlanView
            meals={meals}
            onRegenerateMeal={handleRegenerateMeal}
            isRegenerating={regenerateMeal.isPending}
          />

          {/* Assignment Form */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Assign Meal Plan</h3>

            <div className="space-y-4">
              <Select onValueChange={(value) => setSelectedMember(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member: any) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date (Optional)</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleConfirm}
                disabled={!selectedMember || !startDate}
              >
                Confirm and Assign Meal Plan
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}