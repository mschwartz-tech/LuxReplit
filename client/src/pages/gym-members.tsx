import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Search, Filter, User, Calendar, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Member } from "@shared/schema";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Link } from "wouter";

export default function GymMembersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "suspended">("all");

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    enabled: !!user && isAdmin,
  });

  const filteredMembers = members?.filter(member =>
    (statusFilter === "all" || member.membershipStatus === statusFilter) &&
    (searchQuery === "" || 
     `Member #${member.id}`.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!user || !isAdmin) {
    return <div className="p-8">Not authorized to view this page</div>;
  }

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {/* Background container with logo */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.15] dark:opacity-[0.08]"
        style={{
          backgroundImage: 'url("/assets/branding/logoinvisicon.svg")',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          filter: 'grayscale(0.5)'
        }}
      />

      {/* Content overlay */}
      <div className="relative z-10 p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-3xl font-bold tracking-tight">Gym Members</h1>
            </div>
            <p className="text-muted-foreground">
              Manage gym memberships and member information
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Member
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                Active Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>
                Inactive Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("suspended")}>
                Suspended Members
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Members Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {!filteredMembers || filteredMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 col-span-full">
              No members found.
            </p>
          ) : (
            filteredMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Member #{member.id}</CardTitle>
                  <CardDescription>
                    Status: <span className={`font-medium ${
                      member.membershipStatus === 'active' ? 'text-green-500' : 
                      member.membershipStatus === 'suspended' ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {member.membershipStatus.charAt(0).toUpperCase() + member.membershipStatus.slice(1)}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Membership:</span>
                      <span className="text-sm font-medium capitalize">
                        {member.membershipType}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Start Date:</span>
                      <span className="text-sm font-medium">
                        {new Date(member.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    {member.endDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">End Date:</span>
                        <span className="text-sm font-medium">
                          {new Date(member.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Link href={`/member/${member.id}/profile`}>
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <User className="h-4 w-4" />
                          Profile
                        </Button>
                      </Link>
                      <Link href={`/schedule?member=${member.id}`}>
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <Calendar className="h-4 w-4" />
                          Schedule
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}