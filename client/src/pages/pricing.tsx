import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Plus, Loader2, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type PricingPlan, type GymMembershipPricing, type MembershipPricing } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback, Fragment } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EditableCellProps {
  value: string | number;
  onChange: (value: string) => void;
  type?: "number";
}

const EditableCell = ({ value, onChange, type = "number" }: EditableCellProps) => (
  <div className="relative flex items-center">
    <span className="text-gray-500 mr-1">$</span>
    <Input
      type={type}
      value={value?.toString() ?? ""}
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
  const [membershipChanges, setMembershipChanges] = useState<Record<number, Partial<MembershipPricing>>>({});
  const [showNewGymForm, setShowNewGymForm] = useState(false);
  const [showNewMembershipForm, setShowNewMembershipForm] = useState(false);
  const [gymToDelete, setGymToDelete] = useState<number | null>(null);
  const [membershipToDelete, setMembershipToDelete] = useState<number | null>(null);

  const [newGym, setNewGym] = useState({
    gymName: "",
    luxeEssentialsPrice: "",
    luxeStrivePrice: "",
    luxeAllAccessPrice: "",
  });

  const [newMembership, setNewMembership] = useState({
    gymLocation: "",
    membershipTier1: "",
    membershipTier2: "",
    membershipTier3: "",
    membershipTier4: "",
  });

  const { data: pricingPlans = [], isLoading: plansLoading } = useQuery<PricingPlan[]>({
    queryKey: ["/api/pricing-plans"],
  });

  const { data: gymPricing = [], isLoading: locationsLoading } = useQuery<GymMembershipPricing[]>({
    queryKey: ["/api/gym-membership-pricing"],
  });

  const { data: allGymPricing = [], isLoading: allLocationsLoading } = useQuery<GymMembershipPricing[]>({
    queryKey: ["/api/gym-membership-pricing/all"],
  });

  const { data: membershipPricing = [], isLoading: membershipLoading } = useQuery<MembershipPricing[]>({
    queryKey: ["/api/membership-pricing"],
  });

  const { data: allMembershipPricing = [], isLoading: allMembershipLoading } = useQuery<MembershipPricing[]>({
    queryKey: ["/api/membership-pricing/all"],
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gym-membership-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gym-membership-pricing/all"] });

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

  const deleteGymMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/gym-membership-pricing/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to delete gym pricing: ${error}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gym-membership-pricing"] });
      toast({
        title: "Success",
        description: "Gym pricing deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete gym pricing",
        variant: "destructive",
      });
    },
  });

  const handleDeleteGym = (id: number) => {
    setGymToDelete(id);
  };

  const confirmDelete = () => {
    if (gymToDelete) {
      deleteGymMutation.mutate(gymToDelete);
      setGymToDelete(null);
    }
  };

  const createMembershipMutation = useMutation({
    mutationFn: async (pricing: typeof newMembership) => {
      const response = await fetch("/api/membership-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gymLocation: pricing.gymLocation,
          membershipTier1: parseFloat(pricing.membershipTier1),
          membershipTier2: parseFloat(pricing.membershipTier2),
          membershipTier3: parseFloat(pricing.membershipTier3),
          membershipTier4: parseFloat(pricing.membershipTier4),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create membership pricing: ${error}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/membership-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/membership-pricing/all"] });

      setShowNewMembershipForm(false);
      setNewMembership({
        gymLocation: "",
        membershipTier1: "",
        membershipTier2: "",
        membershipTier3: "",
        membershipTier4: "",
      });

      toast({
        title: "Success",
        description: "New membership pricing added successfully",
      });
    },
    onError: (error) => {
      console.error("Error creating membership pricing:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add new membership pricing",
        variant: "destructive",
      });
    },
  });

  const updateMembershipMutation = useMutation({
    mutationFn: async (updates: Record<number, Partial<MembershipPricing>>) => {
      const promises = Object.entries(updates).map(([id, pricing]) =>
        fetch(`/api/membership-pricing/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...pricing,
            membershipTier1: pricing.membershipTier1 ? parseFloat(pricing.membershipTier1.toString()) : undefined,
            membershipTier2: pricing.membershipTier2 ? parseFloat(pricing.membershipTier2.toString()) : undefined,
            membershipTier3: pricing.membershipTier3 ? parseFloat(pricing.membershipTier3.toString()) : undefined,
            membershipTier4: pricing.membershipTier4 ? parseFloat(pricing.membershipTier4.toString()) : undefined,
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const error = await res.text();
            throw new Error(`Failed to update membership pricing ${id}: ${error}`);
          }
          return res.json();
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/membership-pricing"] });
      setMembershipChanges({});
      toast({
        title: "Success",
        description: "Membership pricing updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating membership pricing:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update membership pricing",
        variant: "destructive",
      });
    },
  });

  const deleteMembershipMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/membership-pricing/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to delete membership pricing: ${error}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/membership-pricing"] });
      toast({
        title: "Success",
        description: "Membership pricing deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete membership pricing",
        variant: "destructive",
      });
    },
  });

  const handleMembershipPriceChange = useCallback((
    pricingId: number,
    field: keyof MembershipPricing,
    value: string
  ) => {
    setMembershipChanges(prev => ({
      ...prev,
      [pricingId]: {
        ...prev[pricingId],
        [field]: value,
      },
    }));
  }, []);

  const handleCreateMembership = () => {
    if (!newMembership.gymLocation || !newMembership.membershipTier1 || !newMembership.membershipTier2 || 
        !newMembership.membershipTier3 || !newMembership.membershipTier4) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    createMembershipMutation.mutate(newMembership);
  };

  const handleSaveMembershipChanges = () => {
    updateMembershipMutation.mutate(membershipChanges);
  };

  const handleDeleteMembership = (id: number) => {
    setMembershipToDelete(id);
  };

  const confirmDeleteMembership = () => {
    if (membershipToDelete) {
      deleteMembershipMutation.mutate(membershipToDelete);
      setMembershipToDelete(null);
    }
  };

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
      console.error("Error updating pricing plans:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update pricing plans",
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
  const hasMembershipChanges = Object.keys(membershipChanges).length > 0;

  if (plansLoading || locationsLoading || allLocationsLoading || membershipLoading || allMembershipLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
                      <Fragment key={`${sessions}-${duration}`}>
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
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <div className="rounded-lg border border-gray-200 w-full max-w-4xl">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">
              Gym Membership Pricing Index
            </h2>
            <Button
              onClick={() => setShowNewGymForm(true)}
              className="gap-2 h-9 px-4 bg-primary hover:bg-primary/90"
              size="default"
            >
              <Plus className="h-5 w-5" />
              Add New Gym
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gym Location
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Luxe Essentials
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Luxe Strive
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Luxe All-Access
                  </th>
                  <th className="px-3 py-2 w-16"></th>
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
                    <td></td>
                  </tr>
                )}
                {gymPricing?.map((pricing) => (
                  <tr key={pricing.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <Input
                        value={gymChanges[pricing.id]?.gymName ?? pricing.gymName}
                        onChange={(e) => handleGymPriceChange(pricing.id, "gymName", e.target.value)}
                        className="w-full h-8 text-sm"
                      />
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
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteGym(pricing.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

      <div className="flex justify-center mt-8">
        <div className="rounded-lg border border-gray-200 w-full max-w-4xl">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">
              All Gym Locations History
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gym Location
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Luxe Essentials
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Luxe Strive
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Luxe All-Access
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allGymPricing?.map((pricing) => (
                  <tr key={pricing.id} className={`hover:bg-gray-50 ${pricing.isactive ? '' : 'bg-gray-50 text-gray-500'}`}>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        pricing.isactive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {pricing.isactive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {pricing.gymName}
                    </td>
                    <td className="px-3 py-2">
                      ${parseFloat(pricing.luxeEssentialsPrice).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      ${parseFloat(pricing.luxeStrivePrice).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      ${parseFloat(pricing.luxeAllAccessPrice).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {new Date(pricing.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <div className="rounded-lg border border-gray-200 w-full max-w-4xl">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">
              Membership Tiers Pricing
            </h2>
            <Button
              onClick={() => setShowNewMembershipForm(true)}
              className="gap-2 h-9 px-4 bg-primary hover:bg-primary/90"
              size="default"
            >
              <Plus className="h-5 w-5" />
              Add New Pricing
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gym Location
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier 1
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier 2
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier 3
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier 4
                  </th>
                  <th className="px-3 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {showNewMembershipForm && (
                  <tr>
                    <td className="px-3 py-2">
                      <Input
                        value={newMembership.gymLocation}
                        onChange={(e) => setNewMembership(prev => ({ ...prev, gymLocation: e.target.value }))}
                        className="w-full h-8 text-sm"
                        placeholder="Gym Location"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell
                        value={newMembership.membershipTier1}
                        onChange={(value) => setNewMembership(prev => ({ ...prev, membershipTier1: value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell
                        value={newMembership.membershipTier2}
                        onChange={(value) => setNewMembership(prev => ({ ...prev, membershipTier2: value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell
                        value={newMembership.membershipTier3}
                        onChange={(value) => setNewMembership(prev => ({ ...prevprev, membershipTier3: value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell
                        value={newMembership.membershipTier4}
                        onChange={(value) => setNewMembership(prev => ({ ...prev, membershipTier4: value }))}
                      />
                    </td>
                    <td></td>
                  </tr>
                )}
                {membershipPricing?.map((pricing) => (
                  <tr key={pricing.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <Input
                        value={membershipChanges[pricing.id]?.gymLocation ?? pricing.gymLocation}
                        onChange={(e) => handleMembershipPriceChange(pricing.id, "gymLocation", e.target.value)}
                        className="w-full h-8 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell
                        value={membershipChanges[pricing.id]?.membershipTier1 ?? pricing.membershipTier1}
                        onChange={(value) => handleMembershipPriceChange(pricing.id, "membershipTier1", value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell
                        value={membershipChanges[pricing.id]?.membershipTier2 ?? pricing.membershipTier2}
                        onChange={(value) => handleMembershipPriceChange(pricing.id, "membershipTier2", value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell
                        value={membershipChanges[pricing.id]?.membershipTier3 ?? pricing.membershipTier3}
                        onChange={(value) => handleMembershipPriceChange(pricing.id, "membershipTier3", value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell
                        value={membershipChanges[pricing.id]?.membershipTier4 ?? pricing.membershipTier4}
                        onChange={(value) => handleMembershipPriceChange(pricing.id, "membershipTier4", value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteMembership(pricing.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showNewMembershipForm && (
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <Button
                onClick={() => setShowNewMembershipForm(false)}
                variant="outline"
                className="h-8"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateMembership}
                disabled={createMembershipMutation.isPending}
                className="h-8"
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          )}
          {hasMembershipChanges && (
            <div className="flex justify-end p-4 border-t bg-gray-50">
              <Button
                onClick={handleSaveMembershipChanges}
                disabled={updateMembershipMutation.isPending}
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

      <div className="flex justify-center mt-8">
        <div className="rounded-lg border border-gray-200 w-full max-w-4xl">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">
              All Membership Tiers History
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gym Location
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier 1
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier 2
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier 3
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier 4
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allMembershipPricing?.map((pricing) => (
                  <tr key={pricing.id} className={`hover:bg-gray-50 ${pricing.isActive ? '' : 'bg-gray-50 text-gray-500'}`}>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        pricing.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {pricing.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {pricing.gymLocation}
                    </td>
                    <td className="px-3 py-2">
                      ${parseFloat(pricing.membershipTier1.toString()).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      ${parseFloat(pricing.membershipTier2.toString()).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      ${parseFloat(pricing.membershipTier3.toString()).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      ${parseFloat(pricing.membershipTier4.toString()).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {new Date(pricing.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AlertDialog open={!!gymToDelete} onOpenChange={() => setGymToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the gym pricing information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!membershipToDelete} onOpenChange={() => setMembershipToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the membership pricing information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMembership} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}