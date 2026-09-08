import { useState } from "react";
import { useParams } from "react-router-dom";
import { useSubscription, useSkipDelivery, usePauseSubscription, useCancelSubscription } from "../../lib/hooks";
import { formatDate } from "../../lib/format";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FullPageSpinner, Spinner } from "../../components/ui/Spinner";
import { extractErrorMessage } from "../../lib/api";

export function SubscriptionDetailPage() {
  const { id } = useParams();
  const { data: subscription, isLoading } = useSubscription(id);
  const skipDelivery = useSkipDelivery(id!);
  const pauseSubscription = usePauseSubscription(id!);
  const cancelSubscription = useCancelSubscription();

  const [pauseRange, setPauseRange] = useState({ startDate: "", endDate: "" });
  const [showPauseForm, setShowPauseForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !subscription) return <FullPageSpinner />;

  const upcoming = subscription.deliveries
    .filter((d) => new Date(d.scheduledDate) >= new Date(new Date().toDateString()))
    .slice(0, 14);

  async function handleSkip(scheduledDate: string) {
    setError(null);
    try {
      await skipDelivery.mutateAsync(scheduledDate);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not skip this delivery — the deadline may have passed."));
    }
  }

  async function handlePause(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await pauseSubscription.mutateAsync(pauseRange);
      setShowPauseForm(false);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not pause the subscription."));
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this subscription? This takes effect immediately.")) return;
    setError(null);
    try {
      await cancelSubscription.mutateAsync(subscription!.id);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not cancel the subscription."));
    }
  }

  const isActive = subscription.status === "ACTIVE";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">{subscription.product?.name}</h1>
        <StatusBadge status={subscription.status} />
      </div>

      <div className="card grid grid-cols-2 gap-3 p-4 text-sm">
        <div>
          <p className="text-xs text-ink-400">Plan</p>
          <p className="font-medium text-ink-900">{subscription.plan}</p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Quantity</p>
          <p className="font-medium text-ink-900">{subscription.quantity}</p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Start</p>
          <p className="font-medium text-ink-900">{formatDate(subscription.startDate)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-400">End</p>
          <p className="font-medium text-ink-900">{formatDate(subscription.endDate)}</p>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {isActive && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowPauseForm((s) => !s)} className="btn-outline text-sm">
            Pause dates
          </button>
          <button onClick={handleCancel} className="btn-danger text-sm" disabled={cancelSubscription.isPending}>
            {cancelSubscription.isPending ? <Spinner className="h-4 w-4" /> : "Cancel subscription"}
          </button>
        </div>
      )}

      {showPauseForm && (
        <form onSubmit={handlePause} className="card space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">From</label>
              <input
                type="date"
                className="input"
                required
                value={pauseRange.startDate}
                onChange={(e) => setPauseRange((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">To</label>
              <input
                type="date"
                className="input"
                required
                value={pauseRange.endDate}
                onChange={(e) => setPauseRange((p) => ({ ...p, endDate: e.target.value }))}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={pauseSubscription.isPending}>
            {pauseSubscription.isPending ? <Spinner className="h-4 w-4" /> : "Confirm pause"}
          </button>
        </form>
      )}

      <div>
        <p className="label mb-2">Upcoming deliveries</p>
        {!upcoming.length ? (
          <p className="rounded-xl border border-dashed border-ink-100 px-4 py-6 text-center text-sm text-ink-400">
            No upcoming deliveries scheduled yet.
          </p>
        ) : (
          <div className="divide-y divide-ink-100 rounded-xl2 border border-ink-100/60 bg-white">
            {upcoming.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{formatDate(d.scheduledDate)}</p>
                  {d.reason && <p className="text-xs text-ink-400">{d.reason}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={d.status} />
                  {isActive && d.status === "SCHEDULED" && (
                    <button
                      onClick={() => handleSkip(d.scheduledDate)}
                      className="text-xs font-semibold text-clay-600 hover:underline"
                      disabled={skipDelivery.isPending}
                    >
                      Skip
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
