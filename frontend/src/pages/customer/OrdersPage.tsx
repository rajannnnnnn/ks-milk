import { Link } from "react-router-dom";
import { PackageCheck } from "lucide-react";
import { useOrders } from "../../lib/hooks";
import { formatDate, formatMoney } from "../../lib/format";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { FullPageSpinner } from "../../components/ui/Spinner";

export function OrdersPage() {
  const { data: orders, isLoading } = useOrders();

  if (isLoading) return <FullPageSpinner />;

  if (!orders?.length) {
    return <EmptyState icon={<PackageCheck size={32} />} title="No orders yet" description="Your one-time orders will show up here." />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink-900">Your orders</h1>
      <div className="space-y-2">
        {orders.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="card flex items-center justify-between p-4 hover:shadow-lift">
            <div>
              <p className="text-sm font-semibold text-ink-900">{o.items.map((i) => i.productName).join(", ")}</p>
              <p className="text-xs text-ink-400">
                {formatDate(o.scheduledDeliveryDate)} · {formatMoney(o.totalAmount)}
              </p>
            </div>
            <StatusBadge status={o.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
