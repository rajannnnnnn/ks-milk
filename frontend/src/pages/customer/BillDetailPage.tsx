import { useState } from "react";
import { useParams } from "react-router-dom";
import { useBill, usePayBill } from "../../lib/hooks";
import { formatDate, formatMoney } from "../../lib/format";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FullPageSpinner, Spinner } from "../../components/ui/Spinner";
import { extractErrorMessage } from "../../lib/api";

export function BillDetailPage() {
  const { id } = useParams();
  const { data: bill, isLoading } = useBill(id);
  const payBill = usePayBill();
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  if (isLoading || !bill) return <FullPageSpinner />;

  async function handlePay() {
    setError(null);
    setPaying(true);
    try {
      await payBill.mutateAsync(bill!.id);
      // In production this redirects into the payment provider's checkout;
      // the dev adapter has no real checkout, so we just report success here.
      alert("Payment initiated. You'll be redirected to complete it.");
    } catch (err) {
      setError(extractErrorMessage(err, "Could not start payment."));
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Bill details</h1>
        <StatusBadge status={bill.status} />
      </div>

      <div className="card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Billing period</p>
        <p className="mt-1 text-sm font-medium text-ink-900">
          {formatDate(bill.billingPeriodStart)} – {formatDate(bill.billingPeriodEnd)}
        </p>
      </div>

      <div className="card grid grid-cols-2 gap-3 p-4 text-sm">
        <div>
          <p className="text-xs text-ink-400">Billable days</p>
          <p className="font-semibold text-moss-700">{bill.billableDays}</p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Skipped</p>
          <p className="font-medium text-ink-900">{bill.skippedDays}</p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Paused</p>
          <p className="font-medium text-ink-900">{bill.pausedDays}</p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Non-delivery days</p>
          <p className="font-medium text-ink-900">{bill.nonDeliveryDays}</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex justify-between text-sm">
          <span className="text-ink-600">Subtotal</span>
          <span className="font-medium">{formatMoney(bill.subtotal)}</span>
        </div>
        <div className="mt-2 flex justify-between text-base font-semibold text-ink-900">
          <span>Total</span>
          <span>{formatMoney(bill.totalAmount)}</span>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {(bill.status === "PENDING" || bill.status === "OVERDUE") && (
        <button onClick={handlePay} className="btn-primary w-full" disabled={paying}>
          {paying ? <Spinner className="h-4 w-4" /> : `Pay ${formatMoney(bill.totalAmount)}`}
        </button>
      )}
    </div>
  );
}
