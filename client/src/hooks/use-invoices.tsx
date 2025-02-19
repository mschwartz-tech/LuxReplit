import { Invoice, InsertInvoice } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useInvoices() {
  return useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    retry: false
  });
}

export function useInvoice(id: number) {
  return useQuery<Invoice>({
    queryKey: ["/api/invoices", id],
    retry: false,
    enabled: !!id
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: InsertInvoice) => {
      const response = await apiRequest("/api/invoices", {
        method: "POST",
        body: JSON.stringify(invoice),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    }
  });
}