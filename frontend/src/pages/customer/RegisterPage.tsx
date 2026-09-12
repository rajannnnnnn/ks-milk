import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../lib/auth";
import { api, extractErrorMessage } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";
import { MSG91_CONFIGURED, preloadWidget, sendMobileOtp, verifyMobileOtp, resendMobileOtp } from "../../lib/msg91Widget";

// Fallback used when the browser can't provide a real location (e.g. no
// HTTPS, or the user declines the permission prompt) -- keeps signup
// working without asking the customer to think about coordinates at all.
// A real deployment should serve over HTTPS so the actual browser
// geolocation prompt is what runs here.
const FALLBACK_LATITUDE = 12.9716;
const FALLBACK_LONGITUDE = 77.5946;

type MobileStep = "enter-mobile" | "enter-otp" | "verified";

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

  const [mobileStep, setMobileStep] = useState<MobileStep>("enter-mobile");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [mobileVerificationToken, setMobileVerificationToken] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    preloadWidget();
  }, []);

  const mobileValid = /^[6-9]\d{9}$/.test(form.mobile);

  async function handleSendOtp() {
    setOtpError(null);
    if (!mobileValid) {
      setOtpError("Enter a valid 10-digit mobile number.");
      return;
    }
    setOtpLoading(true);
    try {
      await sendMobileOtp(form.mobile);
      setMobileStep("enter-otp");
      setResendCooldown(30);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Could not send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleResendOtp() {
    setOtpError(null);
    setOtpLoading(true);
    try {
      await resendMobileOtp();
      setResendCooldown(30);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Could not resend OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setOtpError(null);
    if (otp.trim().length === 0) {
      setOtpError("Enter the OTP sent to your mobile.");
      return;
    }
    setOtpLoading(true);
    try {
      const widgetAccessToken = await verifyMobileOtp(otp.trim());
      const res = await api.post("/auth/otp/verify", { accessToken: widgetAccessToken });
      setMobileVerificationToken(res.data.mobileVerificationToken);
      setMobileStep("verified");
    } catch (err) {
      setOtpError(extractErrorMessage(err, err instanceof Error ? err.message : "Incorrect OTP. Please try again."));
    } finally {
      setOtpLoading(false);
    }
  }

  function handleChangeNumber() {
    setMobileStep("enter-mobile");
    setOtp("");
    setOtpError(null);
    setMobileVerificationToken(null);
  }

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
    if (mobileStep !== "verified" || !mobileVerificationToken) {
      setError("Please verify your mobile number with the OTP first.");
      return;
    }
    setLoading(true);
    try {
      await registerCustomer({
        name: form.name,
        mobile: form.mobile,
        email: form.email || undefined,
        password: form.password,
        mobileVerificationToken,
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
    <div className="relative flex min-h-screen flex-col items-center bg-cream-50 px-6 py-10">
      <div className="absolute right-4 top-4 z-10 flex gap-2 text-xs font-semibold">
        <a href="/admin/login" className="rounded-full bg-white px-3 py-1.5 text-ink-600 shadow-soft hover:bg-cream-100">
          Admin
        </a>
        <a href="/delivery/login" className="rounded-full bg-white px-3 py-1.5 text-ink-600 shadow-soft hover:bg-cream-100">
          Delivery partner
        </a>
      </div>
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-semibold text-ink-900">Create your account</h2>
        <p className="mt-1 text-sm text-ink-400">A few details, and we'll check we deliver to you.</p>

        <div className="card mt-6 space-y-3 p-4">
          <p className="text-sm font-semibold text-ink-800">Verify your mobile number</p>
          {!MSG91_CONFIGURED && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              OTP service isn't configured on this deployment yet, so verification can't run here.
            </p>
          )}

          {mobileStep === "enter-mobile" && (
            <div className="flex gap-2">
              <input
                className="input"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
                disabled={otpLoading}
                required
              />
              <button
                type="button"
                className="btn-primary shrink-0"
                onClick={handleSendOtp}
                disabled={otpLoading || !MSG91_CONFIGURED}
              >
                {otpLoading ? <Spinner className="h-4 w-4" /> : "Send OTP"}
              </button>
            </div>
          )}

          {mobileStep === "enter-otp" && (
            <div className="space-y-2">
              <p className="text-xs text-ink-400">
                Enter the OTP sent by SMS to +91 {form.mobile}.{" "}
                <button type="button" onClick={handleChangeNumber} className="font-semibold text-moss-700 hover:underline">
                  Change number
                </button>
              </p>
              <div className="flex gap-2">
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={otpLoading}
                />
                <button type="button" className="btn-primary shrink-0" onClick={handleVerifyOtp} disabled={otpLoading}>
                  {otpLoading ? <Spinner className="h-4 w-4" /> : "Verify"}
                </button>
              </div>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpLoading || resendCooldown > 0}
                className="text-xs font-semibold text-moss-700 hover:underline disabled:text-ink-300 disabled:no-underline"
              >
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
              </button>
            </div>
          )}

          {mobileStep === "verified" && (
            <p className="flex items-center gap-2 text-sm text-moss-700">
              <span aria-hidden>✓</span> Mobile {form.mobile} verified.{" "}
              <button type="button" onClick={handleChangeNumber} className="font-semibold underline">
                Change
              </button>
            </p>
          )}

          {otpError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{otpError}</p>}
        </div>

        {mobileStep === "verified" && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Full name</label>
                <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
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
              <div>
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
        )}

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
