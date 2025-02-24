import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { MealPlanView } from "@/components/ui/meal-plan-view";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from '@tanstack/react-query';
import type { MealItem } from '@shared/schema';

interface InteractiveMealPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialMeals: MealItem[];
  onConfirm: (meals: MealItem[]) => void;
  mealPlanRequest: any; // Use the actual type from your schema
}

export function InteractiveMealPlanDialog({
  isOpen,
  onClose,
  initialMeals,
  onConfirm,
  mealPlanRequest
}: InteractiveMealPlanDialogProps) {
  const [meals, setMeals] = useState<MealItem[]>(initialMeals);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Customize Your Meal Plan</DialogTitle>
          <DialogDescription>
            Review your meal plan and regenerate any meals you'd like to change
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4">
          <MealPlanView 
            meals={meals}
            onRegenerateMeal={handleRegenerateMeal}
            isRegenerating={regenerateMeal.isPending}
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(meals)}>
            Confirm Meal Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
