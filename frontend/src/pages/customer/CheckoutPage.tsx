import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, CheckCircle2 } from "lucide-react";
import { useAddresses, useCreateOrder } from "../../lib/hooks";
import { useCart } from "../../lib/cart";
import { formatMoney } from "../../lib/format";
import { extractErrorMessage } from "../../lib/api";
import { FullPageSpinner, Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

export function CheckoutPage() {
  const { data: addresses, isLoading } = useAddresses();
  const { lines, subtotal, clear } = useCart();
  const createOrder = useCreateOrder();
  const navigate = useNavigate();
  const [addressId, setAddressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAddressId = addressId ?? addresses?.find((a) => a.isDefault)?.id ?? addresses?.[0]?.id;

  if (isLoading) return <FullPageSpinner />;

  if (!addresses?.length) {
    return (
      <EmptyState
        icon={<MapPin size={32} />}
        title="Add a delivery address first"
        description="We need an address to check if we deliver to you."
        action={
          <button onClick={() => navigate("/addresses")} className="btn-primary mt-2">
            Add address
          </button>
        }
      />
    );
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId) return;
    setError(null);
    try {
      const order = await createOrder.mutateAsync({
        addressId: selectedAddressId,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      clear();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not place your order."));
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-ink-900">Checkout</h1>

      <div>
        <p className="label mb-2">Deliver to</p>
        <div className="space-y-2">
          {addresses.map((a) => (
            <label
              key={a.id}
              className={`card flex cursor-pointer items-start gap-3 p-4 ${
                selectedAddressId === a.id ? "border-moss-400 ring-2 ring-moss-200" : ""
              }`}
            >
              <input
                type="radio"
                name="address"
                className="mt-1"
                checked={selectedAddressId === a.id}
                onChange={() => setAddressId(a.id)}
              />
              <div>
                <p className="text-sm font-semibold text-ink-900">{a.name} · {a.mobile}</p>
                <p className="text-xs text-ink-400">
                  {a.houseNo}, {a.street}, {a.area}, {a.city} {a.pincode}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="label mb-2">Order summary</p>
        <div className="card divide-y divide-ink-100 p-4">
          {lines.map((l) => (
            <div key={l.productId} className="flex justify-between py-2 text-sm">
              <span className="text-ink-600">
                {l.name} × {l.quantity}
              </span>
              <span className="font-medium text-ink-900">{formatMoney(l.price * l.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 text-sm font-semibold text-ink-900">
            <span>Total</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button onClick={handlePlaceOrder} className="btn-primary w-full" disabled={createOrder.isPending}>
        {createOrder.isPending ? <Spinner className="h-4 w-4" /> : <CheckCircle2 size={16} />}
        Place order
      </button>
    </div>
  );
}
