import { Link } from "react-router-dom";
import { Repeat, Plus } from "lucide-react";
import { useSubscriptions } from "../../lib/hooks";
import { formatDate } from "../../lib/format";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { FullPageSpinner } from "../../components/ui/Spinner";

export function SubscriptionsPage() {
  const { data: subscriptions, isLoading } = useSubscriptions();

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Subscriptions</h1>
        <Link to="/subscriptions/new" className="btn-primary !px-3 !py-2 text-sm">
          <Plus size={15} /> New
        </Link>
      </div>

      {!subscriptions?.length ? (
        <EmptyState
          icon={<Repeat size={32} />}
          title="You don't have an active subscription yet"
          description="Subscribe to daily milk delivery and never run out."
          action={
            <Link to="/subscriptions/new" className="btn-primary mt-2">
              Start a subscription
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {subscriptions.map((s) => (
            <Link key={s.id} to={`/subscriptions/${s.id}`} className="card flex items-center justify-between p-4 hover:shadow-lift">
              <div>
                <p className="text-sm font-semibold text-ink-900">{s.product?.name ?? "Product"}</p>
                <p className="text-xs text-ink-400">
                  {s.quantity}x · {s.plan.toLowerCase()} · {formatDate(s.startDate)} – {formatDate(s.endDate)}
                </p>
              </div>
              <StatusBadge status={s.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
