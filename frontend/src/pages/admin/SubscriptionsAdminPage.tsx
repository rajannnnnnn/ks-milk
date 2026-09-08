import { useState } from "react";
import { useAdminSubscriptions } from "../../lib/adminHooks";
import { formatDate } from "../../lib/format";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FullPageSpinner } from "../../components/ui/Spinner";

const STATUSES = ["", "ACTIVE", "PAUSED", "CANCELLED", "EXPIRED"];

export function SubscriptionsAdminPage() {
  const [status, setStatus] = useState("");
  const { data: subscriptions, isLoading } = useAdminSubscriptions({ status: status || undefined });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink-900">Subscriptions</h1>

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
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {subscriptions?.map((s: any) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{s.customer?.user?.name}</p>
                    <p className="text-xs text-ink-400">{s.customer?.user?.mobile}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {s.product?.name} × {s.quantity}
                  </td>
                  <td className="px-4 py-3 text-ink-600">{s.plan}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {formatDate(s.startDate)} – {formatDate(s.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!subscriptions?.length && <p className="px-4 py-8 text-center text-sm text-ink-400">No subscriptions found.</p>}
        </div>
      )}
    </div>
  );
}
