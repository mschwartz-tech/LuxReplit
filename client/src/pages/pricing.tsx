import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Plus, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type GymMembershipPricing } from "@shared/schema";
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
  const [gymChanges, setGymChanges] = useState<Record<number, Partial<GymMembershipPricing>>>({});
  const [showNewGymForm, setShowNewGymForm] = useState(false);
  const [newGym, setNewGym] = useState({
    gymName: "",
    luxeEssentialsPrice: "",
    luxeStrivePrice: "",
    luxeAllAccessPrice: "",
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
          luxeEssentialsPrice: parseFloat(pricing.luxeEssentialsPrice || "0"),
          luxeStrivePrice: parseFloat(pricing.luxeStrivePrice || "0"),
          luxeAllAccessPrice: parseFloat(pricing.luxeAllAccessPrice || "0"),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create gym pricing: ${error}`);
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData<GymMembershipPricing[]>(
        ["/api/gym-membership-pricing"],
        (old) => [...(old || []), data]
      );
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

  if (locationsLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
          <h1 className="text-2xl font-semibold">Gym Membership Pricing</h1>
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <div className="rounded-lg border border-gray-200 w-full max-w-4xl">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">
              Membership Pricing Index
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
              {gymPricing.map((pricing) => (
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
                        (gymChanges[pricing.id]?.luxeEssentialsPrice?.toString() ||
                          pricing.luxeEssentialsPrice.toString())
                      }
                      onChange={(value) => handleGymPriceChange(pricing.id, "luxeEssentialsPrice", value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={
                        (gymChanges[pricing.id]?.luxeStrivePrice?.toString() ||
                          pricing.luxeStrivePrice.toString())
                      }
                      onChange={(value) => handleGymPriceChange(pricing.id, "luxeStrivePrice", value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={
                        (gymChanges[pricing.id]?.luxeAllAccessPrice?.toString() ||
                          pricing.luxeAllAccessPrice.toString())
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