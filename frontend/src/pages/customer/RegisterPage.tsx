import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../lib/auth";
import { extractErrorMessage } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";

// Fallback used when the browser can't provide a real location (e.g. no
// HTTPS, or the user declines the permission prompt) -- keeps signup
// working without asking the customer to think about coordinates at all.
// A real deployment should serve over HTTPS so the actual browser
// geolocation prompt is what runs here.
const FALLBACK_LATITUDE = 12.9716;
const FALLBACK_LONGITUDE = 77.5946;

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
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const coords = useRef({ latitude: FALLBACK_LATITUDE, longitude: FALLBACK_LONGITUDE });

  // Best-effort silent location capture -- no UI, no error shown if it
  // fails, since delivery-radius checking still happens server-side at
  // checkout regardless of what coordinates end up here.
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
          latitude: coords.current.latitude,
          longitude: coords.current.longitude,
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
