import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { Loader2, Users, Calendar, DollarSign, BarChart, Save } from "lucide-react";
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
  const [editedValues, setEditedValues] = useState<Record<string, Partial<TrainingPackage>>>({});
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({
    '60min': false,
    '30min': false
  });

  const { data: trainingPackages, isLoading: isLoadingPackages } = useQuery<TrainingPackage[]>({
    queryKey: ["/api/training-packages"],
    enabled: !!user?.role === "admin",
  });

  const updatePackageMutation = useMutation({
    mutationFn: async (updates: { id: number, data: Partial<TrainingPackage> }[]) => {
      const results = await Promise.all(
        updates.map(({ id, data }) =>
          apiRequest("PATCH", `/api/training-packages/${id}`, {
            costPerSession: Number(data.costPerSession),
            costBiWeekly: Number(data.costBiWeekly),
            pifAmount: Number(data.pifAmount),
          })
        )
      );

      const errors = results.filter(r => !r.ok);
      if (errors.length > 0) {
        throw new Error("Failed to update some packages");
      }

      return results;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Packages updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/training-packages"] });
      setEditedValues({});
      setHasChanges({ '60min': false, '30min': false });
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

  if (isLoadingPackages) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!trainingPackages) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error loading training packages</div>
      </div>
    );
  }

  const packages60Min = trainingPackages.filter(pkg => pkg.sessionDuration === 60).sort((a, b) => a.sessionsPerWeek - b.sessionsPerWeek);
  const packages30Min = trainingPackages.filter(pkg => pkg.sessionDuration === 30).sort((a, b) => a.sessionsPerWeek - b.sessionsPerWeek);

  const handleInputChange = (pkg: TrainingPackage, field: keyof TrainingPackage, value: string) => {
    const rowKey = `${pkg.sessionDuration}-${pkg.sessionsPerWeek}`;
    setEditedValues(prev => ({
      ...prev,
      [rowKey]: {
        ...prev[rowKey],
        [field]: value,
      },
    }));
    setHasChanges(prev => ({
      ...prev,
      [`${pkg.sessionDuration}min`]: true
    }));
  };

  const handleSaveChanges = (duration: number) => {
    const packagesToUpdate = (duration === 60 ? packages60Min : packages30Min)
      .map(pkg => {
        const rowKey = `${pkg.sessionDuration}-${pkg.sessionsPerWeek}`;
        const changes = editedValues[rowKey];
        if (!changes) return null;

        return {
          id: pkg.id,
          data: changes,
        };
      })
      .filter((update): update is NonNullable<typeof update> => update !== null);

    if (packagesToUpdate.length > 0) {
      updatePackageMutation.mutate(packagesToUpdate);
    }
  };

  const renderPackageRow = (sessionsPerWeek: number, duration: number) => {
    const pkg = (duration === 60 ? packages60Min : packages30Min).find(p => p.sessionsPerWeek === sessionsPerWeek);
    if (!pkg) return null;

    const rowKey = `${duration}-${sessionsPerWeek}`;
    const editedValue = editedValues[rowKey] || {};

    return (
      <tr key={rowKey} className="border-b">
        <td className="py-4 px-2">{sessionsPerWeek}X</td>
        <td className="py-4 px-2">
          <Input
            type="number"
            value={editedValue.costPerSession ?? pkg.costPerSession}
            onChange={(e) => handleInputChange(pkg, "costPerSession", e.target.value)}
            className="w-24"
          />
        </td>
        <td className="py-4 px-2">
          <Input
            type="number"
            value={editedValue.costBiWeekly ?? pkg.costBiWeekly}
            onChange={(e) => handleInputChange(pkg, "costBiWeekly", e.target.value)}
            className="w-24"
          />
        </td>
        <td className="py-4 px-2">
          <Input
            type="number"
            value={editedValue.pifAmount ?? pkg.pifAmount}
            onChange={(e) => handleInputChange(pkg, "pifAmount", e.target.value)}
            className="w-24"
          />
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
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4].map(sessions => renderPackageRow(sessions, 60))}
                      </tbody>
                    </table>
                    {hasChanges['60min'] && (
                      <div className="mt-4 flex justify-end">
                        <Button 
                          onClick={() => handleSaveChanges(60)}
                          className="gap-2"
                          disabled={updatePackageMutation.isPending}
                        >
                          {updatePackageMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    )}
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
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4].map(sessions => renderPackageRow(sessions, 30))}
                      </tbody>
                    </table>
                    {hasChanges['30min'] && (
                      <div className="mt-4 flex justify-end">
                        <Button 
                          onClick={() => handleSaveChanges(30)}
                          className="gap-2"
                          disabled={updatePackageMutation.isPending}
                        >
                          {updatePackageMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    )}
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