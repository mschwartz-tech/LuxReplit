import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2 } from 'lucide-react';
import type { MealItem } from '@shared/schema';

interface MealPlanViewProps {
  meals: MealItem[];
  initialView?: 'single' | 'daily' | 'weekly';
  onRegenerateMeal?: (meal: MealItem) => void;
  isRegenerating?: boolean;
}

export function MealPlanView({ 
  meals, 
  initialView = 'daily',
  onRegenerateMeal,
  isRegenerating = false 
}: MealPlanViewProps) {
  const [view, setView] = useState(initialView);

  // Group meals by day
  const mealsByDay = meals.reduce((acc, meal) => {
    const day = meal.dayNumber;
    if (!acc[day]) acc[day] = [];
    acc[day].push(meal);
    return acc;
  }, {} as Record<number, MealItem[]>);

  const renderMeal = (meal: MealItem) => (
    <Card key={`${meal.dayNumber}-${meal.mealNumber}`} className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          <span>{meal.meal}</span>
          <div className="flex items-center gap-4">
            <div className="flex gap-2 text-sm">
              <Badge variant="outline">{meal.calories} cal</Badge>
              <Badge variant="outline">P: {meal.protein}g</Badge>
              <Badge variant="outline">C: {meal.carbs}g</Badge>
              <Badge variant="outline">F: {meal.fats}g</Badge>
            </div>
            {onRegenerateMeal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRegenerateMeal(meal)}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible>
          <AccordionItem value="ingredients">
            <AccordionTrigger>Ingredients</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc pl-4">
                {meal.ingredients.map((ingredient, idx) => (
                  <li key={idx}>
                    {ingredient.amount} {ingredient.unit} {ingredient.item}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="instructions">
            <AccordionTrigger>Cooking Instructions</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal pl-4">
                {meal.instructions.map((step, idx) => (
                  <li key={idx} className="mb-2">{step}</li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );

  const renderDay = (dayNumber: number, dayMeals: MealItem[]) => (
    <div key={dayNumber} className="mb-6">
      <h3 className="text-xl font-semibold mb-4">Day {dayNumber}</h3>
      <div className="space-y-4">
        {dayMeals.map(renderMeal)}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <Tabs value={view} onValueChange={(value: 'single' | 'daily' | 'weekly') => setView(value)}>
        <TabsList>
          <TabsTrigger value="single">Single Meal</TabsTrigger>
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          <TabsTrigger value="weekly">Weekly View</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-4">
          <div className="space-y-4">
            {meals.map(renderMeal)}
          </div>
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          {Object.entries(mealsByDay).map(([day, dayMeals]) => 
            renderDay(parseInt(day), dayMeals)
          )}
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(mealsByDay).map(([day, dayMeals]) => (
              <Card key={day} className="overflow-hidden">
                <CardHeader className="bg-muted">
                  <CardTitle>Day {day}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {dayMeals.map(meal => (
                    <div key={meal.mealNumber} className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">{meal.meal}</div>
                        {onRegenerateMeal && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRegenerateMeal(meal)}
                            disabled={isRegenerating}
                          >
                            {isRegenerating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{meal.food}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {meal.calories} cal | P:{meal.protein}g C:{meal.carbs}g F:{meal.fats}g
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}