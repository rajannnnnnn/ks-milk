import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LocateFixed } from "lucide-react";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../lib/auth";
import { extractErrorMessage } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";

export function RegisterPage() {
  const { registerCustomer } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
    houseNo: "",
    street: "",
    area: "",
    city: "",
    pincode: "",
    latitude: "",
    longitude: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function useMyLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", String(pos.coords.latitude));
        set("longitude", String(pos.coords.longitude));
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location. Please allow location access or enter it manually.");
        setLocating(false);
      },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.latitude || !form.longitude) {
      setError("Please share your delivery location so we can check if we deliver there.");
      return;
    }

    setLoading(true);
    try {
      await registerCustomer({
        name: form.name,
        mobile: form.mobile,
        email: form.email || undefined,
        password: form.password,
        address: {
          name: form.name,
          mobile: form.mobile,
          houseNo: form.houseNo,
          street: form.street,
          area: form.area,
          city: form.city,
          pincode: form.pincode,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
        },
      });
      navigate("/");
    } catch (err) {
      setError(extractErrorMessage(err, "Could not create your account."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-cream-50 px-6 py-10">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-semibold text-ink-900">Create your account</h2>
        <p className="mt-1 text-sm text-ink-400">A few details, and we'll check we deliver to you.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Full name</label>
              <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div>
              <label className="label">Mobile</label>
              <input
                className="input"
                type="tel"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Email (optional)</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="card space-y-3 p-4">
            <p className="text-sm font-semibold text-ink-800">Delivery address</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="input col-span-2"
                placeholder="House / building no."
                value={form.houseNo}
                onChange={(e) => set("houseNo", e.target.value)}
                required
              />
              <input
                className="input col-span-2"
                placeholder="Street"
                value={form.street}
                onChange={(e) => set("street", e.target.value)}
                required
              />
              <input className="input" placeholder="Area" value={form.area} onChange={(e) => set("area", e.target.value)} required />
              <input className="input" placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} required />
              <input
                className="input col-span-2"
                placeholder="PIN code"
                value={form.pincode}
                onChange={(e) => set("pincode", e.target.value)}
                required
              />
            </div>

            <button type="button" onClick={useMyLocation} className="btn-outline w-full" disabled={locating}>
              {locating ? <Spinner className="h-4 w-4" /> : <LocateFixed size={16} />}
              Use my current location
            </button>
            {form.latitude && form.longitude && (
              <p className="text-center text-xs text-moss-600">
                Location captured ({Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)})
              </p>
            )}
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-moss-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
