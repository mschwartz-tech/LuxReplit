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

// Validation schema for editable fields
const editProfileSchema = z.object({
  membershipType: z.enum(['luxe_essentials', 'luxe_strive', 'luxe_all_access']),
  membershipStatus: z.enum(['active', 'suspended', 'cancelled']),
  heightFeet: z.number().min(1, "Feet must be at least 1").max(9, "Feet cannot exceed 9"),
  heightInches: z.number().min(0, "Inches must be at least 0").max(11, "Inches cannot exceed 11"),
  weight: z.string(),
  fitnessGoals: z.array(z.string()).min(1, "At least one goal is required"),
  healthConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  injuries: z.array(z.string()).optional(),
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
      membershipType: member?.membershipType,
      membershipStatus: member?.membershipStatus,
      heightFeet: profile?.heightFeet || undefined,
      heightInches: profile?.heightInches || undefined,
      weight: profile?.weight || undefined,
      fitnessGoals: profile?.fitnessGoals || [],
      healthConditions: profile?.healthConditions || [],
      medications: profile?.medications || [],
      injuries: profile?.injuries || [],
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