import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Payment } from "@shared/schema";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

export default function BillingPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: !!user,
  });

  if (!isAdmin) {
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
    <div className="container max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8 mb-4">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Billing Management</h1>
        <p className="text-muted-foreground">View and manage payments</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>View payment history</CardDescription>
          </CardHeader>
          <CardContent>
            {payments?.length === 0 ? (
              <p className="text-muted-foreground">No payments found</p>
            ) : (
              <div className="space-y-4">
                {payments?.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        Member ID: {payment.memberId}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payment.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ${parseFloat(payment.amount.toString()).toFixed(2)}
                      </p>
                      <p className="text-sm capitalize text-muted-foreground">
                        {payment.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}