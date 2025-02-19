import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type PricingPlan } from "@shared/schema";
import { toast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  type?: "number";
}

const EditableCell = ({ value, onChange, type = "number" }: EditableCellProps) => (
  <Input
    type={type}
    value={value}
    onChange={(e) => {
      const val = e.target.value;
      if (type === "number" && !/^\d*\.?\d*$/.test(val)) return;
      onChange(val);
    }}
    className="w-20 h-8 text-sm px-2 text-right"
    min="0"
  />
);

export default function PricingPage() {
  const queryClient = useQueryClient();
  const [changes, setChanges] = useState<Record<number, Partial<PricingPlan>>>({});

  const { data: pricingPlans, isLoading } = useQuery({
    queryKey: ["/api/pricing-plans"],
    select: (data: PricingPlan[]) => {
      // Group by duration
      const plans: Record<number, PricingPlan[]> = {};
      data.forEach(plan => {
        if (!plans[plan.duration]) {
          plans[plan.duration] = [];
        }
        plans[plan.duration].push(plan);
      });
      return plans;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<number, Partial<PricingPlan>>) => {
      const promises = Object.entries(updates).map(([id, plan]) =>
        fetch(`/api/pricing-plans/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(plan),
        }).then(res => {
          if (!res.ok) throw new Error(`Failed to update pricing plan ${id}`);
          return res.json();
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-plans"] });
      setChanges({});
      toast({
        title: "Success",
        description: "All pricing plans updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update pricing plans",
        variant: "destructive",
      });
    },
  });

  const handlePriceChange = useCallback((
    planId: number,
    field: "costPerSession" | "biweeklyPrice" | "pifPrice",
    value: string
  ) => {
    setChanges(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [field]: value,
      },
    }));
  }, []);

  const handleSaveChanges = () => {
    updateMutation.mutate(changes);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Pricing Management</h1>
        </div>
        {hasChanges && (
          <Button
            onClick={handleSaveChanges}
            disabled={updateMutation.isPending}
            className="gap-2 h-8"
            size="sm"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">
                Sessions per Week
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">
                30min Cost/Session
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">
                30min Bi-weekly
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">
                30min PIF
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">
                60min Cost/Session
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">
                60min Bi-weekly
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">
                60min PIF
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[1, 2, 3, 4].map((sessions, index) => (
              <tr key={sessions} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {sessions}
                </td>
                {[30, 60].map((duration) => {
                  const plan = pricingPlans?.[duration]?.find(
                    (p) => p.sessionsPerWeek === sessions
                  );
                  if (!plan) return null;

                  const currentChanges = changes[plan.id] || {};
                  return (
                    <>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell
                          value={currentChanges.costPerSession ?? plan.costPerSession}
                          onChange={(value) =>
                            handlePriceChange(plan.id, "costPerSession", value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell
                          value={currentChanges.biweeklyPrice ?? plan.biweeklyPrice}
                          onChange={(value) =>
                            handlePriceChange(plan.id, "biweeklyPrice", value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell
                          value={currentChanges.pifPrice ?? plan.pifPrice}
                          onChange={(value) =>
                            handlePriceChange(plan.id, "pifPrice", value)
                          }
                        />
                      </td>
                    </>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}