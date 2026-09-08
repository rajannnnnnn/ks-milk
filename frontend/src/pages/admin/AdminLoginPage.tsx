import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../lib/auth";
import { extractErrorMessage } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";

export function AdminLoginPage() {
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
      navigate("/admin");
    } catch (err) {
      setError(extractErrorMessage(err, "Invalid credentials."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
      <div className="w-full max-w-sm rounded-xl2 bg-ink-900 p-8 shadow-lift">
        <Logo className="[&>span]:text-cream-50" />
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-400">Admin console</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-400">Mobile</label>
            <input
              className="w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-cream-50 outline-none focus:border-moss-400"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-400">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-cream-50 outline-none focus:border-moss-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
