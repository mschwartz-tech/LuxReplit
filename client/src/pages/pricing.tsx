import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type PricingPlan, type GymMembershipPricing } from "@shared/schema";
import { toast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  type?: "number";
}

const EditableCell = ({ value, onChange, type = "number" }: EditableCellProps) => (
  <div className="relative flex items-center">
    <span className="text-gray-500 mr-1">$</span>
    <Input
      type={type}
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        if (type === "number" && !/^\d*\.?\d*$/.test(val)) return;
        onChange(val);
      }}
      className="w-24 h-8 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      min="0"
    />
  </div>
);

export default function PricingPage() {
  const queryClient = useQueryClient();
  const [changes, setChanges] = useState<Record<number, Partial<PricingPlan>>>({});
  const [gymChanges, setGymChanges] = useState<Record<number, Partial<GymMembershipPricing>>>({});
  const [showNewGymForm, setShowNewGymForm] = useState(false);
  const [newGym, setNewGym] = useState({
    gymName: "",
    luxeEssentialsPrice: "",
    luxeStrivePrice: "",
    luxeAllAccessPrice: "",
  });

  const { data: pricingPlans = [], isLoading } = useQuery({
    queryKey: ["/api/pricing-plans"],
    select: (data: PricingPlan[]) => data,
  });

  const { data: gymPricing = [], isLoading: isLoadingGym } = useQuery({
    queryKey: ["/api/gym-membership-pricing"],
    select: (data: GymMembershipPricing[]) => data,
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

  const updateGymMutation = useMutation({
    mutationFn: async (updates: Record<number, Partial<GymMembershipPricing>>) => {
      const promises = Object.entries(updates).map(([id, pricing]) =>
        fetch(`/api/gym-membership-pricing/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...pricing,
            luxeEssentialsPrice: pricing.luxeEssentialsPrice ? parseFloat(pricing.luxeEssentialsPrice as string) : undefined,
            luxeStrivePrice: pricing.luxeStrivePrice ? parseFloat(pricing.luxeStrivePrice as string) : undefined,
            luxeAllAccessPrice: pricing.luxeAllAccessPrice ? parseFloat(pricing.luxeAllAccessPrice as string) : undefined,
          }),
        }).then(res => {
          if (!res.ok) throw new Error(`Failed to update gym pricing ${id}`);
          return res.json();
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gym-membership-pricing"] });
      setGymChanges({});
      toast({
        title: "Success",
        description: "All gym membership pricing updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update gym membership pricing",
        variant: "destructive",
      });
    },
  });

  const createGymMutation = useMutation({
    mutationFn: async (pricing: typeof newGym) => {
      const response = await fetch("/api/gym-membership-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pricing,
          luxeEssentialsPrice: parseFloat(pricing.luxeEssentialsPrice),
          luxeStrivePrice: parseFloat(pricing.luxeStrivePrice),
          luxeAllAccessPrice: parseFloat(pricing.luxeAllAccessPrice),
        }),
      });
      if (!response.ok) throw new Error("Failed to create gym pricing");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gym-membership-pricing"] });
      setShowNewGymForm(false);
      setNewGym({
        gymName: "",
        luxeEssentialsPrice: "",
        luxeStrivePrice: "",
        luxeAllAccessPrice: "",
      });
      toast({
        title: "Success",
        description: "New gym pricing added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add new gym pricing",
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

  const handleGymPriceChange = useCallback((
    pricingId: number,
    field: keyof GymMembershipPricing,
    value: string
  ) => {
    setGymChanges(prev => ({
      ...prev,
      [pricingId]: {
        ...prev[pricingId],
        [field]: value,
      },
    }));
  }, []);

  const handleSaveChanges = () => {
    updateMutation.mutate(changes);
  };

  const handleSaveGymChanges = () => {
    updateGymMutation.mutate(gymChanges);
  };

  const handleCreateGym = () => {
    createGymMutation.mutate(newGym);
  };

  if (isLoading || isLoadingGym) {
    return <div>Loading...</div>;
  }

  const hasChanges = Object.keys(changes).length > 0;
  const hasGymChanges = Object.keys(gymChanges).length > 0;

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

      <div className="flex justify-center">
        <div className="rounded-lg border border-gray-200 max-w-4xl">
          <h2 className="text-lg font-medium text-gray-900 p-4 border-b bg-gray-50">
            Personal Training Pricing Index
          </h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th rowSpan={2} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b w-20">
                  Sessions per Week
                </th>
                <th colSpan={3} className="px-3 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  30MIN
                </th>
                <th colSpan={3} className="px-3 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  60MIN
                </th>
              </tr>
              <tr>
                <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Cost/Session
                </th>
                <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Bi-weekly
                </th>
                <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">
                  PIF
                </th>
                <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Cost/Session
                </th>
                <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Bi-weekly
                </th>
                <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  PIF
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[1, 2, 3, 4, 5].map((sessions, index) => (
                <tr key={sessions} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                    {sessions}
                  </td>
                  {[30, 60].map((duration) => {
                    const plan = pricingPlans?.find(
                      (p) => p.sessionsPerWeek === sessions && p.duration === duration
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
                        <td className={`px-3 py-2 whitespace-nowrap ${duration === 30 ? 'border-r' : ''}`}>
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

      {/* Gym Membership Pricing Table */}
      <div className="flex justify-center mt-8">
        <div className="rounded-lg border border-gray-200 w-full max-w-4xl">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">
              Gym Membership Pricing Index
            </h2>
            <Button
              onClick={() => setShowNewGymForm(true)}
              className="gap-2 h-8"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add Gym
            </Button>
          </div>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Gym Location
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Luxe Essentials
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Luxe Strive
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Luxe All-Access
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {showNewGymForm && (
                <tr>
                  <td className="px-3 py-2">
                    <Input
                      value={newGym.gymName}
                      onChange={(e) => setNewGym(prev => ({ ...prev, gymName: e.target.value }))}
                      className="w-full h-8 text-sm"
                      placeholder="Gym Name"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={newGym.luxeEssentialsPrice}
                      onChange={(value) => setNewGym(prev => ({ ...prev, luxeEssentialsPrice: value }))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={newGym.luxeStrivePrice}
                      onChange={(value) => setNewGym(prev => ({ ...prev, luxeStrivePrice: value }))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={newGym.luxeAllAccessPrice}
                      onChange={(value) => setNewGym(prev => ({ ...prev, luxeAllAccessPrice: value }))}
                    />
                  </td>
                </tr>
              )}
              {gymPricing?.map((pricing: GymMembershipPricing) => (
                <tr key={pricing.id}>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900">
                    {pricing.gymName}
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={gymChanges[pricing.id]?.luxeEssentialsPrice ?? pricing.luxeEssentialsPrice}
                      onChange={(value) => handleGymPriceChange(pricing.id, "luxeEssentialsPrice", value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={gymChanges[pricing.id]?.luxeStrivePrice ?? pricing.luxeStrivePrice}
                      onChange={(value) => handleGymPriceChange(pricing.id, "luxeStrivePrice", value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={gymChanges[pricing.id]?.luxeAllAccessPrice ?? pricing.luxeAllAccessPrice}
                      onChange={(value) => handleGymPriceChange(pricing.id, "luxeAllAccessPrice", value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {showNewGymForm && (
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <Button
                onClick={() => setShowNewGymForm(false)}
                variant="outline"
                className="h-8"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateGym}
                disabled={createGymMutation.isPending}
                className="h-8"
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          )}
          {hasGymChanges && (
            <div className="flex justify-end p-4 border-t bg-gray-50">
              <Button
                onClick={handleSaveGymChanges}
                disabled={updateGymMutation.isPending}
                className="gap-2 h-8"
                size="sm"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}