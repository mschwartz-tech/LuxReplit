import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type PricingPlan } from "@shared/schema";
import { toast } from "@/hooks/use-toast";

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
    className="w-24"
    min="0"
  />
);

export default function PricingPage() {
  const queryClient = useQueryClient();

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
    mutationFn: async (plan: Partial<PricingPlan>) => {
      const response = await fetch(`/api/pricing-plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      if (!response.ok) throw new Error("Failed to update pricing plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-plans"] });
      toast({
        title: "Success",
        description: "Pricing plan updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update pricing plan",
        variant: "destructive",
      });
    },
  });

  const handlePriceChange = (
    planId: number,
    field: "costPerSession" | "biweeklyPrice" | "pifPrice",
    value: string
  ) => {
    updateMutation.mutate({
      id: planId,
      [field]: value,
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Pricing Management</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sessions per Week
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                30min Cost/Session
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                30min Bi-weekly
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                30min PIF
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                60min Cost/Session
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                60min Bi-weekly
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                60min PIF
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[1, 2, 3, 4].map((sessions) => (
              <tr key={sessions}>
                <td className="px-6 py-4 whitespace-nowrap">{sessions}</td>
                {[30, 60].map((duration) => {
                  const plan = pricingPlans?.[duration]?.find(
                    (p) => p.sessionsPerWeek === sessions
                  );
                  return (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <EditableCell
                          value={plan?.costPerSession ?? "0"}
                          onChange={(value) =>
                            plan && handlePriceChange(plan.id, "costPerSession", value)
                          }
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <EditableCell
                          value={plan?.biweeklyPrice ?? "0"}
                          onChange={(value) =>
                            plan && handlePriceChange(plan.id, "biweeklyPrice", value)
                          }
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <EditableCell
                          value={plan?.pifPrice ?? "0"}
                          onChange={(value) =>
                            plan && handlePriceChange(plan.id, "pifPrice", value)
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