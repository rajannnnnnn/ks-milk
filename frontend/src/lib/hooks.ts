import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  unit: string;
  subscriptionAvailable: boolean;
  price: string;
}

export interface Address {
  id: string;
  label?: string | null;
  name: string;
  mobile: string;
  houseNo: string;
  street: string;
  area: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface OrderItem {
  id: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface Order {
  id: string;
  status: string;
  scheduledDeliveryDate: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  subtotal: string;
  deliveryCharge: string;
  taxAmount: string;
  totalAmount: string;
  createdAt: string;
  items: OrderItem[];
}

export interface Subscription {
  id: string;
  productId: string;
  quantity: number;
  plan: "MONTHLY" | "QUARTERLY" | "YEARLY";
  startDate: string;
  endDate: string;
  status: string;
  product?: Product;
  createdAt: string;
}

export interface SubscriptionDelivery {
  id: string;
  scheduledDate: string;
  quantity: number;
  unitPrice: string;
  status: string;
  reason?: string | null;
  billable: boolean;
}

export interface Bill {
  id: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  billableDays: number;
  skippedDays: number;
  pausedDays: number;
  nonDeliveryDays: number;
  subtotal: string;
  totalAmount: string;
  status: string;
  billDate: string;
  subscription?: Subscription;
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get<Product[]>("/products")).data,
  });
}

export function useAddresses() {
  return useQuery({
    queryKey: ["addresses"],
    queryFn: async () => (await api.get<Address[]>("/addresses")).data,
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Address, "id" | "isDefault"> & { isDefault?: boolean }) =>
      (await api.post<Address>("/addresses", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await api.get<Order[]>("/orders")).data,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: async () => (await api.get<Order>(`/orders/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { addressId: string; items: { productId: string; quantity: number }[] }) =>
      (await api.post<Order>("/orders", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) =>
      (await api.post(`/orders/${id}/cancel`, { reason })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useSubscriptions() {
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => (await api.get<Subscription[]>("/subscriptions")).data,
  });
}

export function useSubscription(id: string | undefined) {
  return useQuery({
    queryKey: ["subscriptions", id],
    queryFn: async () => (await api.get<Subscription & { deliveries: SubscriptionDelivery[] }>(`/subscriptions/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      productId: string;
      addressId: string;
      quantity: number;
      plan: "MONTHLY" | "QUARTERLY" | "YEARLY";
      startDate: string;
    }) => (await api.post<Subscription>("/subscriptions", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
}

export function useSkipDelivery(subscriptionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scheduledDate: string) =>
      (await api.post(`/subscriptions/${subscriptionId}/skip`, { scheduledDate })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions", subscriptionId] }),
  });
}

export function usePauseSubscription(subscriptionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { startDate: string; endDate: string }) =>
      (await api.post(`/subscriptions/${subscriptionId}/pause`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions", subscriptionId] }),
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/subscriptions/${id}/cancel`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
}

export function useBills() {
  return useQuery({
    queryKey: ["bills"],
    queryFn: async () => (await api.get<Bill[]>("/bills")).data,
  });
}

export function useBill(id: string | undefined) {
  return useQuery({
    queryKey: ["bills", id],
    queryFn: async () => (await api.get<Bill & { deliveries: SubscriptionDelivery[] }>(`/bills/${id}`)).data,
    enabled: !!id,
  });
}

export function usePayBill() {
  return useMutation({
    mutationFn: async (billId: string) => (await api.post(`/payments/bills/${billId}/pay`)).data,
  });
}

export function usePayOrder() {
  return useMutation({
    mutationFn: async (orderId: string) => (await api.post(`/payments/orders/${orderId}/pay`)).data,
  });
}

export function useCheckRadius() {
  return useMutation({
    mutationFn: async (payload: { latitude: number; longitude: number }) =>
      (await api.post<{ allowed: boolean; distanceKm: number; radiusKm: number }>("/addresses/check-radius", payload))
        .data,
  });
}
