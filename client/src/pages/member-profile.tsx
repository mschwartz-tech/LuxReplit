import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { Member, MemberProfile } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: member, isLoading: memberLoading } = useQuery<Member>({
    queryKey: [`/api/members/${id}`],
    enabled: !!user && isAdmin && !!id,
  });

  const { data: profile, isLoading: profileLoading } = useQuery<MemberProfile>({
    queryKey: [`/api/members/${id}/profile`],
    enabled: !!user && isAdmin && !!id,
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

  return (
    <div className="flex-1 relative p-8">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Member Profile</CardTitle>
            <CardDescription>View and manage member information</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
