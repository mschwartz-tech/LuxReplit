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
  height: z.string().optional(),
  weight: z.string().optional(),
  fitnessGoals: z.array(z.string()).optional(),
  healthConditions: z.array(z.string()).optional(),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().min(5, "Zip code must be at least 5 digits").optional(),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

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
      height: profile?.height,
      weight: profile?.weight,
      fitnessGoals: profile?.fitnessGoals,
      healthConditions: profile?.healthConditions,
      phoneNumber: profile?.phoneNumber,
      address: profile?.address,
      city: profile?.city,
      state: profile?.state,
      zipCode: profile?.zipCode,
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
                            defaultValue={field.value}
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
                            defaultValue={field.value}
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
                      <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {profile.birthDate && (
                          <div>
                            <span className="text-sm text-muted-foreground">Birth Date:</span>
                            <p className="font-medium">
                              {new Date(profile.birthDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {profile.gender && (
                          <div>
                            <span className="text-sm text-muted-foreground">Gender:</span>
                            <p className="font-medium capitalize">{profile.gender}</p>
                          </div>
                        )}
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
                      <h3 className="text-lg font-semibold mb-2">Health Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {profile.height && (
                          <div>
                            <span className="text-sm text-muted-foreground">Height:</span>
                            <p className="font-medium">{profile.height}</p>
                          </div>
                        )}
                        {profile.weight && (
                          <div>
                            <span className="text-sm text-muted-foreground">Weight:</span>
                            <p className="font-medium">{profile.weight}</p>
                          </div>
                        )}
                        {profile.fitnessGoals && profile.fitnessGoals.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-sm text-muted-foreground">Fitness Goals:</span>
                            <ul className="list-disc list-inside mt-1">
                              {profile.fitnessGoals.map((goal, index) => (
                                <li key={index} className="font-medium">{goal}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {profile.healthConditions && profile.healthConditions.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-sm text-muted-foreground">Health Conditions:</span>
                            <ul className="list-disc list-inside mt-1">
                              {profile.healthConditions.map((condition, index) => (
                                <li key={index} className="font-medium">{condition}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Emergency Contact</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {profile.emergencyContactName && (
                          <div>
                            <span className="text-sm text-muted-foreground">Name:</span>
                            <p className="font-medium">{profile.emergencyContactName}</p>
                          </div>
                        )}
                        {profile.emergencyContactPhone && (
                          <div>
                            <span className="text-sm text-muted-foreground">Phone:</span>
                            <p className="font-medium">{profile.emergencyContactPhone}</p>
                          </div>
                        )}
                        {profile.emergencyContactRelation && (
                          <div>
                            <span className="text-sm text-muted-foreground">Relation:</span>
                            <p className="font-medium">{profile.emergencyContactRelation}</p>
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