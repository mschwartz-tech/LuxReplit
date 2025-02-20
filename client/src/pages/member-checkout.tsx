import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { PricingPlan, GymMembershipPricing } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function MemberCheckoutPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  // Parse URL parameters
  const params = new URLSearchParams(location.split('?')[1]);
  const memberId = params.get('memberId');

  // Initialize form state from URL parameters
  const [sessionDuration, setSessionDuration] = useState<"30" | "60">(
    params.get('sessionDuration') as "30" | "60" || "30"
  );
  const [sessionsPerWeek, setSessionsPerWeek] = useState<string>(
    params.get('sessionsPerWeek') || "1"
  );
  const [paymentType, setPaymentType] = useState<"biweekly" | "pif">(
    params.get('paymentType') as "biweekly" | "pif" || "biweekly"
  );
  const [membershipType, setMembershipType] = useState<string>(
    params.get('membershipType') || "luxe_essentials"
  );
  const [gymLocationId, setGymLocationId] = useState<string>(
    params.get('gymLocationId') || ""
  );

  // Fetch pricing data
  const { data: pricingPlans, isLoading: plansLoading } = useQuery<PricingPlan[]>({
    queryKey: ["/api/pricing-plans"],
    enabled: !!user,
  });

  const { data: gymLocations, isLoading: locationsLoading } = useQuery<GymMembershipPricing[]>({
    queryKey: ["/api/gym-membership-pricing"],
    enabled: !!user,
  });

  const selectedPlan = pricingPlans?.find(
    plan => 
      plan.sessionsPerWeek === parseInt(sessionsPerWeek) && 
      plan.duration === parseInt(sessionDuration)
  );

  const selectedLocation = gymLocations?.find(
    loc => loc.id === parseInt(gymLocationId)
  );

  const getGymMembershipPrice = () => {
    if (!selectedLocation || !membershipType) return 0;
    switch (membershipType) {
      case "luxe_essentials":
        return parseFloat(selectedLocation.luxeEssentialsPrice.toString());
      case "luxe_strive":
        return parseFloat(selectedLocation.luxeStrivePrice.toString());
      case "luxe_all_access":
        return parseFloat(selectedLocation.luxeAllAccessPrice.toString());
      default:
        return 0;
    }
  };

  const getTrainingPrice = () => {
    if (!selectedPlan) return 0;
    return paymentType === "biweekly" 
      ? parseFloat(selectedPlan.biweeklyPrice.toString())
      : parseFloat(selectedPlan.pifPrice.toString());
  };

  const totalPrice = getGymMembershipPrice() + getTrainingPrice();

  // Create gym location with default pricing mutation
  const createGymLocationMutation = useMutation({
    mutationFn: async (gymName: string) => {
      const response = await fetch("/api/gym-membership-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gymName,
          luxeEssentialsPrice: "49.99",  // Default prices
          luxeStrivePrice: "79.99",
          luxeAllAccessPrice: "99.99"
        }),
      });
      if (!response.ok) throw new Error("Failed to create gym location");
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gym-membership-pricing"] });
      toast({
        title: "Success",
        description: "New gym location created with default pricing",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create gym location",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = async () => {
    try {
      const response = await fetch(`/api/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: parseInt(memberId!),
          amount: totalPrice.toString(),
          status: "pending",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          description: `Gym membership (${membershipType}) and training package (${sessionsPerWeek}x${sessionDuration}min)`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create invoice');
      }

      toast({
        title: "Success",
        description: "Invoice created successfully",
      });

      // Redirect to member profile
      setLocation(`/member-profile/${memberId}`);
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "Failed to process checkout",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return <div className="p-8">Not authorized to view this page</div>;
  }

  if (plansLoading || locationsLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <Link href="/gym-members">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
        <p className="text-muted-foreground">Complete member registration</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Training Package</CardTitle>
            <CardDescription>Select training duration and frequency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Session Duration</Label>
              <RadioGroup
                value={sessionDuration}
                onValueChange={(value: "30" | "60") => setSessionDuration(value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="30" id="duration-30" />
                  <Label htmlFor="duration-30">30 MIN</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="60" id="duration-60" />
                  <Label htmlFor="duration-60">60 MIN</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Sessions per Week</Label>
              <Select value={sessionsPerWeek} onValueChange={setSessionsPerWeek}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sessions per week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Session</SelectItem>
                  <SelectItem value="2">2 Sessions</SelectItem>
                  <SelectItem value="3">3 Sessions</SelectItem>
                  <SelectItem value="4">4 Sessions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Type</Label>
              <RadioGroup
                value={paymentType}
                onValueChange={(value: "biweekly" | "pif") => setPaymentType(value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="biweekly" id="payment-biweekly" />
                  <Label htmlFor="payment-biweekly">Bi-weekly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pif" id="payment-pif" />
                  <Label htmlFor="payment-pif">Paid in Full</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Review your selections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Training Package:</span>
                <span>${getTrainingPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Gym Membership:</span>
                <span>${getGymMembershipPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleCheckout}
              disabled={!selectedPlan || !selectedLocation}
            >
              Complete Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}