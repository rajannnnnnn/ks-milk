import { useState } from "react";
import { useAdminDeliveries } from "../../lib/adminHooks";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { formatDate } from "../../lib/format";

const STATUSES = ["", "ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"];

export function DeliveriesAdminPage() {
  const [status, setStatus] = useState("");
  const { data: deliveries, isLoading } = useAdminDeliveries({ status: status || undefined });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink-900">Deliveries</h1>

      <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s || "All statuses"}
          </option>
        ))}
      </select>

      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="overflow-x-auto rounded-xl2 border border-ink-100/60 bg-white shadow-soft">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">Delivery person</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Failure reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {deliveries?.map((d: any) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 text-ink-600">{d.orderId ? "One-time order" : "Subscription"}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {formatDate(d.order?.scheduledDeliveryDate ?? d.subscriptionDelivery?.scheduledDate)}
                  </td>
                  <td className="px-4 py-3 text-ink-600">{d.deliveryPerson?.user?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-600">{d.failureReason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!deliveries?.length && <p className="px-4 py-8 text-center text-sm text-ink-400">No deliveries found.</p>}
        </div>
      )}
    </div>
  );
}
