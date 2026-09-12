// Thin wrapper around MSG91's OTP Provider widget (loaded via the <script>
// tag in index.html). The widget itself talks to MSG91 and runs the real
// SMS OTP challenge in the browser; we only read back its result. The
// backend independently re-verifies the resulting access-token with MSG91
// before trusting it for anything (see backend/src/domain/msg91Widget.ts).

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

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  if (!MSG91_CONFIGURED || typeof window.initSendOTP !== "function") return;
  window.initSendOTP({
    widgetId: MSG91_WIDGET_ID,
    tokenAuth: MSG91_TOKEN_AUTH,
    exposeMethods: true,
    success: () => {},
    failure: () => {},
  });
  initialized = true;
}

export function sendMobileOtp(mobile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ensureInitialized();
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
