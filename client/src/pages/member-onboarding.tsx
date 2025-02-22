// Import groups organized by functionality
import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import SignaturePad from 'react-signature-canvas';
import { format } from "date-fns";
import { Loader2, ArrowLeft } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// Components
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormDescription, FormField,
  FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Hooks and Utils
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { z } from "zod";

// Constants
const DEBUG_MODE = process.env.NODE_ENV === 'development';
const TEST_DATA = {
  firstName: "John",
  middleInitial: "A",
  lastName: "Doe",
  email: "test@example.com",
  birthMonth: 9,
  birthDay: 15,
  birthYear: 1990,
  gender: "male",
  phoneNumber: "5551234567",
  address: "123 Test St",
  city: "Test City",
  state: "FL",
  zipCode: "12345",
  heightFeet: 5,
  heightInches: 10,
  weight: "170",
  fitnessGoals: ["weight_loss", "muscle_gain"],
  healthConditions: [],
  medications: [],
  injuries: [],
  emergencyContactName: "Jane Doe",
  emergencyContactPhone: "5559876543",
  emergencyContactRelation: "Spouse",
  liabilityWaiverSigned: true,
  photoReleaseWaiverSigned: true,
  marketingOptIn: true,
  sessionDuration: "30",
  sessionsPerWeek: "2",
  paymentType: "biweekly",
  gymLocationId: 1,
  membershipType: "luxe_essentials"
};

// Helper Functions
const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

const getMonthName = (month: number) => {
  return format(new Date(2024, month - 1, 1), 'MMMM');
};

// Validation Schemas
const step1Schema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  birthMonth: z.coerce.number().min(1).max(12),
  birthDay: z.coerce.number().min(1).max(31),
  birthYear: z.coerce.number().min(1900).max(new Date().getFullYear()),
  gender: z.string().min(1, "Gender is required"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(5, "Zip code must be at least 5 digits"),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(10, "Emergency contact phone must be at least 10 digits"),
  emergencyContactRelation: z.string().min(1, "Emergency contact relation is required"),
});

