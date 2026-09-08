import { useParams } from "react-router-dom";
import { useState } from "react";
import { useOrder, useCancelOrder } from "../../lib/hooks";
import { formatDate, formatMoney } from "../../lib/format";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FullPageSpinner, Spinner } from "../../components/ui/Spinner";
import { extractErrorMessage } from "../../lib/api";

export function OrderDetailPage() {
  const { id } = useParams();
  const { data: order, isLoading } = useOrder(id);
  const cancelOrder = useCancelOrder();
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !order) return <FullPageSpinner />;

  const canCancel = ["PLACED", "CONFIRMED"].includes(order.status);

  async function handleCancel() {
    setError(null);
    try {
      await cancelOrder.mutateAsync({ id: order!.id });
    } catch (err) {
      setError(extractErrorMessage(err, "Could not cancel this order."));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Order details</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Delivery</p>
        <p className="mt-1 text-sm font-medium text-ink-900">
          {formatDate(order.scheduledDeliveryDate)} · {order.deliveryWindowStart}–{order.deliveryWindowEnd}
        </p>
      </div>

      <div className="card divide-y divide-ink-100 p-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between py-2 text-sm">
            <span className="text-ink-600">
              {item.productName} ({item.unit}) × {item.quantity}
            </span>
            <span className="font-medium text-ink-900">{formatMoney(item.lineTotal)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2 text-sm">
          <span className="text-ink-600">Subtotal</span>
          <span>{formatMoney(order.subtotal)}</span>
        </div>
        {Number(order.deliveryCharge) > 0 && (
          <div className="flex justify-between pt-2 text-sm">
            <span className="text-ink-600">Delivery charge</span>
            <span>{formatMoney(order.deliveryCharge)}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 text-sm font-semibold text-ink-900">
          <span>Total</span>
          <span>{formatMoney(order.totalAmount)}</span>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {canCancel && (
        <button onClick={handleCancel} className="btn-danger w-full" disabled={cancelOrder.isPending}>
          {cancelOrder.isPending ? <Spinner className="h-4 w-4" /> : "Cancel order"}
        </button>
      )}
    </div>
  );
}
