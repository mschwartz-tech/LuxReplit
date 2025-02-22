import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Enhanced payment schema with better validation
const paymentSchema = z.object({
  memberId: z.string().optional()
    .transform(val => val === '' ? undefined : val)
    .refine(val => !val || /^\d+$/.test(val), {
      message: "Member ID must be a valid number",
    })
    .transform(val => val ? parseInt(val) : undefined),
  amount: z.number().positive("Amount must be greater than 0").or(
    z.string()
      .min(1, "Amount is required")
      .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Amount must be a positive number",
      })
      .transform(val => parseFloat(val))
  ),
  paymentMethod: z.enum(["credit_card", "debit_card", "bank_transfer", "cash"], {
    required_error: "Payment method is required",
  }),
  description: z.string().min(1, "Description is required").max(255, "Description is too long"),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";
  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "cash",
      description: "",
      amount: 0,
      memberId: "",
    },
  });

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: !!user,
  });

  const createPayment = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      console.log("Starting payment submission with data:", data);

      const paymentData = {
        memberId: data.memberId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        description: data.description,
        status: "pending"
      };

      console.log("Formatted payment data:", paymentData);

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(paymentData),
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorMessage = "Failed to create payment";
        try {
          if (contentType?.includes("application/json")) {
            const errorData = await response.json();
            console.error("API error response:", errorData);
            errorMessage = errorData.message || errorMessage;
          } else {
            const errorText = await response.text();
            console.error("API error text:", errorText);
            errorMessage = "Server error occurred. Please try again.";
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          errorMessage = "An unexpected error occurred";
        }
        throw new Error(errorMessage);
      }

      try {
        const result = await response.json();
        console.log("Payment creation successful:", result);
        return result;
      } catch (error) {
        console.error("Error parsing success response:", error);
        throw new Error("Invalid response format from server");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setIsNewPaymentOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Payment has been successfully recorded.",
      });
    },
    onError: (error: Error) => {
      console.error("Payment creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: PaymentFormValues) => {
    try {
      console.log("Form submission started with data:", data);
      await createPayment.mutateAsync(data);
    } catch (error) {
      console.error("Payment submission error:", error);
    }
  };

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
        <Link href="/">
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>View payment history</CardDescription>
              </div>
              <Dialog open={isNewPaymentOpen} onOpenChange={setIsNewPaymentOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Payment</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="memberId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Member ID (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value)}
                                placeholder="Leave empty for non-member payment"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? 0 : parseFloat(value));
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Method</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="credit_card">Credit Card</SelectItem>
                                <SelectItem value="debit_card">Debit Card</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Payment description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createPayment.isPending}
                      >
                        {createPayment.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Payment
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
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
                        {payment.memberId ? `Member ID: ${payment.memberId}` : 'Non-member payment'}
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