import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./lib/auth";
import { CartProvider } from "./lib/cart";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { CustomerLayout } from "./layouts/CustomerLayout";
import { LoginPage } from "./pages/customer/LoginPage";
import { RegisterPage } from "./pages/customer/RegisterPage";
import { HomePage } from "./pages/customer/HomePage";
import { ProductsPage } from "./pages/customer/ProductsPage";
import { CartPage } from "./pages/customer/CartPage";
import { CheckoutPage } from "./pages/customer/CheckoutPage";
import { OrdersPage } from "./pages/customer/OrdersPage";
import { OrderDetailPage } from "./pages/customer/OrderDetailPage";
import { SubscriptionsPage } from "./pages/customer/SubscriptionsPage";
import { NewSubscriptionPage } from "./pages/customer/NewSubscriptionPage";
import { SubscriptionDetailPage } from "./pages/customer/SubscriptionDetailPage";
import { BillsPage } from "./pages/customer/BillsPage";
import { BillDetailPage } from "./pages/customer/BillDetailPage";
import { AddressesPage } from "./pages/customer/AddressesPage";
import { ProfilePage } from "./pages/customer/ProfilePage";

import { AdminLayout } from "./layouts/AdminLayout";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { OrdersAdminPage } from "./pages/admin/OrdersAdminPage";
import { SubscriptionsAdminPage } from "./pages/admin/SubscriptionsAdminPage";
import { ProductsAdminPage } from "./pages/admin/ProductsAdminPage";
import { DeliveriesAdminPage } from "./pages/admin/DeliveriesAdminPage";
import { DeliveryPersonsAdminPage } from "./pages/admin/DeliveryPersonsAdminPage";
import { PaymentsAdminPage } from "./pages/admin/PaymentsAdminPage";
import { ReportsAdminPage } from "./pages/admin/ReportsAdminPage";
import { SettingsAdminPage } from "./pages/admin/SettingsAdminPage";

import { DeliveryLoginPage } from "./pages/delivery/DeliveryLoginPage";
import { TodayDeliveriesPage } from "./pages/delivery/TodayDeliveriesPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function CustomerApp() {
  return (
    <AuthProvider role="customer">
      <CartProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute redirectTo="/login" />}>
            <Route element={<CustomerLayout />}>
              <Route index element={<HomePage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />
              <Route path="subscriptions" element={<SubscriptionsPage />} />
              <Route path="subscriptions/new" element={<NewSubscriptionPage />} />
              <Route path="subscriptions/:id" element={<SubscriptionDetailPage />} />
              <Route path="bills" element={<BillsPage />} />
              <Route path="bills/:id" element={<BillDetailPage />} />
              <Route path="addresses" element={<AddressesPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}

function AdminApp() {
  return (
    <AuthProvider role="admin">
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route element={<ProtectedRoute redirectTo="/admin/login" />}>
          <Route element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="orders" element={<OrdersAdminPage />} />
            <Route path="subscriptions" element={<SubscriptionsAdminPage />} />
            <Route path="products" element={<ProductsAdminPage />} />
            <Route path="deliveries" element={<DeliveriesAdminPage />} />
            <Route path="delivery-persons" element={<DeliveryPersonsAdminPage />} />
            <Route path="payments" element={<PaymentsAdminPage />} />
            <Route path="reports" element={<ReportsAdminPage />} />
            <Route path="settings" element={<SettingsAdminPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AuthProvider>
  );
}

function DeliveryApp() {
  return (
    <AuthProvider role="delivery">
      <Routes>
        <Route path="login" element={<DeliveryLoginPage />} />
        <Route element={<ProtectedRoute redirectTo="/delivery/login" />}>
          <Route index element={<TodayDeliveriesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/delivery" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/delivery/*" element={<DeliveryApp />} />
          <Route path="/*" element={<CustomerApp />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
