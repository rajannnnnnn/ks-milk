import { useState } from "react";
import { useAdminPayments } from "../../lib/adminHooks";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDate, formatMoney } from "../../lib/format";
import { FullPageSpinner } from "../../components/ui/Spinner";

const STATUSES = ["", "PENDING", "PAID", "FAILED", "OVERDUE"];

export function PaymentsAdminPage() {
  const [status, setStatus] = useState("");
  const { data: payments, isLoading } = useAdminPayments({ status: status || undefined });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink-900">Payments</h1>

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
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {payments?.map((p: any) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{p.customer?.user?.name}</p>
                    <p className="text-xs text-ink-400">{p.customer?.user?.mobile}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{p.target}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{formatMoney(p.amount)}</td>
                  <td className="px-4 py-3 text-ink-600">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!payments?.length && <p className="px-4 py-8 text-center text-sm text-ink-400">No payments found.</p>}
        </div>
      )}
    </div>
  );
}
