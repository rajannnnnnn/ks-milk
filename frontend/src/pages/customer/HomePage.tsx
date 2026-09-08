import { Link } from "react-router-dom";
import { Milk, Repeat, Receipt, ArrowRight, PackageCheck } from "lucide-react";
import { useOrders, useSubscriptions, useBills } from "../../lib/hooks";
import { formatMoney, formatDate } from "../../lib/format";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../lib/auth";
import { FullPageSpinner } from "../../components/ui/Spinner";

export function HomePage() {
  const { user } = useAuth();
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: subscriptions, isLoading: subsLoading } = useSubscriptions();
  const { data: bills, isLoading: billsLoading } = useBills();

  if (ordersLoading || subsLoading || billsLoading) return <FullPageSpinner />;

  const activeSubscription = subscriptions?.find((s) => s.status === "ACTIVE");
  const upcomingOrder = orders
    ?.filter((o) => ["PLACED", "CONFIRMED", "OUT_FOR_DELIVERY"].includes(o.status))
    .sort((a, b) => new Date(a.scheduledDeliveryDate).getTime() - new Date(b.scheduledDeliveryDate).getTime())[0];
  const pendingBill = bills?.find((b) => b.status === "PENDING" || b.status === "OVERDUE");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-ink-400">Good to see you,</p>
        <h1 className="text-2xl font-semibold text-ink-900">{user?.name?.split(" ")[0] ?? "there"} 👋</h1>
      </div>

      <div className="overflow-hidden rounded-xl2 bg-gradient-to-br from-moss-700 to-moss-900 p-6 text-cream-50 shadow-lift">
        {upcomingOrder ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-moss-200">Next delivery</p>
            <p className="mt-1 text-lg font-semibold">
              {upcomingOrder.items.map((i) => i.productName).join(", ")}
            </p>
            <p className="mt-1 text-sm text-moss-100">
              {formatDate(upcomingOrder.scheduledDeliveryDate)} · {upcomingOrder.deliveryWindowStart}–
              {upcomingOrder.deliveryWindowEnd}
            </p>
            <div className="mt-4">
              <StatusBadge status={upcomingOrder.status} />
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-moss-200">Nothing scheduled</p>
            <p className="mt-1 text-lg font-semibold">No upcoming deliveries yet</p>
            <Link to="/products" className="btn-secondary mt-4 !bg-cream-50">
              Order milk now <ArrowRight size={16} />
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link to="/products" className="card flex flex-col items-center gap-2 p-4 text-center hover:shadow-lift">
          <Milk className="text-moss-600" />
          <span className="text-xs font-semibold text-ink-800">Shop</span>
        </Link>
        <Link to="/subscriptions" className="card flex flex-col items-center gap-2 p-4 text-center hover:shadow-lift">
          <Repeat className="text-moss-600" />
          <span className="text-xs font-semibold text-ink-800">Subscribe</span>
        </Link>
        <Link to="/bills" className="card flex flex-col items-center gap-2 p-4 text-center hover:shadow-lift">
          <Receipt className="text-moss-600" />
          <span className="text-xs font-semibold text-ink-800">Bills</span>
        </Link>
      </div>

      {activeSubscription && (
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-ink-900">Active subscription</p>
            <StatusBadge status={activeSubscription.status} />
          </div>
          <p className="mt-1 text-sm text-ink-400">
            {activeSubscription.product?.name} · {activeSubscription.quantity}x · {activeSubscription.plan.toLowerCase()}
          </p>
          <Link to={`/subscriptions/${activeSubscription.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-moss-700 hover:underline">
            Manage subscription <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {pendingBill && (
        <div className="card flex items-center justify-between p-5">
          <div>
            <p className="font-semibold text-ink-900">Payment due</p>
            <p className="text-sm text-ink-400">
              {formatDate(pendingBill.billingPeriodStart)} – {formatDate(pendingBill.billingPeriodEnd)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-clay-700">{formatMoney(pendingBill.totalAmount)}</p>
            <Link to={`/bills/${pendingBill.id}`} className="text-sm font-semibold text-moss-700 hover:underline">
              Pay now
            </Link>
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold text-ink-900">Recent orders</p>
          <Link to="/orders" className="text-sm font-semibold text-moss-700 hover:underline">
            View all
          </Link>
        </div>
        {!orders?.length ? (
          <p className="rounded-xl border border-dashed border-ink-100 px-4 py-6 text-center text-sm text-ink-400">
            You haven't placed any orders yet.
          </p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 3).map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="card flex items-center justify-between p-4 hover:shadow-lift">
                <div className="flex items-center gap-3">
                  <PackageCheck className="text-moss-500" size={18} />
                  <div>
                    <p className="text-sm font-medium text-ink-900">{o.items.map((i) => i.productName).join(", ")}</p>
                    <p className="text-xs text-ink-400">{formatDate(o.scheduledDeliveryDate)}</p>
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
