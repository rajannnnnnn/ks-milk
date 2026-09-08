import { useState } from "react";
import { Plus } from "lucide-react";
import { useAdminDeliveryPersons, useCreateDeliveryPerson } from "../../lib/adminHooks";
import { Spinner, FullPageSpinner } from "../../components/ui/Spinner";
import { extractErrorMessage } from "../../lib/api";

export function DeliveryPersonsAdminPage() {
  const { data: persons, isLoading } = useAdminDeliveryPersons();
  const createPerson = useCreateDeliveryPerson();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createPerson.mutateAsync(form);
      setForm({ name: "", mobile: "", password: "" });
      setShowForm(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Delivery team</h1>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
          <Plus size={16} /> Add delivery person
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card grid grid-cols-3 gap-3 p-5">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <input className="input" placeholder="Mobile" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} required />
          <input
            className="input"
            type="password"
            placeholder="Temporary password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
          {error && <p className="col-span-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn-primary col-span-3" disabled={createPerson.isPending}>
            {createPerson.isPending ? <Spinner className="h-4 w-4" /> : "Create"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {persons?.map((p: any) => (
          <div key={p.id} className="card p-4">
            <p className="text-sm font-semibold text-ink-900">{p.user.name}</p>
            <p className="text-xs text-ink-400">{p.user.mobile}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
