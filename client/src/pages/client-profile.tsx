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
import { ArrowLeft, Calendar, Download, Dumbbell, LineChart, Camera, Receipt } from "lucide-react";
import { useLocation, Link } from "wouter";
import { Member, MemberProfile, MemberAssessment, Invoice } from "@shared/schema";
import { format, subDays } from "date-fns";
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProgressChart } from "@/components/ui/progress-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Measurements {
  chest?: number;
  waist?: number;
  hips?: number;
  thighs?: number;
  arms?: number;
}

interface ChartData {
  progressDate: Date;
  measurements: Measurements;
  weight: string;
  bodyFatPercentage?: string;
}

export default function ClientProfilePage() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const clientId = parseInt(location.split('/').pop() || '0');
  const isAdmin = user?.role === "admin";
  const isTrainer = user?.role === "trainer";
  const [comparisonDate, setComparisonDate] = useState<Date | undefined>(undefined);

  const { data: member, isLoading: isLoadingMember } = useQuery<Member>({
    queryKey: [`/api/members/${clientId}`],
    enabled: !!clientId && (isAdmin || isTrainer),
  });

  const { data: profile, isLoading: isLoadingProfile } = useQuery<MemberProfile>({
    queryKey: [`/api/members/${clientId}/profile`],
    enabled: !!clientId && (isAdmin || isTrainer),
  });

  const { data: assessments, isLoading: isLoadingAssessments } = useQuery<MemberAssessment[]>({
    queryKey: [`/api/members/${clientId}/assessments`],
    enabled: !!clientId && (isAdmin || isTrainer),
  });

  const { data: invoices, isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: [`/api/members/${clientId}/invoices`],
    enabled: !!clientId && isAdmin,
  });

  if (!user || (!isAdmin && !isTrainer)) {
    return <div className="p-8">Not authorized to view this page</div>;
  }

  if (isLoadingMember || isLoadingProfile || isLoadingAssessments || (isAdmin && isLoadingInvoices)) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!member) {
    return <div className="p-8">Client not found</div>;
  }

  const chartData: ChartData[] = assessments?.map(assessment => ({
    progressDate: new Date(assessment.assessmentDate),
    measurements: assessment.measurements as Measurements,
    weight: assessment.weight || '0',
    bodyFatPercentage: assessment.bodyFatPercentage
  })) || [];

  const exportProgress = () => {
    const data = assessments?.map(assessment => ({
      date: format(new Date(assessment.assessmentDate), 'yyyy-MM-dd'),
      ...assessment.measurements,
      weight: assessment.weight,
      bodyFatPercentage: assessment.bodyFatPercentage,
      notes: assessment.notes
    }));

    const csv = [
      ['Date', 'Weight', 'Body Fat %', 'Chest', 'Waist', 'Hips', 'Thighs', 'Arms', 'Notes'].join(','),
      ...data.map(row => [
        row.date,
        row.weight || '',
        row.bodyFatPercentage || '',
        row.chest || '',
        row.waist || '',
        row.hips || '',
        row.thighs || '',
        row.arms || '',
        `"${row.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="flex flex-col gap-6">
        <Button
          variant="ghost"
          className="w-fit"
          onClick={() => setLocation("/training-clients")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Training Clients
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Client #{member.id}</h1>
            <p className="text-muted-foreground">
              Member since {format(new Date(member.createdAt), 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/training-management?client=${member.id}`}>
              <Button variant="outline" className="gap-2">
                <Dumbbell className="h-4 w-4" />
                Training Plans
              </Button>
            </Link>
            <Link href={`/schedule?client=${member.id}`}>
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="progress">Progress Photos</TabsTrigger>
            {isAdmin && <TabsTrigger value="billing">Billing</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Height</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.height ? `${profile.height} cm` : 'Not recorded'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Weight</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.weight ? `${profile.weight} kg` : 'Not recorded'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium">Goals</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.fitnessGoals || 'No goals recorded'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Health Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Health Conditions</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.medicalConditions || 'No health conditions recorded'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium">Emergency Contact</p>
                    {profile?.emergencyContactName ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Name: {profile.emergencyContactName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Phone: {profile.emergencyContactPhone}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Relation: {profile.emergencyContactRelation}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No emergency contact recorded</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assessments">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Progress Overview</CardTitle>
                      <CardDescription>
                        Track measurements and body composition over time
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setComparisonDate(subDays(new Date(), 30))}
                      >
                        Compare to Last Month
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportProgress}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export Data
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <ProgressChart
                      data={chartData}
                      metric="measurements"
                      title="Body Measurements"
                      description="Track changes in body measurements over time"
                      comparisonDate={comparisonDate}
                    />
                    <ProgressChart
                      data={chartData}
                      metric="weight"
                      title="Weight Progress"
                      description="Track weight changes over time"
                      comparisonDate={comparisonDate}
                    />
                    <ProgressChart
                      data={chartData}
                      metric="bodyFat"
                      title="Body Fat Percentage"
                      description="Track body composition changes"
                      comparisonDate={comparisonDate}
                      className="md:col-span-2"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assessment History</CardTitle>
                  <CardDescription>
                    Detailed assessment records
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {!assessments?.length ? (
                      <p className="text-center text-muted-foreground py-8">
                        No assessments recorded yet.
                      </p>
                    ) : (
                      <div className="space-y-8">
                        {assessments?.map((assessment) => {
                          const measurements = assessment.measurements as Measurements;
                          return (
                            <div key={assessment.id} className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h3 className="font-medium">
                                  Assessment on {format(new Date(assessment.assessmentDate), 'MMMM d, yyyy')}
                                </h3>
                                <LineChart className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <p className="text-sm font-medium">Measurements</p>
                                  <div className="space-y-2 mt-2">
                                    {Object.entries(measurements).map(([key, value]) => (
                                      <div key={key} className="flex justify-between">
                                        <span className="text-sm text-muted-foreground capitalize">
                                          {key}
                                        </span>
                                        <span className="text-sm">{value ? `${value} cm` : 'Not recorded'}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Other Metrics</p>
                                  <div className="space-y-2 mt-2">
                                    <div className="flex justify-between">
                                      <span className="text-sm text-muted-foreground">Weight</span>
                                      <span className="text-sm">{assessment.weight} kg</span>
                                    </div>
                                    {assessment.bodyFatPercentage && (
                                      <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Body Fat %</span>
                                        <span className="text-sm">{assessment.bodyFatPercentage}%</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {assessment.notes && (
                                <div>
                                  <p className="text-sm font-medium">Notes</p>
                                  <p className="text-sm text-muted-foreground mt-1">{assessment.notes}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Progress Photos</CardTitle>
                    <CardDescription>
                      Visual progress tracking through photos
                    </CardDescription>
                  </div>
                  <Button variant="outline" className="gap-2">
                    <Camera className="h-4 w-4" />
                    Add Photos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Progress photo feature coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Billing History</CardTitle>
                      <CardDescription>
                        View and manage client's invoices and payments
                      </CardDescription>
                    </div>
                    <Button variant="outline" className="gap-2">
                      <Receipt className="h-4 w-4" />
                      New Invoice
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!invoices?.length ? (
                    <p className="text-center text-muted-foreground py-8">
                      No invoices found for this client
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>#{invoice.id}</TableCell>
                            <TableCell>{format(new Date(invoice.createdAt), 'MMM d, yyyy')}</TableCell>
                            <TableCell>{invoice.description}</TableCell>
                            <TableCell>${Number(invoice.amount).toFixed(2)}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                invoice.status === 'paid'
                                  ? 'bg-green-50 text-green-700'
                                  : invoice.status === 'pending'
                                  ? 'bg-yellow-50 text-yellow-700'
                                  : 'bg-red-50 text-red-700'
                              }`}>
                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell>{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}