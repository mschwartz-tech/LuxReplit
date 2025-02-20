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
//import { Calendar } from "@/components/ui/calendar"; // Removed Calendar import
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, setYear, setMonth, setDate } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

// Step 1: Location and Membership Selection
const locationMembershipSchema = z.object({
  gymLocationId: z.number(),
  membershipType: z.enum(["luxe_essentials", "luxe_strive", "luxe_all_access", "training_only"]),
});

// Step-specific schemas
const step1Schema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  middleInitial: z.string().max(1, "Middle initial should be a single character").optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  birthMonth: z.number().min(1).max(12),
  birthDay: z.number().min(1).max(31),
  birthYear: z.number().min(1900).max(new Date().getFullYear()),
  gender: z.string(),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string().min(5, "Zip code must be at least 5 digits"),
  gymLocationId: z.number(),
  membershipType: z.enum(["luxe_essentials", "luxe_strive", "luxe_all_access", "training_only"]),
});

// Update the schema
const onboardingSchema = z.object({
  // Location and Membership (Step 1)
  ...locationMembershipSchema.shape,

  // Personal Information (Step 2)
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  middleInitial: z.string().max(1, "Middle initial should be a single character").optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  birthMonth: z.number().min(1).max(12),
  birthDay: z.number().min(1).max(31),
  birthYear: z.number().min(1900).max(new Date().getFullYear()),
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
  preferredLocation: z.string().optional(),
  marketingOptIn: z.boolean(),
});

// Helper function to generate array of numbers in range
const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

// Helper function to get month name
const getMonthName = (month: number) => {
  return format(setMonth(new Date(), month - 1), 'MMMM');
};

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

  // Update the form default values
  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: "",
      middleInitial: "",
      lastName: "",
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
      birthMonth: undefined,
      birthDay: undefined,
      birthYear: undefined,
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
            <div className="grid grid-cols-6 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="middleInitial"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>M.I.</FormLabel>
                    <FormControl>
                      <Input placeholder="A" maxLength={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem className="col-span-3">
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormLabel className="text-base">Date of Birth</FormLabel>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="birthMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Month</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {range(1, 12).map((month) => (
                            <SelectItem key={month} value={month.toString()}>
                              {getMonthName(month)}
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
                  name="birthDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {range(1, 31).map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
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
                  name="birthYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {range(1900, new Date().getFullYear()).reverse().map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormDescription>Please select your date of birth</FormDescription>
            </div>
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
            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
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
                        {gymLocations?.map((location: { id: number; gymName: string }) => (
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

  // Update the submit function to combine the name fields
  async function onSubmit(data: OnboardingForm) {
    setIsSubmitting(true);
    try {
      // Combine birth date components into a single Date object
      const birthDate = new Date(data.birthYear, data.birthMonth - 1, data.birthDay);

      // Combine name components
      const fullName = `${data.firstName}${data.middleInitial ? ` ${data.middleInitial}.` : ''} ${data.lastName}`;

      const userResponse = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
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
          birthDate: birthDate.toISOString(), // Use the combined date
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

  const handleNext = async () => {
    // Validate the current step
    try {
      const currentFields = form.getValues();

      if (currentStep === 1) {
        await step1Schema.parseAsync(currentFields);
      }
      // Add validation for other steps as needed

      setCurrentStep((prev) => prev + 1);
    } catch (error) {
      // This will trigger the form's error display
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          form.setError(err.path[0] as any, {
            message: err.message,
          });
        });
      }
    }
  };

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
                    onClick={handleNext}
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