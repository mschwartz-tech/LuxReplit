import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
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
import { useState } from "react";
import { useLocation } from "wouter";

export default function MemberCheckoutPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [, setLocation] = useLocation();

  // Form state
  const [sessionDuration, setSessionDuration] = useState<"30" | "60">();
  const [sessionsPerWeek, setSessionsPerWeek] = useState<string>();
  const [paymentType, setPaymentType] = useState<"biweekly" | "pif">();
  const [membershipType, setMembershipType] = useState<
    "luxe_essentials" | "luxe_strive" | "luxe_all_access" | undefined
  >();
  const [gymLocationId, setGymLocationId] = useState<string>();

  // Fetch pricing data
  const { data: pricingPlans, isLoading: plansLoading } = useQuery<PricingPlan[]>({
    queryKey: ["/api/pricing-plans"],
    enabled: !!user,
  });

  const { data: gymPricing, isLoading: gymPricingLoading } = useQuery<GymMembershipPricing[]>({
    queryKey: ["/api/gym-membership-pricing"],
    enabled: !!user,
  });

  // Calculate selected training plan price
  const selectedTrainingPlan = pricingPlans?.find(
    plan =>
      plan.duration === parseInt(sessionDuration || "0") &&
      plan.sessionsPerWeek === parseInt(sessionsPerWeek || "0")
  );

  const trainingPrice = selectedTrainingPlan && paymentType === "biweekly"
    ? selectedTrainingPlan.biweeklyPrice
    : selectedTrainingPlan?.pifPrice;

  // Calculate selected membership price
  const selectedGymLocation = gymPricing?.find(
    gym => gym.id === parseInt(gymLocationId || "0")
  );

  const getMembershipPrice = () => {
    if (!selectedGymLocation || !membershipType) return null;
    switch (membershipType) {
      case "luxe_essentials":
        return selectedGymLocation.luxeEssentialsPrice;
      case "luxe_strive":
        return selectedGymLocation.luxeStrivePrice;
      case "luxe_all_access":
        return selectedGymLocation.luxeAllAccessPrice;
      default:
        return null;
    }
  };

  const membershipPrice = getMembershipPrice();

  // Calculate total
  const total = (trainingPrice ? parseFloat(trainingPrice.toString()) : 0) +
    (membershipPrice ? parseFloat(membershipPrice.toString()) : 0);

  if (!user || !isAdmin) {
    return <div className="p-8">Not authorized to view this page</div>;
  }

  if (plansLoading || gymPricingLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Membership & Training</h1>
          <p className="text-muted-foreground">
            Select your preferred training package and gym membership options
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Training Package Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Training Package</CardTitle>
              <CardDescription>Choose your preferred training options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Session Duration</Label>
                <RadioGroup
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
                <Select onValueChange={setSessionsPerWeek}>
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

              {trainingPrice && (
                <div className="pt-4 border-t">
                  <p className="text-lg font-semibold">
                    Training Package: ${parseFloat(trainingPrice.toString()).toFixed(2)}
                    {paymentType === "biweekly" ? "/bi-weekly" : " (PIF)"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Membership Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Gym Membership</CardTitle>
              <CardDescription>Choose your preferred membership type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Location</Label>
                <Select onValueChange={setGymLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gym location" />
                  </SelectTrigger>
                  <SelectContent>
                    {gymPricing?.map(gym => (
                      <SelectItem key={gym.id} value={gym.id.toString()}>
                        {gym.gymName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Membership Type</Label>
                <RadioGroup
                  onValueChange={(value) => setMembershipType(value as typeof membershipType)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="luxe_essentials" id="membership-essentials" />
                    <Label htmlFor="membership-essentials">Luxe Essentials</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="luxe_strive" id="membership-strive" />
                    <Label htmlFor="membership-strive">Luxe Strive</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="luxe_all_access" id="membership-all-access" />
                    <Label htmlFor="membership-all-access">Luxe All Access</Label>
                  </div>
                </RadioGroup>
              </div>

              {membershipPrice && (
                <div className="pt-4 border-t">
                  <p className="text-lg font-semibold">
                    Membership: ${parseFloat(membershipPrice.toString()).toFixed(2)}/month
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Total and Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">
                  Total: ${total.toFixed(2)}
                  {paymentType === "biweekly" ? "/bi-weekly + membership" : " (PIF) + membership"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {membershipPrice ? `Membership billed monthly at $${parseFloat(membershipPrice.toString()).toFixed(2)}` : ""}
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => {
                  // TODO: Handle checkout process
                  console.log("Proceeding to payment...");
                }}
                disabled={!membershipType || !gymLocationId ||
                  (!trainingPrice && !membershipPrice)}
              >
                Proceed to Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}