const onboardingSchema = z.object({
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
  heightFeet: z.number().min(1, "Feet must be at least 1").max(9, "Feet cannot exceed 9"),
  heightInches: z.number().min(0, "Inches must be at least 0").max(11, "Inches cannot exceed 11"),
  weight: z.string(),
  fitnessGoals: z.array(z.string()).min(1, "At least one goal is required"),
  healthConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  injuries: z.array(z.string()).optional(),
  emergencyContactName: z.string(),
  emergencyContactPhone: z.string(),
  emergencyContactRelation: z.string(),
  liabilityWaiverSigned: z.boolean(),
  photoReleaseWaiverSigned: z.boolean(),
  marketingOptIn: z.boolean(),
  sessionDuration: z.enum(['30', '60']).optional(),
  sessionsPerWeek: z.string().optional(),
  paymentType: z.enum(['biweekly', 'pif']).optional(),
  membershipType: z.enum(['luxe_essentials', 'luxe_strive', 'luxe_all_access']).optional(),
  gymLocationId: z.number().optional(),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

// Component Types
interface StepProps {
  form: any;
  liabilitySignaturePad?: React.RefObject<SignaturePad>;
  photoReleaseSignaturePad?: React.RefObject<SignaturePad>;
  gymLocations?: any[];
}

// Step Components
const PersonalInformationStep = ({ form }: StepProps) => (
  <div className="space-y-3">
    <div className="grid grid-cols-6 gap-2">
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

    <FormField
      control={form.control}
      name="address"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Address</FormLabel>
          <FormControl>
            <AddressAutocomplete
              {...field}
              onAddressSelect={(data) => {
                form.setValue('address', data.address);
                form.setValue('city', data.city);
                form.setValue('state', data.state);
                form.setValue('zipCode', data.zipCode);
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <div>
      <FormLabel className="text-sm font-medium block mb-1.5">Date of Birth</FormLabel>
      <div className="grid grid-cols-3 gap-2">
        <FormField
          control={form.control}
          name="birthMonth"
          render={({ field }) => (
            <FormItem>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger className="h-9">
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
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger className="h-9">
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
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger className="h-9">
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
    </div>

    <div className="grid grid-cols-2 gap-2 mt-3">
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
    <FormField
      control={form.control}
      name="gender"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Gender</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
    <div className="space-y-2 pt-2 border-t">
      <h3 className="text-sm font-semibold">Emergency Contact</h3>
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
      </div>
    </div>

  </div>
);

const HealthInformationStep = ({ form }: StepProps) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Physical Information</h3>
    <div className="grid grid-cols-3 gap-4">
      <FormField
        control={form.control}
        name="heightFeet"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Height (ft)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                max={9}
                placeholder="5"
                {...field}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="heightInches"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Height (in)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                max={11}
                placeholder="10"
                {...field}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
              />
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
          <FormDescription>Select your primary fitness objectives</FormDescription>
          <div className="grid md:grid-cols-2 gap-2 mt-2">
            {[
              { id: "weight_loss", label: "Weight Loss" },
              { id: "muscle_gain", label: "Muscle Gain" },
              { id: "strength_training", label: "Strength Training" },
              { id: "cardiovascular_fitness", label: "Cardiovascular Fitness" },
              { id: "flexibility_mobility", label: "Flexibility & Mobility" },
              { id: "endurance", label: "Endurance Building" },
              { id: "body_toning", label: "Body Toning" },
              { id: "athletic_performance", label: "Athletic Performance" },
              { id: "general_fitness", label: "General Fitness" },
              { id: "stress_reduction", label: "Stress Reduction" },
            ].map((goal) => (
              <FormField
                key={goal.id}
                control={form.control}
                name="fitnessGoals"
                render={({ field }) => (
                  <FormItem
                    key={goal.id}
                    className="flex flex-row items-start space-x-3 space-y-0"
                  >
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(goal.id)}
                        onCheckedChange={(checked) => {
                          const updatedGoals = checked
                            ? [...(field.value || []), goal.id]
                            : (field.value || []).filter((value: string) => value !== goal.id);
                          field.onChange(updatedGoals);
                        }}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {goal.label}
                    </FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="healthConditions"
      render={({ field: { onChange, value } }) => (
        <FormItem>
          <FormLabel>Health Conditions</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Enter any health conditions (one per line)"
              value={Array.isArray(value) ? value.join('\n') : ''}
              onChange={(e) => {
                const conditions = e.target.value
                  .split('\n')
                  .map(condition => condition.trim())
                  .filter(Boolean);
                onChange(conditions);
              }}
            />
          </FormControl>
          <FormDescription>Optional</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

const WaiversStep = ({ form, liabilitySignaturePad, photoReleaseSignaturePad }: StepProps) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Waivers and Agreements</h3>

    <div className="space-y-4 p-4 border rounded-lg">
      <FormField
        control={form.control}
        name="liabilityWaiverSigned"
        render={({ field }) => (
          <FormItem className="space-y-4">
            <div className="flex flex-row items-start space-x-3">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Liability Waiver</FormLabel>
                <FormDescription>
                  I have read and agree to the terms of the liability waiver
                </FormDescription>
              </div>
            </div>
            {field.value && (
              <div className="space-y-2">
                <FormLabel>Signature</FormLabel>
                <div className="border rounded-lg bg-white">
                  <SignaturePad
                    ref={liabilitySignaturePad}
                    canvasProps={{
                      className: "w-full h-40"
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (liabilitySignaturePad.current) {
                      liabilitySignaturePad.current.clear();
                    }
                  }}
                >
                  Clear Signature
                </Button>
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <div className="space-y-4 p-4 border rounded-lg">
      <FormField
        control={form.control}
        name="photoReleaseWaiverSigned"
        render={({ field }) => (
          <FormItem className="space-y-4">
            <div className="flex flex-row items-start space-x-3">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Photo Release</FormLabel>
                <FormDescription>
                  I agree to the terms of the photo release waiver
                </FormDescription>
              </div>
            </div>
            {field.value && (
              <div className="space-y-2">
                <FormLabel>Signature</FormLabel>
                <div className="border rounded-lg bg-white">
                  <SignaturePad
                    ref={photoReleaseSignaturePad}
                    canvasProps={{
                      className: "w-full h-40"
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (photoReleaseSignaturePad.current) {
                      photoReleaseSignaturePad.current.clear();
                    }
                  }}
                >
                  Clear Signature
                </Button>
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

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
  </div>
);

const PackageSelectionStep = ({ form, gymLocations }: StepProps) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Training Package</h3>
    <div className="space-y-4 p-4 border rounded-lg">
      <FormField
        control={form.control}
        name="sessionDuration"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Session Duration</FormLabel>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
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
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="sessionsPerWeek"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sessions per Week</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select number of sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Session</SelectItem>
                <SelectItem value="2">2 Sessions</SelectItem><SelectItem value="3">3 Sessions</SelectItem>
                <SelectItem value="4">4 Sessions</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="paymentType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Payment Type</FormLabel>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
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
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <h3 className="text-lg font-semibold mt-6">Gym Membership</h3>
    <div className="space-y-4 p-4 border rounded-lg">
      <FormField
        control={form.control}
        name="gymLocationId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Location</FormLabel>
            <Select
              onValueChange={(value) => field.onChange(parseInt(value))}
              value={field.value?.toString()}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gym location" />
              </SelectTrigger>
              <SelectContent>
                {gymLocations?.map((location) => (
                  <SelectItem
                    key={location.id}
                    value={location.id.toString()}
                  >
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
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
              className="space-y-2"
              disabled={!form.getValues("gymLocationId")}
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
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  </div>
);

// Validation middleware
const validateFormData = (data: OnboardingForm) => {
  const errors: Partial<Record<keyof OnboardingForm, string>> = {};

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    errors.email = "Invalid email format";
  }

  // Phone validation
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(data.phoneNumber.replace(/\D/g, ''))) {
    errors.phoneNumber = "Phone number must be 10 digits";
  }

  // Date validation
  const birthDate = new Date(data.birthYear, data.birthMonth - 1, data.birthDay);
  if (birthDate > new Date() || birthDate.getFullYear() < 1900) {
    errors.birthYear = "Invalid birth date";
  }

  if (Object.keys(errors).length > 0) {
    throw new Error(JSON.stringify(errors));
  }
};

export default function MemberOnboardingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const liabilitySignaturePad = useRef<SignaturePad>(null);
  const photoReleaseSignaturePad = useRef<SignaturePad>(null);

  const { data: gymLocations, isLoading: isLoadingLocations } = useQuery({
    queryKey: ["/api/gym-membership-pricing"],
    enabled: !!user,
  });

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: "",
      middleInitial: "",
      lastName: "",
      email: "",
      gender: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phoneNumber: "",
      birthMonth: undefined,
      birthDay: undefined,
      birthYear: undefined,
      heightFeet: undefined,
      heightInches: undefined,
      weight: "",
      fitnessGoals: [],
      healthConditions: [],
      medications: [],
      injuries: [],
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
      liabilityWaiverSigned: false,
      photoReleaseWaiverSigned: false,
      marketingOptIn: false,
      sessionDuration: undefined,
      sessionsPerWeek: undefined,
      paymentType: undefined,
      gymLocationId: undefined,
      membershipType: undefined,
    },
  });

  // Event Handlers
  const handleNext = async () => {
    const fields = [
      'firstName', 'lastName', 'email', 'birthMonth', 'birthDay',
      'birthYear', 'gender', 'phoneNumber', 'address', 'city',
      'state', 'zipCode', 'emergencyContactName',
      'emergencyContactPhone', 'emergencyContactRelation',
      'heightFeet', 'heightInches', 'weight', 'fitnessGoals',
      'healthConditions', 'medications', 'injuries',
      'liabilityWaiverSigned', 'photoReleaseWaiverSigned',
      'marketingOptIn', 'sessionDuration', 'sessionsPerWeek', 'paymentType',
      'gymLocationId', 'membershipType'
    ];
    const stepData = Object.fromEntries(
      Object.entries(form.getValues()).filter(([key]) => fields.includes(key))
    );

    try {
      if (currentStep === 1) {
        await step1Schema.parseAsync(stepData);
      } else if (currentStep === 2) {
        await onboardingSchema.parseAsync(stepData);
      } else if (currentStep === 3) {
        await onboardingSchema.parseAsync(stepData);

        if (stepData.liabilityWaiverSigned && !liabilitySignaturePad.current?.toData().length) {
          toast({
            title: "Signature Required",
            description: "Please sign the liability waiver before proceeding.",
            variant: "destructive",
          });
          return;
        }
        if (stepData.photoReleaseWaiverSigned && !photoReleaseSignaturePad.current?.toData().length) {
          toast({
            title: "Signature Required",
            description: "Please sign the photo release waiver before proceeding.",
            variant: "destructive",
          });
          return;
        }
      } else if (currentStep === 4) {
        const finalData = form.getValues();
        await onSubmit(finalData);
        return;
      }

      setCurrentStep((prev) => prev + 1);
    } catch (error) {
      console.error("Validation error:", error);
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          if (err.path) {
            form.setError(err.path[0] as any, {
              message: err.message,
            });
          }
        });
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const onSubmit = async (data: OnboardingForm) => {
    try {
      setIsSubmitting(true);
      console.log('Form submission started');

      // Validate form data
      try {
        validateFormData(data);
      } catch (error) {
        const errors = JSON.parse((error as Error).message);
        Object.entries(errors).forEach(([field, message]) => {
          form.setError(field as any, { message: message as string});
        });
        throw new Error("Form validation failed");
      }

      console.log('Submitting form data:', data);

      // Prepare user data
      const userData = {
        email: data.email,
        password: "temporary123", // This should be changed on first login
        role: "user",
        name: `${data.firstName}${data.middleInitial ? ` ${data.middleInitial}` : ''} ${data.lastName}`,
      };

      // Create user account with timeout and retry
      const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 5000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      };

      const maxRetries = 3;
      let userResponse;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          userResponse = await fetchWithTimeout('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
          });

          if (!userResponse.ok) {
            const errorText = await userResponse.text();
            throw new Error(errorText);
          }

          break;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      const newUser = await userResponse.json();
      const userId = newUser.id;

      // Create member profile
      const memberData = {
        userId,
        ...data,
        startDate: new Date().toISOString(),
        membershipStatus: 'active',
      };

      let memberResponse;
      retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          memberResponse = await fetchWithTimeout('/api/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memberData),
          });

          if (!memberResponse.ok) {
            const memberResponseText = await memberResponse.text();
            throw new Error(memberResponseText);
          }

          break;
        } catch (e) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw e;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      const newMember = await memberResponse.json();

      // Save signature data if available
      if (liabilitySignaturePad.current?.toData().length) {
        const signatureData = {
          memberId: newMember.id,
          userId,
          signatureType: 'liability',
          signatureData: liabilitySignaturePad.current.toDataURL(),
          timestamp: new Date().toISOString(),
        };

        let profileResponse;
        retryCount = 0;

        while (retryCount < maxRetries) {
          try {
            profileResponse = await fetchWithTimeout('/api/signatures', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(signatureData),
            });

            if (!profileResponse.ok) {
              const profileResponseText = await profileResponse.text();
              throw new Error(profileResponseText);
            }

            break;
          } catch (error) {
            toast({
              title: "Warning",
              description: "Failed to save liability signature, but member was created",
              variant: "warning",
            });
            console.error('Error saving liability signature:', error);
            break;
          }
        }
      }

      if (photoReleaseSignaturePad.current?.toData().length) {
        const signatureData = {
          memberId: newMember.id,
          userId,
          signatureType: 'photo_release',
          signatureData: photoReleaseSignaturePad.current.toDataURL(),
          timestamp: new Date().toISOString(),
        };

        let profileResponse;
        retryCount = 0;

        while (retryCount < maxRetries) {
          try {
            profileResponse = await fetchWithTimeout('/api/signatures', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(signatureData),
            });

            if (!profileResponse.ok) {
              const profileResponseText = await profileResponse.text();
              throw new Error(profileResponseText);
            }

            break;
          } catch (error) {
            toast({
              title: "Warning",
              description: "Failed to save photo release signature, but member was created",
              variant: "warning",
            });
            console.error('Error saving photo release signature:', error);
            break;
          }
        }
      }

      toast({
        title: "Success",
        description: "Member onboarding completed successfully",
      });

      navigate('/member/' + newMember.id + '/profile');
    } catch (error) {
      console.error('Error during member onboarding:', error);
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create member",
        variant: "destructive",
      });
    }
  };

  if (!user || user.role !== "admin") {
    return <div className="p-8">Not authorized to view this page</div>;
  }

  const renderStep = () => {
    const props = { form, liabilitySignaturePad, photoReleaseSignaturePad, gymLocations };

    switch (currentStep) {
      case 1: return <PersonalInformationStep {...props} />;
      case 2: return <HealthInformationStep {...props} />;
      case 3: return <WaiversStep {...props} />;
      case 4: return <PackageSelectionStep {...props} />;
      default: return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="container max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/gym-members">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Member Onboarding</h1>
          <p className="text-muted-foreground">Complete the member registration process</p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step {currentStep} of 4</CardTitle>
              <CardDescription>
                {currentStep === 1 && "Personal Information"}
                {currentStep === 2 && "Physical Information & Health"}
                {currentStep === 3 && "Waivers & Agreements"}
                {currentStep === 4 && "Training & Membership"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                  {renderStep()}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    {currentStep > 1 && (
                      <Button type="button" variant="outline" onClick={handlePrevious} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Previous
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleNext}
                      className={cn("ml-auto gap-2", { "ml-0": currentStep === 1 })}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {currentStep === 4 ? "Submitting..." : "Next"}
                        </>
                      ) : (
                        currentStep === 4 ? "Complete Onboarding" : "Next"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
}