import { useState } from "react";
import { Plus, Milk } from "lucide-react";
import { useAdminProducts, useCreateProduct, useUpdateProduct } from "../../lib/adminHooks";
import { Spinner, FullPageSpinner } from "../../components/ui/Spinner";

export function ProductsAdminPage() {
  const { data: products, isLoading } = useAdminProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "", price: "", description: "", subscriptionAvailable: true });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createProduct.mutateAsync({
      name: form.name,
      unit: form.unit,
      price: Number(form.price),
      description: form.description || undefined,
      subscriptionAvailable: form.subscriptionAvailable,
    });
    setForm({ name: "", unit: "", price: "", description: "", subscriptionAvailable: true });
    setShowForm(false);
  }

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Products</h1>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
          <Plus size={16} /> Add product
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card grid grid-cols-2 gap-3 p-5">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <input className="input" placeholder="Unit (e.g. 1 L)" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} required />
          <input className="input" type="number" step="0.01" placeholder="Price" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={form.subscriptionAvailable}
              onChange={(e) => setForm((f) => ({ ...f, subscriptionAvailable: e.target.checked }))}
            />
            Available for subscription
          </label>
          <input
            className="input col-span-2"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <button type="submit" className="btn-primary col-span-2" disabled={createProduct.isPending}>
            {createProduct.isPending ? <Spinner className="h-4 w-4" /> : "Save product"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {products?.map((p: any) => (
          <div key={p.id} className="card p-4">
            <div className="mb-2 flex h-16 items-center justify-center rounded-xl bg-cream-100">
              <Milk className="text-moss-400" />
            </div>
            <p className="text-sm font-semibold text-ink-900">{p.name}</p>
            <p className="text-xs text-ink-400">{p.unit}</p>
            <div className="mt-2 flex items-center justify-between">
              <input
                type="number"
                step="0.01"
                defaultValue={p.price}
                className="w-20 rounded-lg border border-ink-100 px-2 py-1 text-sm"
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  if (value && value !== Number(p.price)) updateProduct.mutate({ id: p.id, price: value });
                }}
              />
              <button
                onClick={() => updateProduct.mutate({ id: p.id, status: "INACTIVE" })}
                className="text-xs font-semibold text-clay-600 hover:underline"
              >
                Deactivate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
