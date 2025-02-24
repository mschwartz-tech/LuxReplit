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
import { useQuery } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";

interface InteractiveMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlan: any; // TODO: Type this properly
  onRegenerateMeal: (meal: any) => void;
  onConfirm: (memberId: number, dates: { startDate: string; endDate?: string }) => Promise<void>;
  isRegeneratingMeal: boolean;
}

export function InteractiveMealPlanDialog({
  open,
  onOpenChange,
  mealPlan,
  onRegenerateMeal,
  onConfirm,
  isRegeneratingMeal
}: InteractiveMealPlanDialogProps) {
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  const handleConfirm = () => {
    if (!selectedMember || !startDate) return;

    onConfirm(selectedMember, {
      startDate,
      endDate: endDate || undefined
    });
  };

  // Fetch members list
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['/api/members'],
    queryFn: async () => {
      const response = await fetch('/api/members');
      if (!response.ok) throw new Error('Failed to fetch members');
      return response.json();
    }
  });

  if (!mealPlan) return null;

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
            meals={mealPlan.meals}
            onRegenerateMeal={onRegenerateMeal}
            isRegenerating={isRegeneratingMeal}
          />

          {/* Assignment Form */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Assign Meal Plan</h3>

            <div className="space-y-4">
              <Select 
                onValueChange={(value) => setSelectedMember(Number(value))}
                disabled={isLoadingMembers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingMembers ? "Loading members..." : "Select Member"} />
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
                disabled={!selectedMember || !startDate || isLoadingMembers}
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