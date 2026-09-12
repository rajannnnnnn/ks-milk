// Thin wrapper around MSG91's OTP Provider widget. The widget itself talks
// to MSG91 and runs the real SMS OTP challenge in the browser; we only read
// back its result. The backend independently re-verifies the resulting
// access-token with MSG91 before trusting it for anything (see
// backend/src/domain/msg91Widget.ts).
//
// Script loading (including the two-host fallback) mirrors MSG91's own
// widget integration snippet exactly, as pulled from the widget's dashboard.
const WIDGET_SCRIPT_URLS = ["https://verify.msg91.com/otp-provider.js", "https://verify.phone91.com/otp-provider.js"];

interface Msg91SuccessResult {
  type?: string;
  message: string;
}

interface Msg91Configuration {
  widgetId: string;
  tokenAuth: string;
  exposeMethods: true;
  success: (data: Msg91SuccessResult) => void;
  failure: (error: unknown) => void;
}

declare global {
  interface Window {
    initSendOTP?: (config: Msg91Configuration) => void;
    sendOtp?: (
      identifier: string,
      success: (data: Msg91SuccessResult) => void,
      failure: (error: unknown) => void,
    ) => void;
    verifyOtp?: (
      otp: string,
      success: (data: Msg91SuccessResult) => void,
      failure: (error: unknown) => void,
    ) => void;
    retryOtp?: (
      channel: string | undefined,
      success: (data: Msg91SuccessResult) => void,
      failure: (error: unknown) => void,
    ) => void;
  }
}

export const MSG91_WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID ?? "";
export const MSG91_TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH ?? "";
export const MSG91_CONFIGURED = Boolean(MSG91_WIDGET_ID && MSG91_TOKEN_AUTH);

let loadPromise: Promise<void> | null = null;

// MSG91's widget doesn't expose window.sendOtp/verifyOtp/retryOtp
// synchronously when initSendOTP() returns -- it wires them up shortly
// after, internally. Poll briefly rather than assuming they exist the
// instant the script's onload fires.
function waitForExposedMethods(timeoutMs = 5000, intervalMs = 100): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function poll() {
      if (typeof window.sendOtp === "function") {
        resolve();
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        reject(new Error("OTP widget did not finish initializing. Please refresh and try again."));
        return;
      }
      setTimeout(poll, intervalMs);
    })();
  });
}

function loadWidgetScript(urls: string[]): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    let i = 0;
    function attempt() {
      const script = document.createElement("script");
      script.src = urls[i];
      script.async = true;
      script.onload = () => {
        if (typeof window.initSendOTP !== "function") {
          reject(new Error("OTP widget script loaded but did not register."));
          return;
        }
        window.initSendOTP({
          widgetId: MSG91_WIDGET_ID,
          tokenAuth: MSG91_TOKEN_AUTH,
          exposeMethods: true,
          success: () => {},
          failure: () => {},
        });
        waitForExposedMethods().then(resolve, reject);
      };
      script.onerror = () => {
        i++;
        if (i < urls.length) {
          attempt();
        } else {
          reject(new Error("Could not load the OTP widget."));
        }
      };
      document.head.appendChild(script);
    }
    attempt();
  });
  return loadPromise;
}

// Best-effort warm-up so the widget is likely already loaded by the time the
// user clicks "Send OTP" -- call this on mount of the registration page.
// Errors are swallowed here; sendMobileOtp will surface them for real if the
// script still isn't ready when actually needed.
export function preloadWidget(): void {
  if (!MSG91_CONFIGURED) return;
  loadWidgetScript(WIDGET_SCRIPT_URLS).catch(() => {});
}

export async function sendMobileOtp(mobile: string): Promise<void> {
  if (!MSG91_CONFIGURED) {
    throw new Error("OTP service is not configured on this deployment.");
  }
  await loadWidgetScript(WIDGET_SCRIPT_URLS);
  return new Promise((resolve, reject) => {
    if (typeof window.sendOtp !== "function") {
      reject(new Error("OTP service is unavailable right now. Please try again shortly."));
      return;
    }
    // MSG91 expects the full identifier; 91 (India) prefix + 10-digit mobile.
    window.sendOtp(
      `91${mobile}`,
      () => resolve(),
      (err) => reject(err instanceof Error ? err : new Error("Could not send OTP. Please try again.")),
    );
  });
}

export function verifyMobileOtp(otp: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window.verifyOtp !== "function") {
      reject(new Error("OTP service is unavailable right now. Please try again shortly."));
      return;
    }
    window.verifyOtp(
      otp,
      (data) => resolve(data.message),
      (err) => reject(err instanceof Error ? err : new Error("Incorrect OTP. Please try again.")),
    );
  });
}

export function resendMobileOtp(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.retryOtp !== "function") {
      reject(new Error("OTP service is unavailable right now. Please try again shortly."));
      return;
    }
    window.retryOtp(
      "text",
      () => resolve(),
      (err) => reject(err instanceof Error ? err : new Error("Could not resend OTP. Please try again.")),
    );
  });
}
