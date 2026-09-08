import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../lib/auth";
import { extractErrorMessage } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";

export function DeliveryLoginPage() {
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
      navigate("/delivery");
    } catch (err) {
      setError(extractErrorMessage(err, "Invalid credentials."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-moss-800 px-6">
      <div className="mx-auto w-full max-w-sm">
        <Logo className="mb-8 justify-center [&>span]:text-cream-50" />
        <div className="rounded-xl2 bg-white p-6 shadow-lift">
          <p className="text-lg font-semibold text-ink-900">Delivery partner login</p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <input
              className="input !py-4 text-base"
              placeholder="Mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
            <input
              type="password"
              className="input !py-4 text-base"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" className="btn-primary w-full !py-4 text-base" disabled={loading}>
              {loading ? <Spinner className="h-5 w-5" /> : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
