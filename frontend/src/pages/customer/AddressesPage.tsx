import { useState } from "react";
import { LocateFixed, MapPin, Plus } from "lucide-react";
import { useAddresses, useCreateAddress, useCheckRadius } from "../../lib/hooks";
import { extractErrorMessage } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

export function AddressesPage() {
  const { data: addresses, isLoading } = useAddresses();
  const createAddress = useCreateAddress();
  const checkRadius = useCheckRadius();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    houseNo: "",
    street: "",
    area: "",
    city: "",
    pincode: "",
    latitude: "",
    longitude: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [radiusInfo, setRadiusInfo] = useState<{ allowed: boolean; distanceKm: number; radiusKm: number } | null>(null);
  const [locating, setLocating] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function useMyLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        set("latitude", String(latitude));
        set("longitude", String(longitude));
        try {
          const result = await checkRadius.mutateAsync({ latitude, longitude });
          setRadiusInfo(result);
        } catch {
          // non-fatal; server re-validates on submit
        }
        setLocating(false);
      },
      () => setLocating(false),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createAddress.mutateAsync({
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });
      setShowForm(false);
      setForm({ name: "", mobile: "", houseNo: "", street: "", area: "", city: "", pincode: "", latitude: "", longitude: "" });
      setRadiusInfo(null);
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

          <button type="button" onClick={useMyLocation} className="btn-outline w-full" disabled={locating}>
            {locating ? <Spinner className="h-4 w-4" /> : <LocateFixed size={16} />}
            Use my current location
          </button>

          <p className="text-center text-xs text-ink-400">
            Location access needs a secure (https) connection. If the button above doesn't work, enter coordinates manually:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input"
              type="number"
              step="any"
              placeholder="Latitude"
              value={form.latitude}
              onChange={(e) => set("latitude", e.target.value)}
              onBlur={async () => {
                if (form.latitude && form.longitude) {
                  try {
                    setRadiusInfo(await checkRadius.mutateAsync({ latitude: Number(form.latitude), longitude: Number(form.longitude) }));
                  } catch {
                    // non-fatal; server re-validates on submit
                  }
                }
              }}
            />
            <input
              className="input"
              type="number"
              step="any"
              placeholder="Longitude"
              value={form.longitude}
              onChange={(e) => set("longitude", e.target.value)}
              onBlur={async () => {
                if (form.latitude && form.longitude) {
                  try {
                    setRadiusInfo(await checkRadius.mutateAsync({ latitude: Number(form.latitude), longitude: Number(form.longitude) }));
                  } catch {
                    // non-fatal; server re-validates on submit
                  }
                }
              }}
            />
          </div>

          {radiusInfo && (
            <p className={`text-center text-xs ${radiusInfo.allowed ? "text-moss-600" : "text-clay-600"}`}>
              {radiusInfo.allowed
                ? `Within delivery range (${radiusInfo.distanceKm.toFixed(2)} km)`
                : `Sorry, this is ${radiusInfo.distanceKm.toFixed(2)} km away — outside our ${radiusInfo.radiusKm} km delivery area.`}
            </p>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={createAddress.isPending || !form.latitude}>
            {createAddress.isPending ? <Spinner className="h-4 w-4" /> : "Save address"}
          </button>
        </form>
      )}
    </div>
  );
}
