import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProducts, useAddresses, useCreateSubscription } from "../../lib/hooks";
import { formatMoney } from "../../lib/format";
import { extractErrorMessage } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";

const PLANS = [
  { value: "MONTHLY", label: "Monthly", hint: "1 month" },
  { value: "QUARTERLY", label: "Quarterly", hint: "3 months" },
  { value: "YEARLY", label: "Yearly", hint: "12 months" },
] as const;

export function NewSubscriptionPage() {
  const [params] = useSearchParams();
  const { data: products } = useProducts();
  const { data: addresses } = useAddresses();
  const createSubscription = useCreateSubscription();
  const navigate = useNavigate();

  const subscribable = products?.filter((p) => p.subscriptionAvailable) ?? [];
  const [productId, setProductId] = useState(params.get("productId") ?? "");
  const [addressId, setAddressId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [plan, setPlan] = useState<(typeof PLANS)[number]["value"]>("MONTHLY");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const effectiveProductId = productId || subscribable[0]?.id;
  const effectiveAddressId = addressId || addresses?.find((a) => a.isDefault)?.id || addresses?.[0]?.id;
  const selectedProduct = subscribable.find((p) => p.id === effectiveProductId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!effectiveProductId || !effectiveAddressId) {
      setError("Please select a product and delivery address.");
      return;
    }
    try {
      const sub = await createSubscription.mutateAsync({
        productId: effectiveProductId,
        addressId: effectiveAddressId,
        quantity,
        plan,
        startDate,
      });
      navigate(`/subscriptions/${sub.id}`);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not create the subscription."));
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-ink-900">New subscription</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Product</label>
          <div className="grid grid-cols-2 gap-2">
            {subscribable.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setProductId(p.id)}
                className={`card p-3 text-left text-sm ${effectiveProductId === p.id ? "border-moss-400 ring-2 ring-moss-200" : ""}`}
              >
                <p className="font-semibold text-ink-900">{p.name}</p>
                <p className="text-xs text-ink-400">
                  {p.unit} · {formatMoney(p.price)}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Quantity ({selectedProduct?.unit})</label>
          <input
            type="number"
            min={1}
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          />
        </div>

        <div>
          <label className="label">Plan</label>
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map((p) => (
              <button
                type="button"
                key={p.value}
                onClick={() => setPlan(p.value)}
                className={`card p-3 text-center text-sm ${plan === p.value ? "border-moss-400 ring-2 ring-moss-200" : ""}`}
              >
                <p className="font-semibold text-ink-900">{p.label}</p>
                <p className="text-xs text-ink-400">{p.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Start date</label>
          <input
            type="date"
            className="input"
            value={startDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Delivery address</label>
          <select className="input" value={effectiveAddressId ?? ""} onChange={(e) => setAddressId(e.target.value)}>
            {addresses?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.area}, {a.city}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={createSubscription.isPending}>
          {createSubscription.isPending ? <Spinner className="h-4 w-4" /> : "Start subscription"}
        </button>
        <p className="text-center text-xs text-ink-400">
          Billed postpaid at the end of each period, based on actual deliveries.
        </p>
      </form>
    </div>
  );
}
