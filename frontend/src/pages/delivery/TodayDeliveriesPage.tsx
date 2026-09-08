import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Phone, MapPin, Truck, CheckCircle2, XCircle, LogOut } from "lucide-react";
import { api, extractErrorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Logo } from "../../components/ui/Logo";
import { FullPageSpinner, Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { useNavigate } from "react-router-dom";

function useAssignments() {
  return useQuery({
    queryKey: ["delivery", "assignments"],
    queryFn: async () => (await api.get("/delivery/assignments")).data,
    refetchInterval: 30_000,
  });
}

export function TodayDeliveriesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: assignments, isLoading } = useAssignments();
  const qc = useQueryClient();
  const [failingId, setFailingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const outForDelivery = useMutation({
    mutationFn: async (id: string) => (await api.post(`/delivery/assignments/${id}/out-for-delivery`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery", "assignments"] }),
  });
  const delivered = useMutation({
    mutationFn: async (id: string) => (await api.post(`/delivery/assignments/${id}/delivered`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery", "assignments"] }),
  });
  const failed = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      (await api.post(`/delivery/assignments/${id}/failed`, { reason })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery", "assignments"] });
      setFailingId(null);
      setReason("");
    },
  });

  async function submitFailure(id: string) {
    setError(null);
    if (!reason.trim()) {
      setError("A failure reason is required.");
      return;
    }
    try {
      await failed.mutateAsync({ id, reason });
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 pb-10">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3">
        <Logo />
        <button
          onClick={() => {
            void logout();
            navigate("/delivery/login");
          }}
          className="text-ink-400"
          aria-label="Log out"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="px-4 py-4">
        <p className="text-sm text-ink-400">Hi {user?.name?.split(" ")[0]},</p>
        <h1 className="text-xl font-semibold text-ink-900">Today's deliveries</h1>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : !assignments?.length ? (
        <div className="px-4">
          <EmptyState icon={<Truck size={32} />} title="No deliveries assigned" description="Check back later or refresh." />
        </div>
      ) : (
        <div className="space-y-3 px-4">
          {assignments.map((a: any) => {
            const customer = a.order?.customer ?? a.subscriptionDelivery?.subscription?.customer;
            const items = a.order
              ? a.order.items.map((i: any) => `${i.productName} × ${i.quantity}`).join(", ")
              : `${a.subscriptionDelivery?.subscription?.product?.name} × ${a.subscriptionDelivery?.quantity}`;

            return (
              <div key={a.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-ink-900">{customer?.user?.name}</p>
                  <a href={`tel:${customer?.user?.mobile}`} className="flex items-center gap-1 text-sm font-semibold text-moss-700">
                    <Phone size={15} /> Call
                  </a>
                </div>
                <p className="mt-1 flex items-start gap-1 text-sm text-ink-400">
                  <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                  {JSON.stringify(a.order?.addressSnapshot ?? a.subscriptionDelivery?.subscription?.addressSnapshot ?? {})
                    .replace(/[{}"]/g, "")
                    .replace(/,/g, ", ")}
                </p>
                <p className="mt-2 text-sm font-medium text-ink-900">{items}</p>

                {failingId === a.id ? (
                  <div className="mt-3 space-y-2">
                    <input
                      className="input"
                      placeholder="Reason for failed delivery"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => submitFailure(a.id)} className="btn-danger flex-1 !py-2.5 text-sm" disabled={failed.isPending}>
                        {failed.isPending ? <Spinner className="h-4 w-4" /> : "Confirm failed"}
                      </button>
                      <button onClick={() => setFailingId(null)} className="btn-secondary flex-1 !py-2.5 text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    {a.status === "ASSIGNED" && (
                      <button
                        onClick={() => outForDelivery.mutate(a.id)}
                        className="btn-outline flex-1 !py-2.5 text-sm"
                        disabled={outForDelivery.isPending}
                      >
                        <Truck size={15} /> Out for delivery
                      </button>
                    )}
                    {(a.status === "ASSIGNED" || a.status === "OUT_FOR_DELIVERY") && (
                      <>
                        <button
                          onClick={() => delivered.mutate(a.id)}
                          className="btn-primary flex-1 !py-2.5 text-sm"
                          disabled={delivered.isPending}
                        >
                          <CheckCircle2 size={15} /> Delivered
                        </button>
                        <button onClick={() => setFailingId(a.id)} className="btn-danger !px-3 !py-2.5">
                          <XCircle size={15} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
