import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export interface DashboardMetrics {
  totalCustomers: number;
  activeSubscriptions: number;
  todaysOrders: number;
  todaysDeliveries: number;
  pendingPayments: number;
  completedPayments: number;
  cancelledOrders: number;
  totalSales: string | number;
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => (await api.get<DashboardMetrics>("/admin/dashboard")).data,
    refetchInterval: 60_000,
  });
}

export function useAdminOrders(params: { status?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "orders", params],
    queryFn: async () => (await api.get("/admin/orders", { params })).data,
  });
}

export function useAdminSubscriptions(params: { status?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "subscriptions", params],
    queryFn: async () => (await api.get("/admin/subscriptions", { params })).data,
  });
}

export function useAdminDeliveries(params: { status?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "deliveries", params],
    queryFn: async () => (await api.get("/admin/deliveries", { params })).data,
  });
}

export function useAdminDeliveryPersons() {
  return useQuery({
    queryKey: ["admin", "delivery-persons"],
    queryFn: async () => (await api.get("/admin/delivery-persons")).data,
  });
}

export function useCreateDeliveryPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; mobile: string; password: string }) =>
      (await api.post("/admin/delivery-persons", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "delivery-persons"] }),
  });
}

export function useAssignOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, deliveryPersonId }: { orderId: string; deliveryPersonId: string }) =>
      (await api.post(`/admin/orders/${orderId}/assign`, { deliveryPersonId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });
}

export function useAdminCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) =>
      (await api.post(`/admin/orders/${id}/cancel`, { reason })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });
}

export function useAdminProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products")).data,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      unit: string;
      price: number;
      subscriptionAvailable: boolean;
    }) => (await api.post("/products", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; price?: number; status?: string }) =>
      (await api.patch(`/products/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useAdminPayments(params: { status?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "payments", params],
    queryFn: async () => (await api.get("/admin/payments", { params })).data,
  });
}

export function useSalesReport(params: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "reports", "sales", params],
    queryFn: async () => (await api.get("/admin/reports/sales", { params })).data,
  });
}

export function useOrdersReport(params: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "reports", "orders", params],
    queryFn: async () => (await api.get("/admin/reports/orders", { params })).data,
  });
}

export function useSubscriptionsReport(params: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "reports", "subscriptions", params],
    queryFn: async () => (await api.get("/admin/reports/subscriptions", { params })).data,
  });
}

export function usePaymentsReport(params: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "reports", "payments", params],
    queryFn: async () => (await api.get("/admin/reports/payments", { params })).data,
  });
}

export interface BusinessSettings {
  deliveryRadiusKm: number;
  businessLatitude: number;
  businessLongitude: number;
  timezone: string;
  sameDayOrderCutoff: string;
  deliveryStartTime: string;
  deliveryEndTime: string;
  skipDeadlineTime: string;
}

export function useBusinessSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => (await api.get<BusinessSettings>("/admin/settings")).data,
  });
}

export function useUpdateBusinessSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<BusinessSettings>) => (await api.patch("/admin/settings", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
}
