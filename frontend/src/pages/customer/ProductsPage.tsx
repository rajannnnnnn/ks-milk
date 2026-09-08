import { Link } from "react-router-dom";
import { Milk, Plus, Minus, ShoppingCart } from "lucide-react";
import { useProducts } from "../../lib/hooks";
import { formatMoney } from "../../lib/format";
import { useCart } from "../../lib/cart";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

export function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const { lines, addItem, updateQuantity, itemCount, subtotal } = useCart();

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Fresh today</h1>
        {itemCount > 0 && (
          <Link to="/cart" className="btn-primary !px-4 !py-2 text-xs">
            <ShoppingCart size={15} /> {itemCount} · {formatMoney(subtotal)}
          </Link>
        )}
      </div>

      {!products?.length ? (
        <EmptyState icon={<Milk size={32} />} title="No products available" description="Please check back soon." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((p) => {
            const line = lines.find((l) => l.productId === p.id);
            return (
              <div key={p.id} className="card flex flex-col p-3">
                <div className="mb-2 flex aspect-square items-center justify-center rounded-xl bg-cream-100">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    <Milk size={32} className="text-moss-400" />
                  )}
                </div>
                <p className="text-sm font-semibold text-ink-900">{p.name}</p>
                <p className="text-xs text-ink-400">{p.unit}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-moss-700">{formatMoney(p.price)}</p>
                </div>

                {line ? (
                  <div className="mt-2 flex items-center justify-between rounded-full bg-moss-700 px-2 py-1.5">
                    <button
                      onClick={() => updateQuantity(p.id, line.quantity - 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-moss-600 text-cream-50"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-semibold text-cream-50">{line.quantity}</span>
                    <button
                      onClick={() => updateQuantity(p.id, line.quantity + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-moss-600 text-cream-50"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      addItem({ productId: p.id, name: p.name, unit: p.unit, price: Number(p.price), imageUrl: p.imageUrl })
                    }
                    className="btn-primary mt-2 w-full !py-2 text-xs"
                  >
                    Add
                  </button>
                )}

                {p.subscriptionAvailable && (
                  <Link
                    to={`/subscriptions/new?productId=${p.id}`}
                    className="mt-1.5 text-center text-[11px] font-semibold text-moss-600 hover:underline"
                  >
                    Subscribe instead
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
