import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, PencilIcon, XIcon } from "lucide-react";
import { Member, MemberProfile } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Updated validation schema to include all member fields
const editProfileSchema = z.object({
  // Basic Information
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  middleInitial: z.string().max(1, "Middle initial should be a single character").optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  birthMonth: z.number().min(1).max(12),
  birthDay: z.number().min(1).max(31),
  birthYear: z.number().min(1900).max(new Date().getFullYear()),
  gender: z.string(),
  username: z.string().min(3, "Username must be at least 3 characters"),

  // Emergency Contact
  emergencyContactName: z.string(),
  emergencyContactPhone: z.string().min(10, "Emergency contact phone must be at least 10 digits"),
  emergencyContactRelation: z.string(),

  // Membership Details
  membershipType: z.enum(['luxe_essentials', 'luxe_strive', 'luxe_all_access']),
  membershipStatus: z.enum(['active', 'suspended', 'cancelled']),

  // Physical Information
  heightFeet: z.number().min(1, "Feet must be at least 1").max(9, "Feet cannot exceed 9"),
  heightInches: z.number().min(0, "Inches must be at least 0").max(11, "Inches cannot exceed 11"),
  weight: z.string(),

  // Health Information
  fitnessGoals: z.array(z.string()).min(1, "At least one goal is required"),
  healthConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  injuries: z.array(z.string()).optional(),

  // Contact Information
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string().min(5, "Zip code must be at least 5 digits"),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

const FITNESS_GOALS = [
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
];

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const [isEditing, setIsEditing] = useState(false);

  const { data: member, isLoading: memberLoading } = useQuery<Member>({
    queryKey: [`/api/members/${id}`],
    enabled: !!user && isAdmin && !!id,
  });

  const { data: profile, isLoading: profileLoading } = useQuery<MemberProfile>({
    queryKey: [`/api/members/${id}/profile`],
    enabled: !!user && isAdmin && !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditProfileForm) => {
      const response = await fetch(`/api/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/members/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/members/${id}/profile`] });
      toast({
        title: "Success",
        description: "Member profile updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const form = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      // Basic Information
      firstName: member?.firstName,
      middleInitial: member?.middleInitial,
      lastName: member?.lastName,
      email: member?.email,
      birthMonth: profile?.birthMonth,
      birthDay: profile?.birthDay,
      birthYear: profile?.birthYear,
      gender: profile?.gender,
      username: member?.username,

      // Emergency Contact
      emergencyContactName: profile?.emergencyContactName,
      emergencyContactPhone: profile?.emergencyContactPhone,
      emergencyContactRelation: profile?.emergencyContactRelation,

      // Membership Details
      membershipType: member?.membershipType,
      membershipStatus: member?.membershipStatus,

      // Physical Information
      heightFeet: profile?.heightFeet || undefined,
      heightInches: profile?.heightInches || undefined,
      weight: profile?.weight || undefined,

      // Health Information
      fitnessGoals: profile?.fitnessGoals || [],
      healthConditions: profile?.healthConditions || [],
      medications: profile?.medications || [],
      injuries: profile?.injuries || [],

      // Contact Information
      phoneNumber: profile?.phoneNumber || undefined,
      address: profile?.address || undefined,
      city: profile?.city || undefined,
      state: profile?.state || undefined,
      zipCode: profile?.zipCode || undefined,
    },
  });

  if (!user || !isAdmin) {
    return <div className="p-8">Not authorized to view this page</div>;
  }

  if (memberLoading || profileLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!member) {
    return <div className="p-8">Member not found</div>;
  }

  const onSubmit = (data: EditProfileForm) => {
    updateMutation.mutate(data);
  };

  return (
    <div className="flex-1 relative p-8">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Member Profile</CardTitle>
              <CardDescription>View and manage member information</CardDescription>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <XIcon className="h-4 w-4" />
                ) : (
                  <PencilIcon className="h-4 w-4" />
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                    <div className="grid grid-cols-6 gap-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
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
                              <Input maxLength={1} {...field} />
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
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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
                                  <SelectTrigger>
                                    <SelectValue placeholder="Month" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                    <SelectItem key={month} value={month.toString()}>
                                      {format(new Date(2024, month - 1, 1), 'MMMM')}
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
                                  <SelectTrigger>
                                    <SelectValue placeholder="Day" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
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
                                  <SelectTrigger>
                                    <SelectValue placeholder="Year" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.from(
                                    { length: new Date().getFullYear() - 1900 + 1 },
                                    (_, i) => new Date().getFullYear() - i
                                  ).map((year) => (
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
                  </div>

                  {/* Emergency Contact Section */}
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
                              <Input {...field} />
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
                              <Input {...field} />
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
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="membershipType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Membership Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select membership type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="luxe_essentials">Luxe Essentials</SelectItem>
                              <SelectItem value="luxe_strive">Luxe Strive</SelectItem>
                              <SelectItem value="luxe_all_access">Luxe All Access</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="membershipStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Membership Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="fitnessGoals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fitness Goals</FormLabel>
                        <FormDescription>Select your primary fitness objectives</FormDescription>
                        <div className="grid md:grid-cols-2 gap-2 mt-2">
                          {FITNESS_GOALS.map((goal) => (
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

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="healthConditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Health Conditions</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter health conditions (one per line)"
                              value={Array.isArray(field.value) ? field.value.join('\n') : ''}
                              onChange={(e) => {
                                const conditions = e.target.value
                                  .split('\n')
                                  .map(condition => condition.trim())
                                  .filter(Boolean);
                                field.onChange(conditions);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medications</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter medications (one per line)"
                              value={Array.isArray(field.value) ? field.value.join('\n') : ''}
                              onChange={(e) => {
                                const medications = e.target.value
                                  .split('\n')
                                  .map(medication => medication.trim())
                                  .filter(Boolean);
                                field.onChange(medications);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="injuries"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Injuries</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter injuries (one per line)"
                              value={Array.isArray(field.value) ? field.value.join('\n') : ''}
                              onChange={(e) => {
                                const injuries = e.target.value
                                  .split('\n')
                                  .map(injury => injury.trim())
                                  .filter(Boolean);
                                field.onChange(injuries);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Input {...field} />
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
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <p className="font-medium">
                        {member.firstName}
                        {member.middleInitial && ` ${member.middleInitial}.`}
                        {` ${member.lastName}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Username:</span>
                      <p className="font-medium">{member.username}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <p className="font-medium">{member.email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Gender:</span>
                      <p className="font-medium capitalize">{profile?.gender}</p>
                    </div>
                    {profile?.birthMonth && profile?.birthDay && profile?.birthYear && (
                      <div>
                        <span className="text-sm text-muted-foreground">Date of Birth:</span>
                        <p className="font-medium">
                          {format(
                            new Date(profile.birthYear, profile.birthMonth - 1, profile.birthDay),
                            'MMMM d, yyyy'
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Emergency Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {profile?.emergencyContactName && (
                      <div>
                        <span className="text-sm text-muted-foreground">Contact Name:</span>
                        <p className="font-medium">{profile.emergencyContactName}</p>
                      </div>
                    )}
                    {profile?.emergencyContactRelation && (
                      <div>
                        <span className="text-sm text-muted-foreground">Relationship:</span>
                        <p className="font-medium">{profile.emergencyContactRelation}</p>
                      </div>
                    )}
                    {profile?.emergencyContactPhone && (
                      <div>
                        <span className="text-sm text-muted-foreground">Contact Phone:</span>
                        <p className="font-medium">{profile.emergencyContactPhone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Membership Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <p className="font-medium capitalize">{member.membershipStatus}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <p className="font-medium capitalize">{member.membershipType}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Start Date:</span>
                      <p className="font-medium">
                        {new Date(member.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    {member.endDate && (
                      <div>
                        <span className="text-sm text-muted-foreground">End Date:</span>
                        <p className="font-medium">
                          {new Date(member.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {profile && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Physical Information</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {(profile.heightFeet || profile.heightInches) && (
                          <div>
                            <span className="text-sm text-muted-foreground">Height:</span>
                            <p className="font-medium">
                              {profile.heightFeet}'{profile.heightInches}"
                            </p>
                          </div>
                        )}
                        {profile.weight && (
                          <div>
                            <span className="text-sm text-muted-foreground">Weight:</span>
                            <p className="font-medium">{profile.weight} lbs</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {profile.phoneNumber && (
                          <div>
                            <span className="text-sm text-muted-foreground">Phone:</span>
                            <p className="font-medium">{profile.phoneNumber}</p>
                          </div>
                        )}
                        {profile.address && (
                          <div>
                            <span className="text-sm text-muted-foreground">Address:</span>
                            <p className="font-medium">
                              {profile.address}
                              {profile.city && `, ${profile.city}`}
                              {profile.state && `, ${profile.state}`}
                              {profile.zipCode && ` ${profile.zipCode}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Fitness Profile</h3>
                      <div className="space-y-4">
                        {profile.fitnessGoals && profile.fitnessGoals.length > 0 && (
                          <div>
                            <span className="text-sm text-muted-foreground">Fitness Goals:</span>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              {profile.fitnessGoals.map((goalId) => (
                                <p key={goalId} className="font-medium">
                                  {FITNESS_GOALS.find(g => g.id === goalId)?.label || goalId}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {profile.healthConditions && profile.healthConditions.length > 0 && (
                          <div>
                            <span className="text-sm text-muted-foreground">Health Conditions:</span>
                            <ul className="list-disc list-inside mt-1">
                              {profile.healthConditions.map((condition, index) => (
                                <li key={index} className="font-medium">{condition}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {profile.medications && profile.medications.length > 0 && (
                          <div>
                            <span className="text-sm text-muted-foreground">Medications:</span>
                            <ul className="list-disc list-inside mt-1">
                              {profile.medications.map((medication, index) => (
                                <li key={index} className="font-medium">{medication}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {profile.injuries && profile.injuries.length > 0 && (
                          <div>
                            <span className="text-sm text-muted-foreground">Injuries:</span>
                            <ul className="list-disc list-inside mt-1">
                              {profile.injuries.map((injury, index) => (
                                <li key={index} className="font-medium">{injury}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}