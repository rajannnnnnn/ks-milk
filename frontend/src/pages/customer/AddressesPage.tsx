import { useEffect, useRef, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { useAddresses, useCreateAddress } from "../../lib/hooks";
import { extractErrorMessage } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

// Fallback used when the browser can't provide a real location (e.g. no
// HTTPS, or the user declines the permission prompt) -- delivery-radius
// validation still happens server-side regardless of what lands here.
const FALLBACK_LATITUDE = 12.9716;
const FALLBACK_LONGITUDE = 77.5946;

export function AddressesPage() {
  const { data: addresses, isLoading } = useAddresses();
  const createAddress = useCreateAddress();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    houseNo: "",
    street: "",
    area: "",
    city: "",
    pincode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const coords = useRef({ latitude: FALLBACK_LATITUDE, longitude: FALLBACK_LONGITUDE });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        coords.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      },
      () => {
        // Silently keep the fallback.
      },
    );
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createAddress.mutateAsync({
        ...form,
        latitude: coords.current.latitude,
        longitude: coords.current.longitude,
      });
      setShowForm(false);
      setForm({ name: "", mobile: "", houseNo: "", street: "", area: "", city: "", pincode: "" });
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  if (isLoading) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Addresses</h1>
        <button onClick={() => setShowForm((s) => !s)} className="btn-outline !px-3 !py-2 text-sm">
          <Plus size={15} /> Add
        </button>
      </div>

      {!addresses?.length && !showForm && (
        <EmptyState icon={<MapPin size={32} />} title="No saved addresses" description="Add your first delivery address." />
      )}

      <div className="space-y-2">
        {addresses?.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-900">{a.label ?? a.name}</p>
              {a.isDefault && <span className="badge-green">Default</span>}
            </div>
            <p className="mt-1 text-xs text-ink-400">
              {a.houseNo}, {a.street}, {a.area}, {a.city} {a.pincode}
            </p>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            <input className="input" placeholder="Mobile" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} required />
            <input className="input col-span-2" placeholder="House / building" value={form.houseNo} onChange={(e) => set("houseNo", e.target.value)} required />
            <input className="input col-span-2" placeholder="Street" value={form.street} onChange={(e) => set("street", e.target.value)} required />
            <input className="input" placeholder="Area" value={form.area} onChange={(e) => set("area", e.target.value)} required />
            <input className="input" placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} required />
            <input className="input col-span-2" placeholder="PIN code" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} required />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={createAddress.isPending}>
            {createAddress.isPending ? <Spinner className="h-4 w-4" /> : "Save address"}
          </button>
        </form>
      )}
    </div>
  );
}
