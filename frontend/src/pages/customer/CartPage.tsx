import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "../../lib/cart";
import { formatMoney } from "../../lib/format";
import { EmptyState } from "../../components/ui/EmptyState";

export function CartPage() {
  const { lines, updateQuantity, removeItem, subtotal } = useCart();
  const navigate = useNavigate();

  if (!lines.length) {
    return (
      <EmptyState
        icon={<ShoppingBag size={32} />}
        title="Your cart is empty"
        description="Add some fresh dairy to get started."
        action={
          <Link to="/products" className="btn-primary mt-2">
            Browse products
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-ink-900">Your cart</h1>

      <div className="space-y-2">
        {lines.map((line) => (
          <div key={line.productId} className="card flex items-center gap-3 p-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink-900">{line.name}</p>
              <p className="text-xs text-ink-400">
                {line.unit} · {formatMoney(line.price)}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-cream-100 px-2 py-1.5">
              <button
                onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink-800 shadow-sm"
                aria-label="Decrease quantity"
              >
                <Minus size={13} />
              </button>
              <span className="w-4 text-center text-sm font-semibold">{line.quantity}</span>
              <button
                onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink-800 shadow-sm"
                aria-label="Increase quantity"
              >
                <Plus size={13} />
              </button>
            </div>
            <button onClick={() => removeItem(line.productId)} className="text-ink-400 hover:text-clay-600" aria-label="Remove">
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>

      <div className="card space-y-2 p-4">
        <div className="flex justify-between text-sm text-ink-600">
          <span>Subtotal</span>
          <span className="font-semibold text-ink-900">{formatMoney(subtotal)}</span>
        </div>
        <p className="text-xs text-ink-400">Delivery charges, if any, are calculated at checkout.</p>
      </div>

      <button onClick={() => navigate("/checkout")} className="btn-primary w-full">
        Proceed to checkout
      </button>
    </div>
  );
}
