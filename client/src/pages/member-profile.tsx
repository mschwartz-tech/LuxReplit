import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, PencilIcon, XIcon, ArrowLeft } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

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
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Members
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-2"
            >
              {isEditing ? (
                <>
                  <XIcon className="h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <PencilIcon className="h-4 w-4" />
                  Edit Profile
                </>
              )}
            </Button>
          )}
        </div>

        {/* Member Status Card */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {member.firstName} {member.lastName}
                </CardTitle>
                <CardDescription>Member #{member.id}</CardDescription>
              </div>
              <Badge 
                variant={
                  member.membershipStatus === 'active' ? 'success' :
                  member.membershipStatus === 'suspended' ? 'warning' : 'destructive'
                }
                className="text-sm capitalize"
              >
                {member.membershipStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <span className="text-sm text-muted-foreground">Membership Type</span>
                <p className="font-medium capitalize">{member.membershipType.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Start Date</span>
                <p className="font-medium">{format(new Date(member.startDate), 'MMM d, yyyy')}</p>
              </div>
              {member.endDate && (
                <div>
                  <span className="text-sm text-muted-foreground">End Date</span>
                  <p className="font-medium">{format(new Date(member.endDate), 'MMM d, yyyy')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-6 gap-4">
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

                  <div className="grid md:grid-cols-2 gap-4">
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
                  </div>

                  <div>
                    <FormLabel>Date of Birth</FormLabel>
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
                </CardContent>
              </Card>

              {/* Physical Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Physical Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
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
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
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
                  </div>
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
                </CardContent>
              </Card>

              {/* Membership Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Membership Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
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
                </CardContent>
              </Card>

              {/* Action Buttons */}
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
          <div className="grid gap-6 md:grid-cols-2">
            {/* Personal Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Full Name</span>
                    <p className="font-medium">
                      {member.firstName}
                      {member.middleInitial && ` ${member.middleInitial}.`}
                      {` ${member.lastName}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Email</span>
                    <p className="font-medium">{member.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Phone</span>
                    <p className="font-medium">{profile?.phoneNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Date of Birth</span>
                    <p className="font-medium">
                      {profile?.birthDate
                        ? format(new Date(profile.birthDate), 'MMMM d, yyyy')
                        : 'Not provided'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile?.emergencyContactName ? (
                  <>
                    <div>
                      <span className="text-sm text-muted-foreground">Contact Name</span>
                      <p className="font-medium">{profile.emergencyContactName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Relationship</span>
                      <p className="font-medium">{profile.emergencyContactRelation}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Contact Phone</span>
                      <p className="font-medium">{profile.emergencyContactPhone}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">No emergency contact information provided</p>
                )}
              </CardContent>
            </Card>

            {/* Health Information Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Health Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Physical Measurements</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Height</span>
                        <span className="text-sm">
                          {profile?.heightFeet ? 
                            `${profile.heightFeet}'${profile.heightInches || 0}"` : 
                            'Not recorded'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Weight</span>
                        <span className="text-sm">
                          {profile?.weight ? `${profile.weight} lbs` : 'Not recorded'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Fitness Goals</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile?.fitnessGoals?.length ? (
                        profile.fitnessGoals.map((goal, index) => (
                          <Badge key={index} variant="secondary">
                            {goal}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No fitness goals recorded</p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Health Conditions</h4>
                  <ul className="list-disc list-inside">
                    {profile?.healthConditions?.map((condition, index) => (
                      <li key={index} className="font-medium">{condition}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Medications</h4>
                  <ul className="list-disc list-inside">
                    {profile?.medications?.map((medication, index) => (
                      <li key={index} className="font-medium">{medication}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Injuries</h4>
                  <ul className="list-disc list-inside">
                    {profile?.injuries?.map((injury, index) => (
                      <li key={index} className="font-medium">{injury}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}