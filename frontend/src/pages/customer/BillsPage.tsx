import { Link } from "react-router-dom";
import { Receipt } from "lucide-react";
import { useBills } from "../../lib/hooks";
import { formatDate, formatMoney } from "../../lib/format";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { FullPageSpinner } from "../../components/ui/Spinner";

export function BillsPage() {
  const { data: bills, isLoading } = useBills();

  if (isLoading) return <FullPageSpinner />;

  if (!bills?.length) {
    return <EmptyState icon={<Receipt size={32} />} title="No bills yet" description="Subscription bills appear here at the end of each billing period." />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink-900">Bills</h1>
      <div className="space-y-2">
        {bills.map((b) => (
          <Link key={b.id} to={`/bills/${b.id}`} className="card flex items-center justify-between p-4 hover:shadow-lift">
            <div>
              <p className="text-sm font-semibold text-ink-900">{b.subscription?.product?.name ?? "Subscription"}</p>
              <p className="text-xs text-ink-400">
                {formatDate(b.billingPeriodStart)} – {formatDate(b.billingPeriodEnd)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-ink-900">{formatMoney(b.totalAmount)}</p>
              <StatusBadge status={b.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
