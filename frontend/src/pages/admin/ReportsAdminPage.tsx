import { useState } from "react";
import { useSalesReport, useOrdersReport, useSubscriptionsReport, usePaymentsReport } from "../../lib/adminHooks";
import { formatMoney } from "../../lib/format";

export function ReportsAdminPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params = { from: from || undefined, to: to || undefined };

  const { data: sales } = useSalesReport(params);
  const { data: orders } = useOrdersReport(params);
  const { data: subscriptions } = useSubscriptionsReport(params);
  const { data: payments } = usePaymentsReport(params);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink-900">Reports</h1>

      <div className="flex gap-3">
        <input type="date" className="input max-w-[180px]" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="input max-w-[180px]" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <p className="font-semibold text-ink-900">Sales</p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-ink-400">One-time orders</p>
              <p className="text-lg font-semibold text-moss-700">{formatMoney(sales?.oneTimeOrders?._sum?.totalAmount ?? 0)}</p>
              <p className="text-xs text-ink-400">{sales?.oneTimeOrders?._count ?? 0} orders</p>
            </div>
            <div>
              <p className="text-ink-400">Subscriptions</p>
              <p className="text-lg font-semibold text-moss-700">{formatMoney(sales?.subscriptions?._sum?.totalAmount ?? 0)}</p>
              <p className="text-xs text-ink-400">{sales?.subscriptions?._count ?? 0} bills</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <p className="font-semibold text-ink-900">Orders</p>
          <div className="mt-3 grid grid-cols-4 gap-3 text-center text-sm">
            <div>
              <p className="text-lg font-semibold text-ink-900">{orders?.total ?? 0}</p>
              <p className="text-xs text-ink-400">Total</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-moss-700">{orders?.completed ?? 0}</p>
              <p className="text-xs text-ink-400">Completed</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-clay-700">{orders?.cancelled ?? 0}</p>
              <p className="text-xs text-ink-400">Cancelled</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-red-600">{orders?.failed ?? 0}</p>
              <p className="text-xs text-ink-400">Failed</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <p className="font-semibold text-ink-900">Subscriptions</p>
          <div className="mt-3 grid grid-cols-4 gap-3 text-center text-sm">
            <div>
              <p className="text-lg font-semibold text-moss-700">{subscriptions?.active ?? 0}</p>
              <p className="text-xs text-ink-400">Active</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-ink-900">{subscriptions?.new ?? 0}</p>
              <p className="text-xs text-ink-400">New</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-clay-700">{subscriptions?.cancelled ?? 0}</p>
              <p className="text-xs text-ink-400">Cancelled</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-ink-400">{subscriptions?.expired ?? 0}</p>
              <p className="text-xs text-ink-400">Expired</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <p className="font-semibold text-ink-900">Payments</p>
          <div className="mt-3 grid grid-cols-4 gap-3 text-center text-sm">
            <div>
              <p className="text-lg font-semibold text-moss-700">{payments?.paid ?? 0}</p>
              <p className="text-xs text-ink-400">Paid</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-clay-700">{payments?.pending ?? 0}</p>
              <p className="text-xs text-ink-400">Pending</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-red-600">{payments?.failed ?? 0}</p>
              <p className="text-xs text-ink-400">Failed</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-red-700">{payments?.overdue ?? 0}</p>
              <p className="text-xs text-ink-400">Overdue</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
