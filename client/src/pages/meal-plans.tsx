
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/use-toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

interface Meal {
  meal: string;
  food: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

interface MealPlan {
  id: number;
  name: string;
  description: string;
  meals: Meal[];
  trainerId: number;
  createdAt: string;
}

export default function MealPlansPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    meals: [{
      meal: 'Breakfast',
      food: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0
    }]
  });

  useEffect(() => {
    fetchMealPlans();
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members');
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load members',
        variant: 'destructive'
      });
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedMember || !selectedPlan || !startDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(`/api/members/${selectedMember}/meal-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mealPlanId: selectedPlan,
          startDate,
          endDate: endDate || null,
          status: 'active'
        })
      });

      if (!response.ok) throw new Error('Failed to assign meal plan');
      
      toast({
        title: 'Success',
        description: 'Meal plan assigned successfully'
      });
      
      // Reset form
      setSelectedMember(null);
      setSelectedPlan(null);
      setStartDate('');
      setEndDate('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign meal plan',
        variant: 'destructive'
      });
    }
  };

  const fetchMealPlans = async () => {
    try {
      const response = await fetch('/api/meal-plans');
      if (!response.ok) throw new Error('Failed to fetch meal plans');
      const data = await response.json();
      setMealPlans(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load meal plans',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    try {
      const response = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newPlan,
          trainerId: user?.id
        })
      });

      if (!response.ok) throw new Error('Failed to create meal plan');
      
      toast({
        title: 'Success',
        description: 'Meal plan created successfully'
      });
      
      fetchMealPlans();
      setNewPlan({
        name: '',
        description: '',
        meals: [{
          meal: 'Breakfast',
          food: '',
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0
        }]
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create meal plan',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Meal Plans</h1>
      
      {(user?.role === 'admin' || user?.role === 'trainer') && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Meal Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                placeholder="Plan Name"
                value={newPlan.name}
                onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
              />
              <Textarea
                placeholder="Description"
                value={newPlan.description}
                onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
              />
              <Button onClick={handleCreatePlan}>Create Plan</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(user?.role === 'admin' || user?.role === 'trainer') && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assign Meal Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <select
                className="w-full p-2 border rounded"
                onChange={(e) => setSelectedMember(parseInt(e.target.value))}
              >
                <option value="">Select Member</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
              <select
                className="w-full p-2 border rounded"
                onChange={(e) => setSelectedPlan(parseInt(e.target.value))}
              >
                <option value="">Select Meal Plan</option>
                {mealPlans.map(plan => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <Button onClick={handleAssignPlan}>Assign Plan</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mealPlans.map((plan) => (
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
                    <div className="text-sm text-gray-500">
                      <span>Calories: {meal.calories}</span>
                      <span className="mx-2">|</span>
                      <span>Protein: {meal.protein}g</span>
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
