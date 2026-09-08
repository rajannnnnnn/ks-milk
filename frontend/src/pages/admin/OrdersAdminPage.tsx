import { useState } from "react";
import { useAdminOrders, useAssignOrder, useAdminDeliveryPersons, useAdminCancelOrder } from "../../lib/adminHooks";
import { formatDate, formatMoney } from "../../lib/format";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FullPageSpinner } from "../../components/ui/Spinner";

const STATUSES = ["", "PLACED", "CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "FAILED"];

export function OrdersAdminPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data: orders, isLoading } = useAdminOrders({ status: status || undefined, search: search || undefined });
  const { data: deliveryPersons } = useAdminDeliveryPersons();
  const assignOrder = useAssignOrder();
  const cancelOrder = useAdminCancelOrder();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Orders</h1>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search name, mobile, order id"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="overflow-x-auto rounded-xl2 border border-ink-100/60 bg-white shadow-soft">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assign</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {orders?.map((o: any) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{o.customer?.user?.name}</p>
                    <p className="text-xs text-ink-400">{o.customer?.user?.mobile}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{o.items.map((i: any) => i.productName).join(", ")}</td>
                  <td className="px-4 py-3 text-ink-600">{formatDate(o.scheduledDeliveryDate)}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{formatMoney(o.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-ink-100 px-2 py-1.5 text-xs"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) assignOrder.mutate({ orderId: o.id, deliveryPersonId: e.target.value });
                      }}
                    >
                      <option value="" disabled>
                        Assign...
                      </option>
                      {deliveryPersons?.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.user.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {["PLACED", "CONFIRMED"].includes(o.status) && (
                      <button
                        onClick={() => cancelOrder.mutate({ id: o.id })}
                        className="text-xs font-semibold text-clay-600 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders?.length && <p className="px-4 py-8 text-center text-sm text-ink-400">No orders found.</p>}
        </div>
      )}
    </div>
  );
}
