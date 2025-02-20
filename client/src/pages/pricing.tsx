import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Plus, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type PricingPlan, type GymMembershipPricing } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [changes, setChanges] = useState<Record<number, Partial<PricingPlan>>>({});
  const [gymChanges, setGymChanges] = useState<Record<number, Partial<GymMembershipPricing>>>({});
  const [showNewGymForm, setShowNewGymForm] = useState(false);
  const [newGym, setNewGym] = useState({
    gymName: "",
    luxeEssentialsPrice: "",
    luxeStrivePrice: "",
    luxeAllAccessPrice: "",
  });

  const { data: pricingPlans = [], isLoading: plansLoading } = useQuery<PricingPlan[]>({
    queryKey: ["/api/pricing-plans"],
  });

  const { data: gymPricing = [], isLoading: locationsLoading } = useQuery<GymMembershipPricing[]>({
    queryKey: ["/api/gym-membership-pricing"],
  });

  const createGymMutation = useMutation({
    mutationFn: async (pricing: typeof newGym) => {
      const response = await fetch("/api/gym-membership-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gymName: pricing.gymName,
          luxeEssentialsPrice: parseFloat(pricing.luxeEssentialsPrice),
          luxeStrivePrice: parseFloat(pricing.luxeStrivePrice),
          luxeAllAccessPrice: parseFloat(pricing.luxeAllAccessPrice),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create gym pricing: ${error}`);
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      // Immediately update the local query cache with the new gym
      queryClient.setQueryData<GymMembershipPricing[]>(
        ["/api/gym-membership-pricing"],
        (old) => [...(old || []), data]
      );

      // Then invalidate to ensure we're in sync with the server
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
      console.error("Error creating gym:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add new gym pricing",
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
            gymName: pricing.gymName,
            luxeEssentialsPrice: pricing.luxeEssentialsPrice ? parseFloat(pricing.luxeEssentialsPrice.toString()) : undefined,
            luxeStrivePrice: pricing.luxeStrivePrice ? parseFloat(pricing.luxeStrivePrice.toString()) : undefined,
            luxeAllAccessPrice: pricing.luxeAllAccessPrice ? parseFloat(pricing.luxeAllAccessPrice.toString()) : undefined,
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const error = await res.text();
            throw new Error(`Failed to update gym pricing ${id}: ${error}`);
          }
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
        description: "Gym membership pricing updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating gym pricing:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update gym membership pricing",
        variant: "destructive",
      });
    },
  });

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

  const handleCreateGym = () => {
    if (!newGym.gymName || !newGym.luxeEssentialsPrice || !newGym.luxeStrivePrice || !newGym.luxeAllAccessPrice) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    createGymMutation.mutate(newGym);
  };

  const handleSaveGymChanges = () => {
    updateGymMutation.mutate(gymChanges);
  };

  if (plansLoading || locationsLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
        <div className="rounded-lg border border-gray-200 max-w-4xl w-full">
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
              {[1, 2, 3, 4].map((sessions, index) => (
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
                      <React.Fragment key={`${sessions}-${duration}`}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell
                            value={currentChanges.costPerSession ?? plan.costPerSession.toString()}
                            onChange={(value) =>
                              handlePriceChange(plan.id, "costPerSession", value)
                            }
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell
                            value={currentChanges.biweeklyPrice ?? plan.biweeklyPrice.toString()}
                            onChange={(value) =>
                              handlePriceChange(plan.id, "biweeklyPrice", value)
                            }
                          />
                        </td>
                        <td className={`px-3 py-2 whitespace-nowrap ${duration === 30 ? 'border-r' : ''}`}>
                          <EditableCell
                            value={currentChanges.pifPrice ?? plan.pifPrice.toString()}
                            onChange={(value) =>
                              handlePriceChange(plan.id, "pifPrice", value)
                            }
                          />
                        </td>
                      </React.Fragment>
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
              {gymPricing?.map((pricing) => (
                <tr key={pricing.id}>
                  <td className="px-3 py-2">
                    <Input
                      value={gymChanges[pricing.id]?.gymName ?? pricing.gymName}
                      onChange={(e) => handleGymPriceChange(pricing.id, "gymName", e.target.value)}
                      className="w-full h-8 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={
                        (gymChanges[pricing.id]?.luxeEssentialsPrice !== undefined
                          ? gymChanges[pricing.id]?.luxeEssentialsPrice
                          : pricing.luxeEssentialsPrice
                        ).toString()
                      }
                      onChange={(value) => handleGymPriceChange(pricing.id, "luxeEssentialsPrice", value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={
                        (gymChanges[pricing.id]?.luxeStrivePrice !== undefined
                          ? gymChanges[pricing.id]?.luxeStrivePrice
                          : pricing.luxeStrivePrice
                        ).toString()
                      }
                      onChange={(value) => handleGymPriceChange(pricing.id, "luxeStrivePrice", value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={
                        (gymChanges[pricing.id]?.luxeAllAccessPrice !== undefined
                          ? gymChanges[pricing.id]?.luxeAllAccessPrice
                          : pricing.luxeAllAccessPrice
                        ).toString()
                      }
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