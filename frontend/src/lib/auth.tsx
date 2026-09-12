import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, storeTokens, clearTokens } from "./api";

type Role = "customer" | "admin" | "delivery";

interface AuthUser {
  id: string;
  name: string;
  mobile?: string | null;
  email?: string | null;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  loginWithPassword: (mobile: string, password: string) => Promise<void>;
  registerCustomer: (payload: RegisterPayload) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterPayload {
  name: string;
  mobile: string;
  email?: string;
  password: string;
  mobileVerificationToken: string;
  address: {
    name: string;
    mobile: string;
    houseNo: string;
    street: string;
    area: string;
    city: string;
    pincode: string;
    latitude: number;
    longitude: number;
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ role, children }: { role: Role; children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    const raw = localStorage.getItem(`ksmilk_${role}_auth`);
    if (!raw) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch {
      clearTokens(role);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loginWithPassword(mobile: string, password: string) {
    const res = await api.post("/auth/login", { mobile, password });
    storeTokens(role, res.data.accessToken, res.data.refreshToken);
    setUser(res.data.user);
  }

  async function registerCustomer(payload: RegisterPayload) {
    const res = await api.post("/auth/register/customer", payload);
    storeTokens(role, res.data.accessToken, res.data.refreshToken);
    setUser(res.data.user);
  }

  async function loginWithGoogle(idToken: string) {
    const res = await api.post(`/auth/google/${role === "delivery" ? "customer" : role}`, { idToken });
    storeTokens(role, res.data.accessToken, res.data.refreshToken);
    setUser(res.data.user);
  }

  async function logout() {
    const raw = localStorage.getItem(`ksmilk_${role}_auth`);
    const refreshToken = raw ? JSON.parse(raw).refreshToken : null;
    clearTokens(role);
    setUser(null);
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken });
      } catch {
        // best-effort
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithPassword, registerCustomer, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
