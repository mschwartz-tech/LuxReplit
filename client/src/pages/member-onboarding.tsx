import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMemberSchema, insertMemberProfileSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

// Step 1: Location and Membership Selection
const locationMembershipSchema = z.object({
  gymLocationId: z.number(),
  membershipType: z.enum(["luxe_essentials", "luxe_strive", "luxe_all_access", "training_only"]),
});

// Combine all schemas for the complete form
const onboardingSchema = z.object({
  // Location and Membership (Step 1)
  ...locationMembershipSchema.shape,

  // Personal Information (Step 2)
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  birthDate: z.date(),
  gender: z.string(),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string().min(5, "Zip code must be at least 5 digits"),

  // Physical Information and Goals (Step 3)
  height: z.string(),
  weight: z.string(),
  fitnessGoals: z.array(z.string()).min(1, "At least one goal is required"),
  healthConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  injuries: z.array(z.string()).optional(),

  // Emergency Contact (Step 4)
  emergencyContactName: z.string(),
  emergencyContactPhone: z.string(),
  emergencyContactRelation: z.string(),

  // Waivers and Preferences (Step 5)
  liabilityWaiverSigned: z.boolean(),
  photoReleaseWaiverSigned: z.boolean(),
  preferredContactMethod: z.enum(["email", "phone", "text"]),
  preferredLocation: z.string().optional(),
  marketingOptIn: z.boolean(),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

export default function MemberOnboardingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAdmin = user?.role === "admin";

  // Fetch gym locations and their pricing
  const { data: gymLocations, isLoading: isLoadingLocations } = useQuery({
    queryKey: ["/api/gym-membership-pricing"],
    queryFn: () => fetch("/api/gym-membership-pricing").then((res) => res.json()),
  });

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      membershipType: undefined,
      gymLocationId: undefined,
      liabilityWaiverSigned: false,
      photoReleaseWaiverSigned: false,
      marketingOptIn: false,
      fitnessGoals: [],
      healthConditions: [],
      medications: [],
      injuries: [],
      preferredContactMethod: "email",
    },
  });

  if (!user || !isAdmin) {
    return <div className="p-8">Not authorized to view this page</div>;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 555-5555" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredContactMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Contact Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location and Membership Selection moved here */}
            <div className="space-y-4 border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold">Location and Membership Selection</h3>
              <FormField
                control={form.control}
                name="gymLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gym Location</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value, 10))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gym location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gymLocations?.map((location: {id: number, gymName: string}) => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.gymName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="membershipType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membership Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!form.getValues("gymLocationId")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select membership type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {form.getValues("gymLocationId") && (
                          <>
                            <SelectItem value="luxe_essentials">Luxe Essentials</SelectItem>
                            <SelectItem value="luxe_strive">Luxe Strive</SelectItem>
                            <SelectItem value="luxe_all_access">Luxe All-Access</SelectItem>
                            <SelectItem value="training_only">Training Only</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Physical Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height</FormLabel>
                    <FormControl>
                      <Input placeholder="5'10&quot;" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (lbs)</FormLabel>
                    <FormControl>
                      <Input placeholder="150" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <h3 className="text-lg font-semibold">Health Information</h3>
            <FormField
              control={form.control}
              name="fitnessGoals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fitness Goals</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your fitness goals (one per line)"
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            .split("\n")
                            .filter((goal) => goal.trim() !== "")
                        )
                      }
                      value={field.value?.join("\n") || ""}
                    />
                  </FormControl>
                  <FormDescription>Enter each goal on a new line</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="healthConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Health Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any health conditions (one per line)"
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            .split("\n")
                            .filter((condition) => condition.trim() !== "")
                        )
                      }
                      value={field.value?.join("\n") || ""}
                    />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 555-5555" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactRelation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <Input placeholder="Spouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Waivers and Agreements</h3>
            <FormField
              control={form.control}
              name="liabilityWaiverSigned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Liability Waiver</FormLabel>
                    <FormDescription>I agree to the terms of the liability waiver</FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="photoReleaseWaiverSigned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Photo Release</FormLabel>
                    <FormDescription>I agree to the terms of the photo release waiver</FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="marketingOptIn"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Marketing Communications</FormLabel>
                    <FormDescription>
                      I would like to receive marketing communications
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="preferredContactMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Contact Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="preferredLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Preferred Location" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      default:
        return null;
    }
  };

  async function onSubmit(data: OnboardingForm) {
    setIsSubmitting(true);
    try {
      const userResponse = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          role: "user",
          username: data.email,
          password: Math.random().toString(36).slice(-8),
        }),
      });

      if (!userResponse.ok) throw new Error("Failed to create user");
      const newUser = await userResponse.json();

      const memberResponse = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newUser.id,
          membershipType: data.membershipType,
          membershipStatus: "active",
          startDate: new Date(),
          gymLocationId: data.gymLocationId,
        }),
      });

      if (!memberResponse.ok) throw new Error("Failed to create member");
      const newMember = await memberResponse.json();

      const profileResponse = await fetch(`/api/members/${newMember.id}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newUser.id,
          birthDate: data.birthDate,
          gender: data.gender,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          phoneNumber: data.phoneNumber,
          preferredLocation: data.preferredLocation,
          height: data.height,
          weight: data.weight,
          fitnessGoals: data.fitnessGoals,
          healthConditions: data.healthConditions,
          medications: data.medications,
          injuries: data.injuries,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          emergencyContactRelation: data.emergencyContactRelation,
          liabilityWaiverSigned: data.liabilityWaiverSigned,
          liabilityWaiverSignedDate: new Date(),
          photoReleaseWaiverSigned: data.photoReleaseWaiverSigned,
          photoReleaseWaiverSignedDate: new Date(),
          preferredContactMethod: data.preferredContactMethod,
          marketingOptIn: data.marketingOptIn,
        }),
      });

      if (!profileResponse.ok) throw new Error("Failed to create profile");

      toast({
        title: "Success",
        description: "New member has been successfully onboarded",
      });
      navigate("/gym-members");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to complete member onboarding",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>New Member Onboarding</CardTitle>
          <CardDescription>
            Complete the form below to register a new member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {renderStep()}

              <div className="flex justify-between">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep((prev) => prev - 1)}
                  >
                    Previous
                  </Button>
                )}

                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep((prev) => prev + 1)}
                    className="ml-auto"
                  >
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting} className="ml-auto">
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Complete Onboarding
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}