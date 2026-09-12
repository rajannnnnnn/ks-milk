import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../lib/auth";
import { extractErrorMessage } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";

export function LoginPage() {
  const { loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithPassword(mobile, password);
      navigate("/");
    } catch (err) {
      setError(extractErrorMessage(err, "Invalid mobile number or password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen md:grid-cols-2">
      <div className="absolute right-4 top-4 z-10 flex gap-2 text-xs font-semibold">
        <a href="/admin/login" className="rounded-full bg-white/90 px-3 py-1.5 text-ink-600 shadow-soft hover:bg-white">
          Admin
        </a>
        <a href="/delivery/login" className="rounded-full bg-white/90 px-3 py-1.5 text-ink-600 shadow-soft hover:bg-white">
          Delivery partner
        </a>
      </div>
      <div className="relative hidden overflow-hidden bg-moss-800 md:flex md:flex-col md:justify-between md:p-12">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 60%, white 0, transparent 35%)",
        }} />
        <Logo className="relative [&>span]:text-cream-50" />
        <div className="relative">
          <h1 className="max-w-md text-4xl font-semibold leading-tight text-cream-50">
            Fresh dairy, delivered to your door every morning.
          </h1>
          <p className="mt-4 max-w-sm text-moss-100">
            Milk, curd, paneer and more — order once or subscribe daily. Delivered 6–9 PM, tracked all the way.
          </p>
        </div>
        <p className="relative text-xs text-moss-200">© {new Date().getFullYear()} KS MILK</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 md:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-semibold text-ink-900">Welcome back</h2>
          <p className="mt-1 text-sm text-ink-400">Log in to manage your orders and subscription.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label">Mobile number</label>
              <input
                className="input"
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner className="h-4 w-4" /> : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-400">
            New to KS MILK?{" "}
            <Link to="/register" className="font-semibold text-moss-700 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
