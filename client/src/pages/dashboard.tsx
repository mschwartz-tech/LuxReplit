import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { Loader2, Users, Calendar, DollarSign, BarChart, Edit2, Save } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TrainingPackage } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingRows, setEditingRows] = useState<Record<string, boolean>>({});
  const [editedValues, setEditedValues] = useState<Record<string, Partial<TrainingPackage>>>({});

  const { data: trainingPackages, isLoading: isLoadingPackages } = useQuery<TrainingPackage[]>({
    queryKey: ["/api/training-packages"],
    enabled: !!user && user.role === "admin",
  });

  const updatePackageMutation = useMutation({
    mutationFn: async (data: Partial<TrainingPackage>) => {
      const res = await apiRequest("PATCH", `/api/training-packages/${data.id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update package");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Package updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/training-packages"] });
      setEditingRows({});
      setEditedValues({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const packages60Min = trainingPackages?.filter(pkg => pkg.sessionDuration === 60).sort((a, b) => a.sessionsPerWeek - b.sessionsPerWeek) || [];
  const packages30Min = trainingPackages?.filter(pkg => pkg.sessionDuration === 30).sort((a, b) => a.sessionsPerWeek - b.sessionsPerWeek) || [];

  const handleEdit = (pkg: TrainingPackage, rowKey: string) => {
    if (editingRows[rowKey]) {
      // Save changes
      if (editedValues[rowKey]) {
        updatePackageMutation.mutate({
          id: pkg.id,
          ...editedValues[rowKey],
        });
      }
    } else {
      // Start editing
      setEditingRows(prev => ({ ...prev, [rowKey]: true }));
      setEditedValues(prev => ({
        ...prev,
        [rowKey]: {
          costPerSession: pkg.costPerSession,
          costBiWeekly: pkg.costBiWeekly,
          pifAmount: pkg.pifAmount,
        },
      }));
    }
  };

  const handleInputChange = (rowKey: string, field: keyof TrainingPackage, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [rowKey]: {
        ...prev[rowKey],
        [field]: value,
      },
    }));
  };

  const renderPackageRow = (sessionsPerWeek: number, duration: number) => {
    const pkg = (duration === 60 ? packages60Min : packages30Min).find(p => p.sessionsPerWeek === sessionsPerWeek);
    if (!pkg) return null;

    const rowKey = `${duration}-${sessionsPerWeek}`;
    const isEditing = editingRows[rowKey];
    const editedValue = editedValues[rowKey] || {};

    return (
      <tr key={rowKey} className="border-b">
        <td className="py-4 px-2">{sessionsPerWeek}X</td>
        <td className="py-4 px-2">
          {isEditing ? (
            <Input
              type="number"
              value={editedValue.costPerSession ?? pkg.costPerSession}
              onChange={(e) => handleInputChange(rowKey, "costPerSession", e.target.value)}
              className="w-24"
            />
          ) : (
            pkg.costPerSession
          )}
        </td>
        <td className="py-4 px-2">
          {isEditing ? (
            <Input
              type="number"
              value={editedValue.costBiWeekly ?? pkg.costBiWeekly}
              onChange={(e) => handleInputChange(rowKey, "costBiWeekly", e.target.value)}
              className="w-24"
            />
          ) : (
            pkg.costBiWeekly
          )}
        </td>
        <td className="py-4 px-2">
          {isEditing ? (
            <Input
              type="number"
              value={editedValue.pifAmount ?? pkg.pifAmount}
              onChange={(e) => handleInputChange(rowKey, "pifAmount", e.target.value)}
              className="w-24"
            />
          ) : (
            pkg.pifAmount
          )}
        </td>
        <td className="py-4 px-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(pkg, rowKey)}
            className="w-full gap-2"
            disabled={updatePackageMutation.isPending}
          >
            {updatePackageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEditing ? (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            ) : (
              <>
                <Edit2 className="h-4 w-4" />
                Edit
              </>
            )}
          </Button>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 relative">
        {/* Background container with logo */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.15] dark:opacity-[0.08]"
          style={{
            backgroundImage: 'url("/assets/branding/logobanner.svg")',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '90% auto',
            filter: 'grayscale(0.5)'
          }}
        />

        {/* Content overlay */}
        <main className="relative z-10 p-8 overflow-auto">
          <h1 className="text-3xl font-bold mb-8">
            Welcome back, {user.name}
          </h1>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Members
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Sessions
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$4,250</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Plans
                </CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">18</div>
              </CardContent>
            </Card>
          </div>

          {user.role === "admin" && (
            <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
              {/* 60 Minute Program Options */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">60 MINUTE PROGRAM OPTIONS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-medium text-sm">SESSIONS PER WEEK</th>
                          <th className="text-left py-2 px-2 font-medium text-sm">COST PER SESSION</th>
                          <th className="text-left py-2 px-2 font-medium text-sm">COST BI-WEEKLY</th>
                          <th className="text-left py-2 px-2 font-medium text-sm">PIF</th>
                          <th className="text-left py-2 px-2 w-20"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4].map(sessions => renderPackageRow(sessions, 60))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* 30 Minute Program Options */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">30 MINUTE PROGRAM OPTIONS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-medium text-sm">SESSIONS PER WEEK</th>
                          <th className="text-left py-2 px-2 font-medium text-sm">COST PER SESSION</th>
                          <th className="text-left py-2 px-2 font-medium text-sm">COST BI-WEEKLY</th>
                          <th className="text-left py-2 px-2 font-medium text-sm">PIF</th>
                          <th className="text-left py-2 px-2 w-20"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4].map(sessions => renderPackageRow(sessions, 30))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}